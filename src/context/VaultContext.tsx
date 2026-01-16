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
import { SESSION_CONFIG, IS_DEV_MODE, DEV_SESSION_CONFIG } from '@/lib/constants';
import { toast } from 'sonner';

interface VaultContextValue {
  // State
  vaultKey: CryptoKey | null;
  vaultSecret: string | null;
  isLocked: boolean;
  isLoading: boolean;

  // Idle warning state
  isIdleWarningVisible: boolean;
  idleMinutes: number;

  // Actions
  lock: () => Promise<void>;
  dismissIdleWarning: () => void;
  lockNow: () => Promise<void>;

  // For recording closure
  getVaultSecretForRecording: () => string | null;

  // Recording state management
  setRecordingInProgress: (inProgress: boolean) => void;
}

const VaultContext = createContext<VaultContextValue | null>(null);

export function VaultProvider({ children }: { children: React.ReactNode }) {
  const { user, signOut, emailVerified } = useAuth();

  const [vaultKey, setVaultKey] = useState<CryptoKey | null>(null);
  const [vaultSecret, setVaultSecret] = useState<string | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isIdleWarningVisible, setIsIdleWarningVisible] = useState(false);
  const [idleMinutes, setIdleMinutes] = useState(0);

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

    // Block vault initialization if email not verified
    if (!emailVerified) {
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
  }, [user, emailVerified]);

  // Initialize vault on login
  useEffect(() => {
    initializeVault();
  }, [initializeVault]);

  /**
   * Lock vault and sign out user
   *
   * Clears vault key/secret from memory, user notes, and signs out from Firebase.
   * This ensures unlock requires full re-authentication.
   * Browser_salt is kept (reusable for same user on this device).
   */
  const lock = useCallback(async () => {
    // Show toast if recording is in progress
    if (recordingInProgressRef.current) {
      toast.info('Your encounter will continue recording.', {
        duration: 5000,
      });
    }

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

  // Activity tracking
  useEffect(() => {
    const updateActivity = () => {
      lastActivityRef.current = Date.now();
      setIdleMinutes(0);
      // Note: Activity resets timer but does NOT dismiss warning
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
      const idleTime = Date.now() - lastActivityRef.current;
      const currentIdleMinutes = Math.floor(idleTime / (60 * 1000));

      setIdleMinutes(currentIdleMinutes);

      // Use dev mode timeouts if enabled
      const warningMs = IS_DEV_MODE
        ? DEV_SESSION_CONFIG.IDLE_WARNING_MS
        : SESSION_CONFIG.IDLE_WARNING_MS;
      const timeoutMs = IS_DEV_MODE
        ? DEV_SESSION_CONFIG.IDLE_TIMEOUT_MS
        : SESSION_CONFIG.IDLE_TIMEOUT_MS;

      // Show warning based on timeout thresholds
      const warningMinutes = warningMs / (60 * 1000);
      const timeoutMinutes = timeoutMs / (60 * 1000);

      if (currentIdleMinutes >= warningMinutes && currentIdleMinutes < timeoutMinutes) {
        setIsIdleWarningVisible(true);
      } else if (currentIdleMinutes >= timeoutMinutes) {
        // Hide warning at timeout (whether lock happens or not)
        setIsIdleWarningVisible(false);
      }

      // Never lock during recording
      if (recordingInProgressRef.current) {
        return;
      }

      // Lock when timeout is reached
      if (idleTime > timeoutMs && vaultKey && !isLocked) {
        setIsIdleWarningVisible(false); // Hide warning when locking
        lock();
      }
    };

    const interval = setInterval(checkIdle, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, [vaultKey, isLocked, lock]);

  // Provide vault secret for recording closure
  const getVaultSecretForRecording = useCallback(() => {
    return vaultSecret;
  }, [vaultSecret]);

  // Method to set recording state (called by useRecorder hook)
  const setRecordingInProgress = useCallback((inProgress: boolean) => {
    recordingInProgressRef.current = inProgress;
  }, []);

  // Dismiss warning and reset timer
  const dismissIdleWarning = useCallback(() => {
    setIsIdleWarningVisible(false);
    lastActivityRef.current = Date.now();
    setIdleMinutes(0);
  }, []);

  // Lock immediately (triggered by "Lock now" button)
  const lockNow = useCallback(async () => {
    setIsIdleWarningVisible(false);
    await lock();
  }, [lock]);

  return (
    <VaultContext.Provider
      value={{
        vaultKey,
        vaultSecret,
        isLocked,
        isLoading,
        isIdleWarningVisible,
        idleMinutes,
        lock,
        dismissIdleWarning,
        lockNow,
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
