/**
 * User Preferences API Endpoint
 *
 * Manages user preferences in Firestore (currently note type selection).
 * HIPAA Note: Preferences contain only app settings - NO PHI.
 *
 * GET  /api/profile/preferences - Fetch user preferences
 * POST /api/profile/preferences - Update note type preference
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { NOTE_TYPE_CONFIGS, type NoteType } from '@/lib/prompts';
import type { UserPreferences } from '@/types';

interface PreferencesResponse {
  preferences: UserPreferences;
}

interface ErrorResponse {
  error: string;
  details?: string;
}

/**
 * Validate note type
 */
function isValidNoteType(noteType: any): noteType is NoteType {
  return typeof noteType === 'string' && noteType in NOTE_TYPE_CONFIGS;
}

/**
 * Preferences API Handler
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<PreferencesResponse | ErrorResponse>
) {
  // Verify authentication
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Unauthorized',
      details: 'Missing or invalid authorization header',
    });
  }

  const idToken = authHeader.split('Bearer ')[1];
  if (!idToken) {
    return res.status(401).json({
      error: 'Unauthorized',
      details: 'Missing ID token',
    });
  }

  let uid: string;
  try {
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    uid = decodedToken.uid;
  } catch (error) {
    console.error('Token verification failed:', error);
    return res.status(401).json({
      error: 'Unauthorized',
      details: 'Invalid or expired token',
    });
  }

  // Handle GET request - Fetch preferences
  if (req.method === 'GET') {
    try {
      const prefsDoc = await adminDb.collection('users').doc(uid).collection('preferences').doc('data').get();

      if (!prefsDoc.exists) {
        // Return default preferences if none exist
        const defaultPrefs: UserPreferences = {
          lastNoteType: 'soap',
          lastUpdated: Date.now(),
        };
        return res.status(200).json({ preferences: defaultPrefs });
      }

      const preferences = prefsDoc.data() as UserPreferences;
      return res.status(200).json({ preferences });
    } catch (error) {
      console.error('Failed to fetch preferences:', error);
      return res.status(500).json({
        error: 'Server error',
        details: 'Failed to fetch preferences',
      });
    }
  }

  // Handle POST request - Update note type preference
  if (req.method === 'POST') {
    try {
      const { noteType } = req.body;

      // Validate note type
      if (!isValidNoteType(noteType)) {
        return res.status(400).json({
          error: 'Invalid input',
          details: `Invalid note type. Must be one of: ${Object.keys(NOTE_TYPE_CONFIGS).join(', ')}`,
        });
      }

      const now = Date.now();
      const preferences: UserPreferences = {
        lastNoteType: noteType,
        lastUpdated: now,
      };

      // Save to Firestore
      const prefsRef = adminDb.collection('users').doc(uid).collection('preferences').doc('data');
      await prefsRef.set(preferences);

      return res.status(200).json({ preferences });
    } catch (error) {
      console.error('Failed to save preferences:', error);
      return res.status(500).json({
        error: 'Server error',
        details: 'Failed to save preferences',
      });
    }
  }

  // Method not allowed
  return res.status(405).json({
    error: 'Method not allowed',
    details: `${req.method} is not supported`,
  });
}
