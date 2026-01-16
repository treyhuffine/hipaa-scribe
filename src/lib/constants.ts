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

  /** Idle warning threshold before showing warning sheet (10 minutes in milliseconds) */
  IDLE_WARNING_MS: 10 * 60 * 1000,

  /** Maximum recording duration before auto-stop (60 minutes in milliseconds) */
  MAX_RECORDING_MS: 60 * 60 * 1000,

  /** Time-to-live for encrypted notes before auto-deletion (12 hours in milliseconds) */
  DATA_TTL_MS: 12 * 60 * 60 * 1000,

  /** Interval for running janitor cleanup process (5 minutes in milliseconds) */
  JANITOR_INTERVAL_MS: 5 * 60 * 1000,
} as const;

/**
 * Dev mode detection
 *
 * Checks if the app is running in development mode based on NEXT_PUBLIC_APP_STAGE env var.
 * Dev mode enables testing utilities and shortened timeouts.
 */
export const IS_DEV_MODE = process.env.NEXT_PUBLIC_APP_STAGE === 'development';

/**
 * Dev mode session config (shortened timeouts for testing)
 *
 * These values replace SESSION_CONFIG when IS_DEV_MODE is true.
 * Allows rapid testing of idle timeout and recording features.
 */
export const DEV_SESSION_CONFIG = {
  /** Idle timeout in dev mode (1 minute in milliseconds) */
  IDLE_TIMEOUT_MS: 1 * 60 * 1000,

  /** Idle warning threshold in dev mode (30 seconds in milliseconds) */
  IDLE_WARNING_MS: 30 * 1000,

  /** Maximum recording duration in dev mode (2 minutes in milliseconds) */
  MAX_RECORDING_MS: 2 * 60 * 1000,
} as const;

/**
 * Environment configuration validation
 *
 * Logs current configuration on startup (client-side only) to help debug
 * environment variable issues and verify correct timeout settings.
 */
if (typeof window !== 'undefined') {
  console.log('ScribeVault Configuration:', {
    stage: process.env.NEXT_PUBLIC_APP_STAGE || 'not set',
    isDevMode: IS_DEV_MODE,
    timeouts: IS_DEV_MODE ? DEV_SESSION_CONFIG : SESSION_CONFIG,
  });
}
