/**
 * Authentication Context
 *
 * Manages Firebase authentication state and provides auth operations.
 * Simplified to only handle authentication, vault secrets now managed by VaultContext.
 */

'use client';

import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  type User,
} from 'firebase/auth';
import { auth, googleProvider } from '@/lib/firebase-client';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

/**
 * Auth Context
 */
const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Custom hook to use auth context
 *
 * @throws Error if used outside AuthProvider
 */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

/**
 * Auth Provider Component
 *
 * Wraps the app to provide authentication state and methods.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Listen to auth state changes
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  /**
   * Sign in with Google popup
   */
  const signInWithGoogle = useCallback(async (): Promise<void> => {
    try {
      await signInWithPopup(auth, googleProvider);
      // onAuthStateChanged will handle the state update
    } catch (error) {
      console.error('Google sign-in error:', error);
      throw error;
    }
  }, []);

  /**
   * Sign in with email and password
   */
  const signInWithEmail = useCallback(async (
    email: string,
    password: string
  ): Promise<void> => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // onAuthStateChanged will handle the state update
    } catch (error) {
      console.error('Email sign-in error:', error);
      throw error;
    }
  }, []);

  /**
   * Sign out current user
   */
  const signOut = useCallback(async (): Promise<void> => {
    try {
      await firebaseSignOut(auth);
      // onAuthStateChanged will handle the state update
    } catch (error) {
      console.error('Sign-out error:', error);
      throw error;
    }
  }, []);

  const value: AuthContextValue = useMemo(
    () => ({
      user,
      loading,
      signInWithGoogle,
      signInWithEmail,
      signOut,
    }),
    [user, loading, signInWithGoogle, signInWithEmail, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
