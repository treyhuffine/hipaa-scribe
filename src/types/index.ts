/**
 * ScribeVault Type Definitions
 *
 * This file contains all TypeScript interfaces and types for the HIPAA-compliant
 * voice transcription application.
 */

/**
 * Clinical note type - supports multiple formats
 *
 * Imported from prompts module for consistency.
 * Each type has a corresponding system prompt and formatting rules.
 */
export type { NoteType, NoteTypeConfig } from '@/lib/prompts';

/**
 * Encrypted note stored in IndexedDB
 *
 * Notes are encrypted client-side using AES-GCM before being stored.
 * The encryption key is derived from the vault secret stored in Firestore.
 */
export interface EncryptedNote {
  /** Unique identifier (UUID v4) */
  id: string;

  /** Unix timestamp in milliseconds when note was created */
  timestamp: number;

  /** Base64-encoded 12-byte initialization vector for AES-GCM */
  iv: string;

  /** Base64-encoded ciphertext (encrypted note data) */
  data: string;
}

/**
 * Decrypted note in application memory
 *
 * This represents the plaintext note data after decryption.
 * Never persisted to storage in this form.
 *
 * BACKWARD COMPATIBILITY: Old notes with "soapNote" field are automatically
 * migrated to "output" at read time by storage layer.
 */
export interface DecryptedNote {
  /** Unique identifier (UUID v4) - matches EncryptedNote.id */
  id: string;

  /** Unix timestamp in milliseconds when note was created */
  timestamp: number;

  /** Raw transcript: For audio notes - Groq Whisper Turbo output; For text notes - original user input */
  transcript: string;

  /** Formatted clinical note output (RENAMED from soapNote for multi-format support) */
  output: string;

  /** Clinical note type/format - defaults to 'soap' for backward compatibility */
  type: import('@/lib/prompts').NoteType;

  /** Custom formatting instructions (only present when type is 'custom') */
  customInstructions?: string;

  /** Recording duration in seconds (only present for audio notes) */
  duration?: number;

  /** Source of the note: 'audio' for recorded visits, 'text' for quick notes */
  source: 'audio' | 'text';
}


/**
 * Recording status for audio capture and processing
 *
 * - idle: No recording in progress, ready to start
 * - recording: Audio being captured from microphone
 * - processing: Audio uploaded, transcription and SOAP formatting in progress
 * - complete: Processing successful, note saved
 * - error: An error occurred during recording or processing
 */
export type RecordingStatus = 'idle' | 'recording' | 'processing' | 'complete' | 'error';

/**
 * Authentication context value
 *
 * Manages Firebase authentication state
 */
export interface AuthContextValue {
  /** Current authenticated user (null if not authenticated) */
  user: any | null; // Using 'any' for Firebase User to avoid importing Firebase types

  /** Whether authentication state is being loaded */
  loading: boolean;

  /** Sign in with Google popup */
  signInWithGoogle: () => Promise<void>;

  /** Sign in with email and password */
  signInWithEmail: (email: string, password: string) => Promise<void>;

  /** Sign out current user */
  signOut: () => Promise<void>;
}

/**
 * Vault context value
 *
 * Manages vault encryption key and session management with Firestore-based vault secrets.
 * Vault automatically initializes on authentication and locks on idle timeout.
 * Locking signs out the user from Firebase, requiring full re-authentication to unlock.
 */
export interface VaultContextValue {
  /** Vault encryption key (only available when unlocked, null otherwise) */
  vaultKey: CryptoKey | null;

  /** Vault secret from Firestore (64-character string) */
  vaultSecret: string | null;

  /** Whether the vault is currently locked */
  isLocked: boolean;

  /** Whether vault is currently loading/initializing */
  isLoading: boolean;

  /** Lock vault (clears key/secret and signs out user from Firebase) */
  lock: () => Promise<void>;

  /** Get vault secret for recording closure (captures secret at recording start) */
  getVaultSecretForRecording: () => string | null;

  /** Update recording state (prevents idle timeout during recording) */
  setRecordingInProgress: (inProgress: boolean) => void;
}

/**
 * API response from /api/scribe endpoint
 *
 * BACKWARD COMPATIBILITY: Field renamed from "soapNote" to "output"
 * to support multiple note formats.
 */
export interface ScribeResponse {
  /** Raw transcript from Groq Whisper */
  transcript: string;

  /** Formatted clinical note output (RENAMED from soapNote) */
  output: string;
}
