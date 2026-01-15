/**
 * User Profile API Endpoint
 *
 * Manages user profile data in Firestore.
 * Profile contains provider information (name, credentials, specialty, clinical setting).
 * HIPAA Note: Profile contains NO PHI - only provider information.
 *
 * GET  /api/profile - Fetch user profile
 * POST /api/profile - Create or update user profile
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import type { UserProfile } from '@/types';

interface ProfileResponse {
  profile: UserProfile;
}

interface ErrorResponse {
  error: string;
  details?: string;
}

/**
 * Validate profile fields
 */
function validateProfile(data: any): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!data.name || typeof data.name !== 'string' || data.name.trim().length < 2) {
    errors.push('Name is required and must be at least 2 characters');
  }
  if (data.name && data.name.length > 100) {
    errors.push('Name must be less than 100 characters');
  }

  if (!data.credentials || typeof data.credentials !== 'string' || data.credentials.trim().length === 0) {
    errors.push('Credentials are required');
  }

  if (!data.specialty || typeof data.specialty !== 'string' || data.specialty.trim().length < 2) {
    errors.push('Specialty is required and must be at least 2 characters');
  }
  if (data.specialty && data.specialty.length > 100) {
    errors.push('Specialty must be less than 100 characters');
  }

  if (!data.clinicalSetting || typeof data.clinicalSetting !== 'string' || data.clinicalSetting.trim().length < 2) {
    errors.push('Clinical setting is required and must be at least 2 characters');
  }
  if (data.clinicalSetting && data.clinicalSetting.length > 100) {
    errors.push('Clinical setting must be less than 100 characters');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Profile API Handler
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ProfileResponse | ErrorResponse>
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

  // Handle GET request - Fetch profile
  if (req.method === 'GET') {
    try {
      const profileDoc = await adminDb.collection('users').doc(uid).collection('profile').doc('data').get();

      if (!profileDoc.exists) {
        return res.status(404).json({
          error: 'Not found',
          details: 'Profile does not exist',
        });
      }

      const profile = profileDoc.data() as UserProfile;
      return res.status(200).json({ profile });
    } catch (error) {
      console.error('Failed to fetch profile:', error);
      return res.status(500).json({
        error: 'Server error',
        details: 'Failed to fetch profile',
      });
    }
  }

  // Handle POST request - Create/update profile
  if (req.method === 'POST') {
    try {
      const { name, credentials, specialty, clinicalSetting } = req.body;

      // Validate input
      const validation = validateProfile(req.body);
      if (!validation.valid) {
        return res.status(400).json({
          error: 'Invalid input',
          details: validation.errors.join(', '),
        });
      }

      // Check if profile exists
      const profileRef = adminDb.collection('users').doc(uid).collection('profile').doc('data');
      const existingProfile = await profileRef.get();

      const now = Date.now();
      const profile: UserProfile = {
        name: name.trim(),
        credentials: credentials.trim(),
        specialty: specialty.trim(),
        clinicalSetting: clinicalSetting.trim(),
        isComplete: true,
        createdAt: existingProfile.exists ? (existingProfile.data()?.createdAt || now) : now,
        lastUpdated: now,
      };

      // Save to Firestore
      await profileRef.set(profile);

      return res.status(200).json({ profile });
    } catch (error) {
      console.error('Failed to save profile:', error);
      return res.status(500).json({
        error: 'Server error',
        details: 'Failed to save profile',
      });
    }
  }

  // Method not allowed
  return res.status(405).json({
    error: 'Method not allowed',
    details: `${req.method} is not supported`,
  });
}
