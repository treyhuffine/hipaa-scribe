/**
 * Vault Context
 *
 * Manages vault encryption key, session management, and idle timeout.
 * Simplified architecture using Firestore-based vault secrets.
 * No PIN authentication - vault secret fetched from Firestore on authentication.
 */

'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import { getOrCreateVaultSecret } from '@/lib/vault';
import { deriveVaultKey } from '@/lib/crypto';
import { getBrowserSalt, clearUserData } from '@/lib/storage';
import { SESSION_CONFIG } from '@/lib/constants';

interface VaultContextValue {
  // State
  vaultKey: CryptoKey | null;
  vaultSecret: string | null;
  isLocked: boolean;
  isLoading: boolean;

  // Actions
  lock: () => Promise<void>;

  // For recording closure
  getVaultSecretForRecording: () => string | null;

  // Recording state management
  setRecordingInProgress: (inProgress: boolean) => void;
}

const VaultContext = createContext<VaultContextValue | null>(null);

export function VaultProvider({ children }: { children: React.ReactNode }) {
  const { user, signOut } = useAuth();

  const [vaultKey, setVaultKey] = useState<CryptoKey | null>(null);
  const [vaultSecret, setVaultSecret] = useState<string | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const lastActivityRef = useRef<number>(Date.now());
  const recordingInProgressRef = useRef<boolean>(false);

  /**
   * Initialize or re-initialize the vault
   * Called on initial login and after re-authentication from lock screen
   *
   * Flow:
   * 1. Get Firebase ID token for server authentication
   * 2. Fetch vault_secret from server (decrypts with BACKEND_SECRET)
   * 3. Get device-specific browser_salt from IndexedDB
   * 4. Derive vaultKey with vault_secret + browser_salt (Layer 2)
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

      // Get ID token for server authentication
      const idToken = await user.getIdToken();

      // Fetch vault_secret (server decrypts with Layer 1)
      const secret = await getOrCreateVaultSecret(user.uid, idToken);

      // Get device-specific browser_salt
      const browserSalt = await getBrowserSalt(user.uid);

      // Derive vault key with both secrets (Layer 2 encryption)
      const key = await deriveVaultKey(secret, browserSalt);

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

  /**
   * Lock vault and sign out user
   *
   * Clears vault key/secret from memory, user notes, and signs out from Firebase.
   * This ensures unlock requires full re-authentication.
   * Browser_salt is kept (reusable for same user on this device).
   */
  const lock = useCallback(async () => {
    // Clear user data from IndexedDB (notes only, keep browser_salt)
    if (user) {
      await clearUserData(user.uid);
    }

    setVaultKey(null);
    setVaultSecret(null);
    setIsLocked(true);

    // Sign out user from Firebase
    // This forces full re-authentication on unlock
    await signOut();
  }, [user, signOut]);

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
