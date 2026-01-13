/**
 * Cryptographic Utilities using Web Crypto API
 *
 * Implements client-side encryption for HIPAA compliance.
 * All operations use browser-native Web Crypto API (FIPS 140-2 compliant).
 */

import { CRYPTO_CONFIG } from './constants';

/**
 * Derive encryption key from arbitrary input string (server or client)
 *
 * General-purpose key derivation using PBKDF2.
 * Can be used for vault_secret encryption (server-side) or note encryption (client-side).
 *
 * @param input - String to derive key from (e.g., "uid:salt:secret")
 * @param iterations - PBKDF2 iterations (default: 100,000)
 * @param extractable - Whether key can be exported (default: false)
 * @returns AES-GCM 256-bit encryption key
 */
export async function deriveEncryptionKey(
  input: string,
  iterations: number = CRYPTO_CONFIG.PBKDF2_ITERATIONS,
  extractable: boolean = false
): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const inputBuffer = encoder.encode(input);

  // Import input as key material
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    inputBuffer,
    'PBKDF2',
    false,
    ['deriveKey']
  );

  // Use input as salt (simplified)
  const saltBuffer = inputBuffer;

  // Derive AES-GCM key
  const key = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: saltBuffer,
      iterations,
      hash: CRYPTO_CONFIG.HASH_ALGORITHM,
    },
    keyMaterial,
    {
      name: 'AES-GCM',
      length: CRYPTO_CONFIG.KEY_LENGTH,
    },
    extractable,
    ['encrypt', 'decrypt']
  );

  return key;
}

/**
 * Derive vault encryption key from vault secret + browser salt
 *
 * Layer 2 encryption: combines vault_secret (from server) with browser_salt (device-specific).
 * Uses PBKDF2 with 100,000 iterations for key derivation.
 * The vault key is NON-EXTRACTABLE, meaning it cannot be exported from memory.
 *
 * @param vaultSecret - 64-character URL-safe Base64 string from Firestore
 * @param browserSalt - 64-character hex salt from IndexedDB (device-specific)
 * @returns Non-extractable AES-GCM 256-bit key
 */
export async function deriveVaultKey(
  vaultSecret: string,
  browserSalt: string
): Promise<CryptoKey> {
  const encoder = new TextEncoder();

  // Combine vault_secret + browser_salt for defense-in-depth
  const combinedSecret = `${vaultSecret}:${browserSalt}`;
  const secretBuffer = encoder.encode(combinedSecret);

  // Import combined secret as key material for PBKDF2
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    secretBuffer,
    'PBKDF2',
    false,
    ['deriveKey']
  );

  // Use browser_salt as PBKDF2 salt
  const saltBuffer = encoder.encode(browserSalt);

  // Derive AES-GCM key using PBKDF2
  const key = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: saltBuffer,
      iterations: CRYPTO_CONFIG.PBKDF2_ITERATIONS,
      hash: CRYPTO_CONFIG.HASH_ALGORITHM,
    },
    keyMaterial,
    {
      name: 'AES-GCM',
      length: CRYPTO_CONFIG.KEY_LENGTH,
    },
    false, // CRITICAL: non-extractable (cannot be exported)
    ['encrypt', 'decrypt']
  );

  return key;
}

/**
 * Encrypt data using AES-GCM
 *
 * Generates a unique 12-byte IV for each encryption operation.
 * Returns IV and ciphertext as Base64 strings for storage.
 *
 * @param key - Vault encryption key (from deriveVaultKey)
 * @param data - Plaintext string to encrypt
 * @returns Object containing Base64-encoded IV and ciphertext
 */
export async function encryptData(
  key: CryptoKey,
  data: string
): Promise<{ iv: string; ciphertext: string }> {
  // Generate random 12-byte IV
  const iv = crypto.getRandomValues(new Uint8Array(CRYPTO_CONFIG.IV_LENGTH));

  // Convert plaintext to ArrayBuffer
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);

  // Encrypt using AES-GCM
  const ciphertextBuffer = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv,
    },
    key,
    dataBuffer
  );

  // Convert to Base64 for storage
  const ivBase64 = arrayBufferToBase64(iv.buffer);
  const ciphertextBase64 = arrayBufferToBase64(ciphertextBuffer);

  return {
    iv: ivBase64,
    ciphertext: ciphertextBase64,
  };
}

/**
 * Decrypt data using AES-GCM
 *
 * @param key - Vault encryption key (from deriveVaultKey)
 * @param iv - Base64-encoded initialization vector
 * @param ciphertext - Base64-encoded ciphertext
 * @returns Decrypted plaintext string
 * @throws Error if decryption fails (wrong key or corrupted data)
 */
export async function decryptData(
  key: CryptoKey,
  iv: string,
  ciphertext: string
): Promise<string> {
  // Convert from Base64
  const ivBuffer = base64ToArrayBuffer(iv);
  const ciphertextBuffer = base64ToArrayBuffer(ciphertext);

  // Decrypt using AES-GCM
  const plaintextBuffer = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: ivBuffer as BufferSource,
    },
    key,
    ciphertextBuffer as BufferSource
  );

  // Convert to string
  const decoder = new TextDecoder();
  const plaintext = decoder.decode(plaintextBuffer);

  return plaintext;
}

/**
 * Convert ArrayBuffer to Base64 string
 */
function arrayBufferToBase64(buffer: ArrayBuffer | ArrayBufferView): string {
  const actualBuffer = buffer instanceof ArrayBuffer ? buffer : buffer.buffer;
  const bytes = new Uint8Array(actualBuffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary);
}

/**
 * Convert Base64 string to ArrayBuffer
 */
function base64ToArrayBuffer(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
