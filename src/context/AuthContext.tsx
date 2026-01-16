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
  createUserWithEmailAndPassword,
  sendEmailVerification as firebaseSendEmailVerification,
  signOut as firebaseSignOut,
  type User,
} from 'firebase/auth';
import { auth, googleProvider } from '@/lib/firebase-client';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  emailVerified: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  sendVerificationEmail: () => Promise<void>;
  reloadUser: () => Promise<void>;
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
  const [emailVerified, setEmailVerified] = useState(false);

  useEffect(() => {
    // Listen to auth state changes
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setEmailVerified(user?.emailVerified || false);
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
   * Sign up with email and password
   */
  const signUpWithEmail = useCallback(async (
    email: string,
    password: string
  ): Promise<void> => {
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      // onAuthStateChanged will handle the state update
    } catch (error) {
      console.error('Email sign-up error:', error);
      throw error;
    }
  }, []);

  /**
   * Send email verification to current user
   */
  const sendVerificationEmail = useCallback(async (): Promise<void> => {
    try {
      if (!auth.currentUser) {
        throw new Error('No user is currently signed in');
      }
      await firebaseSendEmailVerification(auth.currentUser);
    } catch (error) {
      console.error('Send verification email error:', error);
      throw error;
    }
  }, []);

  /**
   * Reload current user to refresh emailVerified status
   */
  const reloadUser = useCallback(async (): Promise<void> => {
    try {
      if (!auth.currentUser) {
        throw new Error('No user is currently signed in');
      }
      await auth.currentUser.reload();
      setUser(auth.currentUser);
      setEmailVerified(auth.currentUser.emailVerified);
    } catch (error) {
      console.error('Reload user error:', error);
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
      emailVerified,
      signInWithGoogle,
      signInWithEmail,
      signUpWithEmail,
      sendVerificationEmail,
      reloadUser,
      signOut,
    }),
    [user, loading, emailVerified, signInWithGoogle, signInWithEmail, signUpWithEmail, sendVerificationEmail, reloadUser, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
