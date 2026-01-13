/**
 * ScribeVault Application Constants
 *
 * Centralized configuration for cryptography, session management, and vault secret.
 * All values defined as const assertions for type safety.
 */

/**
 * Vault secret configuration
 *
 * Defines the length of the cryptographically secure vault secret stored in Firestore.
 */
export const VAULT_SECRET_LENGTH = 64;

/**
 * Cryptographic configuration for vault encryption
 *
 * Uses PBKDF2 for key derivation and AES-GCM for encryption.
 * These settings ensure FIPS 140-2 compliance and strong security.
 */
export const CRYPTO_CONFIG = {
  /** Number of PBKDF2 iterations for key derivation (higher = more secure but slower) */
  PBKDF2_ITERATIONS: 100000,

  /** AES-GCM key length in bits */
  KEY_LENGTH: 256,

  /** Initialization vector length in bytes for AES-GCM */
  IV_LENGTH: 12,

  /** Hash algorithm for PBKDF2 */
  HASH_ALGORITHM: 'SHA-256',
} as const;

/**
 * Session management configuration
 *
 * Controls idle timeouts, recording limits, and data lifecycle.
 */
export const SESSION_CONFIG = {
  /** Idle timeout before vault auto-locks (15 minutes in milliseconds) */
  IDLE_TIMEOUT_MS: 15 * 60 * 1000,

  /** Maximum recording duration before auto-stop (60 minutes in milliseconds) */
  MAX_RECORDING_MS: 60 * 60 * 1000,

  /** Time-to-live for encrypted notes before auto-deletion (12 hours in milliseconds) */
  DATA_TTL_MS: 12 * 60 * 60 * 1000,

  /** Interval for running janitor cleanup process (5 minutes in milliseconds) */
  JANITOR_INTERVAL_MS: 5 * 60 * 1000,
} as const;
