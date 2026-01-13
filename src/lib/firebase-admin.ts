/**
 * Firebase Admin SDK Initialization
 *
 * Server-side only Firebase initialization for token verification and custom claims.
 * NEVER import this file in client-side code.
 */

import { initializeApp, getApps, cert, type App } from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';

/**
 * Parse Firebase service account from environment variable
 *
 * The service account JSON is stored as a string in FIREBASE_SERVICE_ACCOUNT_JSON.
 * This approach works better with deployment environments than file-based credentials.
 */
const getServiceAccount = () => {
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

  if (!serviceAccountJson) {
    throw new Error(
      'FIREBASE_SERVICE_ACCOUNT_JSON environment variable is not set. ' +
        'This is required for server-side Firebase Admin operations.'
    );
  }

  try {
    return JSON.parse(serviceAccountJson);
  } catch (error) {
    throw new Error(
      'Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON. ' +
        'Ensure it contains valid JSON from Firebase service account. ' +
        `Error: ${error instanceof Error ? error.message : String(error)}`
    );
  }
};

/**
 * Initialize Firebase Admin app (singleton pattern)
 *
 * Only initializes once, even if this module is imported multiple times.
 * Uses service account credentials for administrative operations.
 */
const app: App =
  getApps().length === 0
    ? initializeApp({
        credential: cert(getServiceAccount()),
      })
    : getApps()[0]!;

/**
 * Firebase Admin Auth instance
 *
 * Used for:
 * - Verifying ID tokens from client
 * - Setting custom user claims (vault_secret)
 * - Managing user accounts
 */
export const adminAuth: Auth = getAuth(app);

/**
 * Firebase Admin Firestore instance
 *
 * Used for:
 * - Server-side read/write to Firestore
 * - Accessing encrypted vault secrets
 * - Admin-level database operations
 */
export const adminDb: Firestore = getFirestore(app);
