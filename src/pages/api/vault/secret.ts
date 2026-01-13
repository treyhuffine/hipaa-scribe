/**
 * Vault Secret API (Unified)
 *
 * GET-or-CREATE endpoint for vault secrets.
 * Returns existing vault_secret or creates new one if doesn't exist.
 *
 * Flow:
 * 1. Verify Firebase ID token
 * 2. Check if vault exists in Firestore
 *    - EXISTS: Decrypt and return vault_secret
 *    - NOT EXISTS: Generate, encrypt, store, return vault_secret
 * 3. Return { vaultSecret: "..." }
 *
 * Security:
 * - BACKEND_SECRET never exposed to client
 * - Per-user salt limits blast radius (never leaves server)
 * - Requires active authenticated session
 * - Vault immutable once created (never overwritten)
 * - Server CAN decrypt vault_secret (NOT zero-knowledge at Layer 1)
 * - Server CANNOT decrypt notes (needs browser_salt - zero-knowledge at Layer 2)
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { FieldValue } from 'firebase-admin/firestore';
import { adminAuth, adminDb } from '@/lib/firebase-admin';
import { deriveEncryptionKey, encryptData, decryptData } from '@/lib/crypto';

type SuccessResponse = {
  vaultSecret: string;
};

type ErrorResponse = {
  error: string;
};

/**
 * Generate cryptographically secure random vault secret (64 chars, URL-safe Base64)
 */
function generateVaultSecret(): string {
  const CHARSET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  const randomBytes = new Uint8Array(64);
  crypto.getRandomValues(randomBytes);

  let result = '';
  for (let i = 0; i < 64; i++) {
    result += CHARSET[randomBytes[i]! % CHARSET.length];
  }
  return result;
}

/**
 * Generate cryptographically secure random salt (64-char hex)
 */
function generateSalt(): string {
  const buffer = new Uint8Array(32); // 32 bytes = 64 hex chars
  crypto.getRandomValues(buffer);
  return Array.from(buffer)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SuccessResponse | ErrorResponse>
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verify Firebase ID token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized: Missing token' });
    }

    const idToken = authHeader.replace('Bearer ', '');

    // Verify token and get user ID
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const uid = decodedToken.uid;

    // Check BACKEND_SECRET early
    const BACKEND_SECRET = process.env.BACKEND_SECRET;
    if (!BACKEND_SECRET) {
      console.error('BACKEND_SECRET environment variable not set');
      return res
        .status(500)
        .json({ error: 'Server configuration error' });
    }

    // Check if vault exists
    const vaultRef = adminDb
      .collection('users')
      .doc(uid)
      .collection('vault')
      .doc('secret');

    const vaultDoc = await vaultRef.get();

    // Case 1: Vault exists - decrypt and return
    if (vaultDoc.exists) {
      const vaultData = vaultDoc.data();
      if (!vaultData || !vaultData.encrypted || !vaultData.salt) {
        return res
          .status(500)
          .json({ error: 'Invalid vault data structure' });
      }

      const { encrypted, salt } = vaultData;
      const { iv, ciphertext } = encrypted;

      if (!iv || !ciphertext) {
        return res
          .status(500)
          .json({ error: 'Missing encryption data' });
      }

      // Decrypt existing vault_secret
      const keyInput = `${uid}:${salt}:${BACKEND_SECRET}`;
      const encryptionKey = await deriveEncryptionKey(keyInput, 100000);
      const vaultSecret = await decryptData(encryptionKey, iv, ciphertext);

      return res.status(200).json({ vaultSecret });
    }

    // Case 2: Vault doesn't exist - create new one
    const vaultSecret = generateVaultSecret();
    const salt = generateSalt();

    // Encrypt vault_secret
    const keyInput = `${uid}:${salt}:${BACKEND_SECRET}`;
    const encryptionKey = await deriveEncryptionKey(keyInput, 100000);
    const encrypted = await encryptData(encryptionKey, vaultSecret);

    // Store in Firestore
    await vaultRef.set({
      encrypted: {
        iv: encrypted.iv,
        ciphertext: encrypted.ciphertext,
      },
      salt,
      createdAt: FieldValue.serverTimestamp(),
    });

    return res.status(200).json({ vaultSecret });

  } catch (error) {
    console.error('Vault secret error:', error);

    // Check for specific error types
    if (error instanceof Error) {
      if (error.message.includes('auth/id-token-expired')) {
        return res
          .status(401)
          .json({ error: 'Token expired' });
      }
      if (error.message.includes('auth/argument-error')) {
        return res
          .status(401)
          .json({ error: 'Invalid token' });
      }
    }

    return res
      .status(500)
      .json({ error: 'Failed to get or create vault secret' });
  }
}
