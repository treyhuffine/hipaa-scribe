# PRD Amendment: Vault Secret Architecture Update

## Overview

This document amends the original ScribeVault PRD. It replaces the PIN-based zero-knowledge encryption system with a simplified Firestore-based vault secret approach that maintains security without UX friction.

---

## Summary of Changes

| Component                 | Previous Design              | New Design                                          |
| ------------------------- | ---------------------------- | --------------------------------------------------- |
| **Vault secret storage**  | Firebase custom claims (JWT) | Firestore document                                  |
| **Vault secret format**   | 32-character hex             | 64-character alphanumeric (URL-safe Base64 charset) |
| **Unlock mechanism**      | PIN entry                    | Re-authentication (Google or email/password)        |
| **Key derivation**        | PBKDF2(PIN + vault_secret)   | PBKDF2(vault_secret)                                |
| **Lock screen**           | PIN overlay                  | "Unlock" button triggers re-auth                    |
| **Recording during lock** | Problematic                  | Closure captures secret, encryption completes       |

---

## 1. Firestore Setup

### 1.1 Enable Firestore

```bash
# Enable Firestore API
gcloud services enable firestore.googleapis.com --project=scribevault

# Create Firestore database (Native mode)
gcloud firestore databases create --location=us-central1 --project=scribevault
```

Or via Firebase Console:

1. Go to [console.firebase.google.com](https://console.firebase.google.com)
2. Select your project
3. Click **Firestore Database** → **Create database**
4. Select **Production mode**
5. Choose location: `us-central1`

### 1.2 Security Rules

Deploy these security rules to Firestore. The vault secret can only be created once and never modified or deleted:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/vault/secret {
      // Can read if authenticated as this user
      allow read: if request.auth != null && request.auth.uid == userId;

      // Can only create if document doesn't exist yet
      allow create: if request.auth != null
                    && request.auth.uid == userId
                    && !exists(/databases/$(database)/documents/users/$(userId)/vault/secret);

      // Never allow update or delete
      allow update, delete: if false;
    }

    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

### 1.3 Document Structure

```
/users/{uid}/vault/secret
{
  vaultSecret: string,  // 64-character URL-safe Base64 string
  createdAt: timestamp
}
```

---

## 2. Remove Previous Implementation

### 2.1 Files/Functions to Remove

- Remove `/pages/api/auth/init.ts` (custom claims endpoint)
- Remove `PINOverlay.tsx` component
- Remove `PINSetup.tsx` component
- Remove all PIN-related state and logic from `VaultContext.tsx`
- Remove `pinAttemptsRemaining` and brute-force logic
- Remove any references to custom claims for vault_secret

---

## 3. Constants

Update `src/lib/constants.ts`:

```typescript
export const VAULT_SECRET_LENGTH = 64;

export const CRYPTO_CONFIG = {
  PBKDF2_ITERATIONS: 100000,
  KEY_LENGTH: 256,
  IV_LENGTH: 12,
  HASH_ALGORITHM: 'SHA-256',
} as const;

export const SESSION_CONFIG = {
  IDLE_TIMEOUT_MS: 15 * 60 * 1000, // 15 minutes
  MAX_RECORDING_MS: 60 * 60 * 1000, // 60 minutes
  DATA_TTL_MS: 12 * 60 * 60 * 1000, // 12 hours
  JANITOR_INTERVAL_MS: 5 * 60 * 1000, // 5 minutes
} as const;
```

---

## 4. New Implementation

### 4.1 Firestore Client Setup

Create `src/lib/firestore.ts`:

```typescript
import { getFirestore } from 'firebase/firestore';
import { app } from './firebase-client';

export const db = getFirestore(app);
```

### 4.2 Vault Secret Utilities

Create `src/lib/vault.ts`:

```typescript
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firestore';
import { VAULT_SECRET_LENGTH } from './constants';

/**
 * URL-safe Base64 character set (64 characters)
 * This divides evenly into 256, so there's no modulo bias
 * when mapping random bytes to characters
 */
const CHARSET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

/**
 * Generate a cryptographically secure random string
 * Uses 64-character charset for zero modulo bias (256 / 64 = 4)
 */
function generateVaultSecret(): string {
  const randomBytes = new Uint8Array(VAULT_SECRET_LENGTH);
  crypto.getRandomValues(randomBytes);

  let result = '';
  for (let i = 0; i < VAULT_SECRET_LENGTH; i++) {
    result += CHARSET[randomBytes[i] % CHARSET.length];
  }

  return result;
}

/**
 * Fetch the user's vault secret from Firestore
 * Creates one if it doesn't exist (first-time user)
 */
export async function getOrCreateVaultSecret(uid: string): Promise<string> {
  const docRef = doc(db, 'users', uid, 'vault', 'secret');
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    return docSnap.data().vaultSecret;
  }

  // First-time user — generate and store vault secret
  const vaultSecret = generateVaultSecret();
  await setDoc(docRef, {
    vaultSecret,
    createdAt: serverTimestamp(),
  });

  return vaultSecret;
}
```

### 4.3 Crypto Utilities

Update `src/lib/crypto.ts`:

```typescript
import { CRYPTO_CONFIG } from './constants';

/**
 * Derive an AES-256-GCM key from the vault secret
 * Uses PBKDF2 for key stretching
 */
export async function deriveVaultKey(vaultSecret: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(vaultSecret),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: encoder.encode(vaultSecret),
      iterations: CRYPTO_CONFIG.PBKDF2_ITERATIONS,
      hash: CRYPTO_CONFIG.HASH_ALGORITHM,
    },
    keyMaterial,
    { name: 'AES-GCM', length: CRYPTO_CONFIG.KEY_LENGTH },
    false, // Non-extractable
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt data using AES-GCM
 * Returns Base64-encoded IV and ciphertext
 */
export async function encryptData(
  key: CryptoKey,
  plaintext: string
): Promise<{ iv: string; ciphertext: string }> {
  const encoder = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(CRYPTO_CONFIG.IV_LENGTH));

  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(plaintext)
  );

  return {
    iv: btoa(String.fromCharCode(...iv)),
    ciphertext: btoa(String.fromCharCode(...new Uint8Array(ciphertext))),
  };
}

/**
 * Decrypt data using AES-GCM
 * Accepts Base64-encoded IV and ciphertext
 */
export async function decryptData(key: CryptoKey, iv: string, ciphertext: string): Promise<string> {
  const decoder = new TextDecoder();

  const ivBytes = Uint8Array.from(atob(iv), (c) => c.charCodeAt(0));
  const ciphertextBytes = Uint8Array.from(atob(ciphertext), (c) => c.charCodeAt(0));

  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: ivBytes },
    key,
    ciphertextBytes
  );

  return decoder.decode(plaintext);
}
```

### 4.4 Storage Utilities

Update `src/lib/storage.ts`:

```typescript
import { get, set, del } from 'idb-keyval';
import { decryptData } from './crypto';
import { SESSION_CONFIG } from './constants';

export interface EncryptedNote {
  id: string;
  timestamp: number;
  iv: string;
  data: string;
}

export interface DecryptedNote {
  id: string;
  timestamp: number;
  transcript: string;
  soapNote: string;
  duration: number;
  createdAt: number;
}

const NOTES_KEY = 'clinical_notes';

export async function saveEncryptedNote(note: EncryptedNote): Promise<void> {
  const notes = (await get<EncryptedNote[]>(NOTES_KEY)) || [];
  notes.push(note);
  await set(NOTES_KEY, notes);
}

export async function loadAllNotes(key: CryptoKey): Promise<DecryptedNote[]> {
  const encryptedNotes = (await get<EncryptedNote[]>(NOTES_KEY)) || [];

  const decryptedNotes: DecryptedNote[] = [];

  for (const note of encryptedNotes) {
    try {
      const plaintext = await decryptData(key, note.iv, note.data);
      const data = JSON.parse(plaintext);
      decryptedNotes.push({
        id: note.id,
        timestamp: note.timestamp,
        ...data,
      });
    } catch (err) {
      console.error('Failed to decrypt note:', note.id, err);
      // Skip corrupted notes
    }
  }

  return decryptedNotes.sort((a, b) => b.timestamp - a.timestamp);
}

export async function deleteNote(noteId: string): Promise<void> {
  const notes = (await get<EncryptedNote[]>(NOTES_KEY)) || [];
  const filtered = notes.filter((n) => n.id !== noteId);
  await set(NOTES_KEY, filtered);
}

export async function purgeAllData(): Promise<void> {
  await del(NOTES_KEY);
}

export async function runJanitor(): Promise<number> {
  const notes = (await get<EncryptedNote[]>(NOTES_KEY)) || [];
  const now = Date.now();
  const freshNotes = notes.filter((n) => now - n.timestamp < SESSION_CONFIG.DATA_TTL_MS);
  const purgedCount = notes.length - freshNotes.length;

  if (purgedCount > 0) {
    await set(NOTES_KEY, freshNotes);
  }

  return purgedCount;
}
```

### 4.5 Vault Context

Replace `src/context/VaultContext.tsx`:

```typescript
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import { getOrCreateVaultSecret } from '@/lib/vault';
import { deriveVaultKey } from '@/lib/crypto';
import { SESSION_CONFIG } from '@/lib/constants';

interface VaultContextValue {
  // State
  vaultKey: CryptoKey | null;
  vaultSecret: string | null;
  isLocked: boolean;
  isLoading: boolean;

  // Actions
  initializeVault: () => Promise<void>;
  lock: () => void;

  // For recording closure
  getVaultSecretForRecording: () => string | null;

  // Recording state management
  setRecordingInProgress: (inProgress: boolean) => void;
}

const VaultContext = createContext<VaultContextValue | null>(null);

export function VaultProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  const [vaultKey, setVaultKey] = useState<CryptoKey | null>(null);
  const [vaultSecret, setVaultSecret] = useState<string | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const lastActivityRef = useRef<number>(Date.now());
  const recordingInProgressRef = useRef<boolean>(false);

  /**
   * Initialize or re-initialize the vault
   * Called on initial login and after re-authentication from lock screen
   */
  const initializeVault = useCallback(async () => {
    if (!user) {
      setVaultKey(null);
      setVaultSecret(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const secret = await getOrCreateVaultSecret(user.uid);
      const key = await deriveVaultKey(secret);
      setVaultSecret(secret);
      setVaultKey(key);
      setIsLocked(false);
      lastActivityRef.current = Date.now();
    } catch (error) {
      console.error('Failed to initialize vault:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Initialize vault on login
  useEffect(() => {
    initializeVault();
  }, [initializeVault]);

  // Activity tracking
  useEffect(() => {
    const updateActivity = () => {
      lastActivityRef.current = Date.now();
    };

    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    events.forEach((event) => window.addEventListener(event, updateActivity));

    return () => {
      events.forEach((event) => window.removeEventListener(event, updateActivity));
    };
  }, []);

  // Idle timeout check
  useEffect(() => {
    const checkIdle = () => {
      // Never lock during recording
      if (recordingInProgressRef.current) {
        return;
      }

      const idleTime = Date.now() - lastActivityRef.current;
      if (idleTime > SESSION_CONFIG.IDLE_TIMEOUT_MS && vaultKey && !isLocked) {
        lock();
      }
    };

    const interval = setInterval(checkIdle, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, [vaultKey, isLocked]);

  // Lock: clear secrets from memory
  const lock = useCallback(() => {
    setVaultKey(null);
    setVaultSecret(null);
    setIsLocked(true);
  }, []);

  // Provide vault secret for recording closure
  const getVaultSecretForRecording = useCallback(() => {
    return vaultSecret;
  }, [vaultSecret]);

  // Method to set recording state (called by useRecorder hook)
  const setRecordingInProgress = useCallback((inProgress: boolean) => {
    recordingInProgressRef.current = inProgress;
  }, []);

  return (
    <VaultContext.Provider
      value={{
        vaultKey,
        vaultSecret,
        isLocked,
        isLoading,
        initializeVault,
        lock,
        getVaultSecretForRecording,
        setRecordingInProgress,
      }}
    >
      {children}
    </VaultContext.Provider>
  );
}

export function useVault() {
  const context = useContext(VaultContext);
  if (!context) {
    throw new Error('useVault must be used within a VaultProvider');
  }
  return context;
}
```

### 4.6 Recording Hook with Closure

Update `src/hooks/useRecorder.ts`:

```typescript
import { useState, useRef, useCallback, useEffect } from 'react';
import { useVault } from '@/context/VaultContext';
import { deriveVaultKey, encryptData } from '@/lib/crypto';
import { saveEncryptedNote } from '@/lib/storage';
import { useAuth } from '@/context/AuthContext';
import { SESSION_CONFIG } from '@/lib/constants';

export type RecordingStatus = 'idle' | 'recording' | 'processing' | 'complete' | 'error';

export function useRecorder() {
  const { user } = useAuth();
  const { getVaultSecretForRecording, setRecordingInProgress } = useVault();

  const [status, setStatus] = useState<RecordingStatus>('idle');
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const maxTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Captured at recording start — survives screen lock
  const capturedSecretRef = useRef<string | null>(null);
  const capturedUidRef = useRef<string | null>(null);
  const capturedDurationRef = useRef<number>(0);

  const startRecording = useCallback(async () => {
    try {
      // Capture vault secret and uid BEFORE starting
      // These are held in closure even if screen locks mid-recording
      const secret = getVaultSecretForRecording();
      if (!secret || !user) {
        throw new Error('Vault not unlocked');
      }
      capturedSecretRef.current = secret;
      capturedUidRef.current = user.uid;

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      });

      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        // Use captured values — not current state
        const secret = capturedSecretRef.current;
        const uid = capturedUidRef.current;
        const recordedDuration = capturedDurationRef.current;

        if (!secret || !uid) {
          setError('Session expired during recording');
          setStatus('error');
          return;
        }

        try {
          setStatus('processing');

          const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });

          // Call API to transcribe and generate SOAP note
          const formData = new FormData();
          formData.append('audio', audioBlob);

          const response = await fetch('/api/scribe', {
            method: 'POST',
            body: formData,
          });

          if (!response.ok) {
            throw new Error('Transcription failed');
          }

          const { transcript, soapNote } = await response.json();

          // Encrypt using captured secret
          const key = await deriveVaultKey(secret);
          const noteData = JSON.stringify({
            transcript,
            soapNote,
            duration: recordedDuration,
            createdAt: Date.now(),
          });
          const encrypted = await encryptData(key, noteData);

          // Save encrypted note
          await saveEncryptedNote({
            id: crypto.randomUUID(),
            timestamp: Date.now(),
            iv: encrypted.iv,
            data: encrypted.ciphertext,
          });

          setStatus('complete');
        } catch (err) {
          console.error('Processing error:', err);
          setError(err instanceof Error ? err.message : 'Processing failed');
          setStatus('error');
        } finally {
          // Clear captured secrets
          capturedSecretRef.current = null;
          capturedUidRef.current = null;
          capturedDurationRef.current = 0;

          // Stop all tracks
          streamRef.current?.getTracks().forEach((track) => track.stop());
          streamRef.current = null;

          // Update recording state
          setRecordingInProgress(false);
        }
      };

      mediaRecorder.start(1000); // Collect in 1-second chunks
      mediaRecorderRef.current = mediaRecorder;
      setStatus('recording');
      setDuration(0);
      capturedDurationRef.current = 0;
      setError(null);
      setRecordingInProgress(true);

      // Duration counter
      durationIntervalRef.current = setInterval(() => {
        setDuration((d) => {
          const newDuration = d + 1;
          capturedDurationRef.current = newDuration;
          return newDuration;
        });
      }, 1000);

      // Max recording timeout
      maxTimeoutRef.current = setTimeout(() => {
        stopRecording();
      }, SESSION_CONFIG.MAX_RECORDING_MS);
    } catch (err) {
      console.error('Recording error:', err);
      setError(err instanceof Error ? err.message : 'Failed to start recording');
      setStatus('error');
      setRecordingInProgress(false);
    }
  }, [user, getVaultSecretForRecording, setRecordingInProgress]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }

    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }

    if (maxTimeoutRef.current) {
      clearTimeout(maxTimeoutRef.current);
      maxTimeoutRef.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    setStatus('idle');
    setDuration(0);
    setError(null);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (durationIntervalRef.current) clearInterval(durationIntervalRef.current);
      if (maxTimeoutRef.current) clearTimeout(maxTimeoutRef.current);
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  return {
    status,
    duration,
    remainingTime: Math.max(0, SESSION_CONFIG.MAX_RECORDING_MS / 1000 - duration),
    error,
    startRecording,
    stopRecording,
    reset,
  };
}
```

### 4.7 Lock Screen Component

Create `src/components/LockScreen.tsx`:

```typescript
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { useVault } from '@/context/VaultContext';
import { useAuth } from '@/context/AuthContext';
import { Lock } from 'lucide-react';
import { useState } from 'react';
import { useRouter } from 'next/router';

export function LockScreen() {
  const { initializeVault, isLoading } = useVault();
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const handleUnlock = async () => {
    try {
      setError(null);
      // Re-initialize vault with current user
      // User is still authenticated, just need to re-fetch vault secret
      await initializeVault();
    } catch (err) {
      setError('Failed to unlock. Please try signing in again.');
    }
  };

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  return (
    <div className="fixed inset-0 bg-background/95 backdrop-blur-sm flex items-center justify-center z-50">
      <Card className="w-full max-w-md mx-4">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-muted flex items-center justify-center">
            <Lock className="w-6 h-6" />
          </div>
          <CardTitle>Session Locked</CardTitle>
          <CardDescription>
            Your session was locked due to inactivity.
            {user?.email && (
              <span className="block mt-1 text-foreground font-medium">{user.email}</span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && <p className="text-sm text-destructive text-center">{error}</p>}
          <Button onClick={handleUnlock} disabled={isLoading} className="w-full" size="lg">
            {isLoading ? 'Unlocking...' : 'Unlock Session'}
          </Button>
          <Button onClick={handleSignOut} variant="ghost" className="w-full" size="sm">
            Sign in with a different account
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
```

### 4.8 Notes Hook

Create `src/hooks/useNotes.ts`:

```typescript
import { useState, useEffect, useCallback } from 'react';
import { useVault } from '@/context/VaultContext';
import { loadAllNotes, deleteNote as deleteNoteFromStorage, DecryptedNote } from '@/lib/storage';

export function useNotes() {
  const { vaultKey } = useVault();
  const [notes, setNotes] = useState<DecryptedNote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNotes = useCallback(async () => {
    if (!vaultKey) {
      setNotes([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const loadedNotes = await loadAllNotes(vaultKey);
      setNotes(loadedNotes);
    } catch (err) {
      console.error('Failed to load notes:', err);
      setError('Failed to load notes');
    } finally {
      setIsLoading(false);
    }
  }, [vaultKey]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  const deleteNote = useCallback(async (noteId: string) => {
    try {
      await deleteNoteFromStorage(noteId);
      setNotes((prev) => prev.filter((n) => n.id !== noteId));
    } catch (err) {
      console.error('Failed to delete note:', err);
      throw err;
    }
  }, []);

  const refresh = useCallback(() => {
    fetchNotes();
  }, [fetchNotes]);

  return {
    notes,
    isLoading,
    error,
    deleteNote,
    refresh,
  };
}
```

### 4.9 Main Page Integration

Update `src/pages/index.tsx`:

```typescript
import { useAuth } from '@/context/AuthContext';
import { useVault } from '@/context/VaultContext';
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import { LockScreen } from '@/components/LockScreen';
import { Layout } from '@/components/Layout';
import { Recorder } from '@/components/Recorder';
import { NotesList } from '@/components/NotesList';
import { runJanitor } from '@/lib/storage';
import { SESSION_CONFIG } from '@/lib/constants';

export default function Home() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { isLocked, isLoading: vaultLoading, vaultKey } = useVault();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // Run janitor on mount and periodically
  useEffect(() => {
    runJanitor();
    const interval = setInterval(runJanitor, SESSION_CONFIG.JANITOR_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  // Loading state
  if (authLoading || vaultLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  // Not authenticated
  if (!user) {
    return null; // Will redirect
  }

  // Locked state
  if (isLocked || !vaultKey) {
    return <LockScreen />;
  }

  // Normal state
  return (
    <Layout>
      <div className="max-w-2xl mx-auto py-8 px-4 space-y-8">
        <Recorder />
        <NotesList />
      </div>
    </Layout>
  );
}
```

---

## 5. Type Definitions

Update `src/types/index.ts`:

```typescript
export interface EncryptedNote {
  id: string;
  timestamp: number;
  iv: string;
  data: string;
}

export interface DecryptedNote {
  id: string;
  timestamp: number;
  transcript: string;
  soapNote: string;
  duration: number;
  createdAt: number;
}

export type RecordingStatus = 'idle' | 'recording' | 'processing' | 'complete' | 'error';
```

---

## 6. Environment Variables

No changes to environment variables. Firestore uses the same Firebase config already present in `.env.local`.

---

## 7. Security Summary

| Threat                        | Mitigation                                                                |
| ----------------------------- | ------------------------------------------------------------------------- |
| Device stolen, browser closed | vault_secret only exists in Firestore, IndexedDB contains encrypted blobs |
| Device stolen, session locked | Must re-authenticate to fetch vault_secret                                |
| JWT/token inspection          | vault_secret is NOT in the JWT — only in Firestore                        |
| IndexedDB inspection          | Encrypted with AES-256-GCM, useless without key                           |
| Recording interrupted by lock | Closure captures secret at start, encryption completes                    |
| Prolonged session             | 15-minute idle timeout clears memory                                      |
| Old data accumulation         | 12-hour TTL auto-deletes notes                                            |
| Vault secret tampering        | Firestore rules prevent update/delete after creation                      |

---

## 8. Implementation Checklist

- [ ] Enable Firestore in Firebase Console
- [ ] Deploy Firestore security rules
- [ ] Update `src/lib/constants.ts` with `VAULT_SECRET_LENGTH`
- [ ] Create `src/lib/firestore.ts`
- [ ] Create `src/lib/vault.ts`
- [ ] Update `src/lib/crypto.ts`
- [ ] Update `src/lib/storage.ts`
- [ ] Replace `src/context/VaultContext.tsx`
- [ ] Update `src/hooks/useRecorder.ts`
- [ ] Create `src/hooks/useNotes.ts`
- [ ] Create `src/components/LockScreen.tsx`
- [ ] Update `src/pages/index.tsx`
- [ ] Update `src/types/index.ts`
- [ ] Remove PIN-related components (`PINOverlay.tsx`, `PINSetup.tsx`)
- [ ] Remove `/pages/api/auth/init.ts`
- [ ] Test full flow

---

## 9. Testing Scenarios

1. **Fresh user**: Login → vault_secret created in Firestore → can record and save
2. **Returning user**: Login → vault_secret fetched → can decrypt existing notes
3. **Idle timeout**: Wait 15 min → lock screen appears → notes hidden
4. **Unlock**: Click "Unlock Session" → vault_secret fetched → notes visible again
5. **Switch accounts from lock**: Click "Sign in with a different account" → redirects to login
6. **Recording during lock**: Start recording → wait for idle timeout → lock screen shows but recording continues → finish recording → note encrypted with captured secret and saved
7. **Browser close**: Close tab → reopen → must login again → notes still there and decryptable
8. **12-hour TTL**: Notes older than 12 hours are deleted on next app load
9. **Vault secret immutability**: Attempt to overwrite vault_secret fails (Firestore rules)
