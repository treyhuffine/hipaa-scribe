/**
 * Firebase Client SDK Initialization
 *
 * Initializes Firebase Authentication for browser-side usage.
 * Uses session persistence to ensure tokens are cleared when browser closes.
 */

import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  setPersistence,
  browserSessionPersistence,
  type Auth,
  EmailAuthProvider,
} from 'firebase/auth';

/**
 * Firebase client configuration from environment variables
 */
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

/**
 * Initialize Firebase app (singleton pattern)
 *
 * Only initializes once, even if this module is imported multiple times.
 */
export const app: FirebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0]!;

/**
 * Firebase Auth instance
 *
 * Configured with browserSessionPersistence to ensure tokens are cleared
 * when the browser session ends (HIPAA security requirement).
 */
export const auth: Auth = getAuth(app);

// Set persistence to session-only (tokens cleared on browser close)
setPersistence(auth, browserSessionPersistence).catch((error) => {
  console.error('Failed to set auth persistence:', error);
});

/**
 * Google Sign-In provider
 *
 * Used for signInWithPopup for Google OAuth authentication.
 */
export const googleProvider = new GoogleAuthProvider();

export const emailPasswordProvider = new EmailAuthProvider();
