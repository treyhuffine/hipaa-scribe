/**
 * Firestore Client Initialization
 *
 * Initializes and exports the Firestore client for vault secret storage.
 * Uses the existing Firebase app configuration.
 */

import { getFirestore } from 'firebase/firestore';
import { app } from './firebase-client';

/**
 * Firestore database instance
 *
 * Used for storing vault secrets in the /users/{uid}/vault/secret collection.
 */
export const db = getFirestore(app);
