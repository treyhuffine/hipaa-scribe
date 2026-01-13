/**
 * Recording Session Creation API
 *
 * Creates a time-limited recording session for authenticated users.
 * Session allows transcription even if ID token expires during recording.
 *
 * Flow:
 * 1. Verify user's current Firebase ID token (proves authentication)
 * 2. Create session record in Firestore (90min lifetime)
 * 3. Return session ID to client
 *
 * Security:
 * - User must be authenticated at recording start
 * - Session tied to specific user
 * - Session is one-time use (deleted after transcription)
 * - Cryptographically random session ID (UUID v4 = 122 bits entropy)
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { adminAuth, adminDb } from '@/lib/firebase-admin';

const SESSION_LIFETIME_MS = 120 * 60 * 1000; // 120 minutes

type SuccessResponse = {
  sessionId: string;
};

type ErrorResponse = {
  error: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SuccessResponse | ErrorResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verify Firebase ID token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized: Missing token' });
    }

    const idToken = authHeader.replace('Bearer ', '');
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const uid = decodedToken.uid;

    // Create recording session
    const sessionId = crypto.randomUUID();
    const now = Date.now();
    const expiresAt = now + SESSION_LIFETIME_MS;

    await adminDb.collection('recording-sessions').doc(sessionId).set({
      userId: uid,
      createdAt: now,
      expiresAt: expiresAt,
      status: 'active',
    });

    console.log(`Created recording session ${sessionId} for user ${uid}`);

    return res.status(200).json({ sessionId });
  } catch (error) {
    console.error('Failed to create recording session:', error);

    if (error instanceof Error) {
      if (error.message.includes('auth/id-token-expired')) {
        return res.status(401).json({ error: 'Token expired' });
      }
      if (error.message.includes('auth/argument-error')) {
        return res.status(401).json({ error: 'Invalid token' });
      }
    }

    return res.status(500).json({ error: 'Failed to create session' });
  }
}
