/**
 * Storage Utilities for Encrypted Notes
 *
 * Manages encrypted note storage in IndexedDB using idb-keyval.
 * All notes are encrypted client-side before storage.
 */

import { get, set, del } from 'idb-keyval';
import { decryptData, encryptData } from './crypto';
import { SESSION_CONFIG } from './constants';
import type { EncryptedNote, DecryptedNote } from '@/types';

/**
 * IndexedDB key for clinical notes array (DEPRECATED - use per-user keys)
 */
const NOTES_KEY = 'clinical_notes';

/**
 * Get IndexedDB key for user-specific notes
 */
const getUserNotesKey = (uid: string) => `notes_${uid}`;

/**
 * Get IndexedDB key for user-specific browser salt
 */
const getUserBrowserSaltKey = (uid: string) => `browser_salt_${uid}`;

/**
 * Save encrypted note to IndexedDB
 *
 * Appends a pre-encrypted note to the notes array.
 * Encryption must be performed at call site before calling this function.
 *
 * @param note - Already encrypted note to save
 */
export async function saveEncryptedNote(
  note: EncryptedNote
): Promise<void> {
  // Get existing notes array
  const existingNotes = (await get<EncryptedNote[]>(NOTES_KEY)) || [];

  // Append new note
  const updatedNotes = [...existingNotes, note];

  // Save back to IndexedDB
  await set(NOTES_KEY, updatedNotes);
}

/**
 * Load all notes and decrypt them
 *
 * Loads encrypted notes from IndexedDB, decrypts each one,
 * and returns them sorted by timestamp (newest first).
 * Handles individual note decryption errors gracefully.
 *
 * @param key - Vault encryption key
 * @returns Array of decrypted notes sorted by timestamp descending
 */
export async function loadAllNotes(key: CryptoKey): Promise<DecryptedNote[]> {
  // Get encrypted notes array
  const encryptedNotes = (await get<EncryptedNote[]>(NOTES_KEY)) || [];

  // Decrypt each note
  const decryptedNotes: DecryptedNote[] = [];

  for (const encryptedNote of encryptedNotes) {
    try {
      // Decrypt note data
      const decryptedData = await decryptData(
        key,
        encryptedNote.iv,
        encryptedNote.data
      );

      // Parse JSON
      const noteData = JSON.parse(decryptedData) as {
        transcript: string;
        soapNote: string;
        duration: number;
      };

      // Reconstruct DecryptedNote
      const decryptedNote: DecryptedNote = {
        id: encryptedNote.id,
        timestamp: encryptedNote.timestamp,
        transcript: noteData.transcript,
        soapNote: noteData.soapNote,
        duration: noteData.duration,
      };

      decryptedNotes.push(decryptedNote);
    } catch (error) {
      // Log error but continue loading other notes
      console.error(
        `Failed to decrypt note ${encryptedNote.id}:`,
        error instanceof Error ? error.message : String(error)
      );
      // Note: Corrupted notes are skipped, not returned
    }
  }

  // Sort by timestamp descending (newest first)
  return decryptedNotes.sort((a, b) => b.timestamp - a.timestamp);
}

/**
 * Delete a note by ID
 *
 * Removes the note from the encrypted notes array.
 *
 * @param noteId - ID of note to delete
 */
export async function deleteNote(noteId: string): Promise<void> {
  // Get existing notes
  const notes = (await get<EncryptedNote[]>(NOTES_KEY)) || [];

  // Filter out the note with matching ID
  const filteredNotes = notes.filter((note) => note.id !== noteId);

  // Save filtered array back
  await set(NOTES_KEY, filteredNotes);
}

/**
 * Purge all data from IndexedDB
 *
 * Deletes the entire IndexedDB database. Called when:
 * - Maximum PIN attempts exceeded (brute force protection)
 * - User explicitly requests data deletion
 *
 * CRITICAL: This is irreversible. All encrypted notes are permanently lost.
 */
export async function purgeAllData(): Promise<void> {
  try {
    // Delete the IndexedDB database
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.deleteDatabase('keyval-store');

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
      request.onblocked = () => {
        console.warn('IndexedDB deletion blocked. Close other tabs.');
        // Still resolve - we tried
        resolve();
      };
    });

    // Clear any localStorage items
    if (typeof window !== 'undefined') {
      // Remove PIN attempts counter
      localStorage.removeItem('scribevault_pin_attempts');
      // Remove any other app-specific localStorage items
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith('scribevault_')) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((key) => localStorage.removeItem(key));
    }
  } catch (error) {
    console.error('Failed to purge data:', error);
    // Still try to delete the notes key even if database deletion failed
    await del(NOTES_KEY);
  }
}

/**
 * Run janitor to delete old notes
 *
 * Deletes notes older than 12 hours (DATA_TTL_MS).
 * This runs periodically to enforce data lifecycle policies.
 *
 * @returns Number of notes deleted
 */
export async function runJanitor(): Promise<number> {
  // Get existing notes (raw, without decryption)
  const notes = (await get<EncryptedNote[]>(NOTES_KEY)) || [];

  // Current time
  const now = Date.now();

  // Filter to keep only notes within TTL
  const filteredNotes = notes.filter((note) => {
    const age = now - note.timestamp;
    return age < SESSION_CONFIG.DATA_TTL_MS;
  });

  // Calculate how many were deleted
  const deletedCount = notes.length - filteredNotes.length;

  // Only update if we deleted something
  if (deletedCount > 0) {
    await set(NOTES_KEY, filteredNotes);
    console.log(`Janitor deleted ${deletedCount} old note(s)`);
  }

  return deletedCount;
}

// ============================================================================
// USER-SCOPED STORAGE FUNCTIONS (NEW - for multi-user support)
// ============================================================================

/**
 * Get or create browser_salt for user
 *
 * This salt is device-specific and never sent to server.
 * Used for Layer 2 encryption (note encryption) with vault_secret.
 *
 * Each user has their own browser_salt on each device.
 * This ensures notes from different users cannot be decrypted by each other.
 *
 * @param uid - Firebase user ID
 * @returns 64-character hex salt
 */
export async function getBrowserSalt(uid: string): Promise<string> {
  const key = getUserBrowserSaltKey(uid);
  let salt = await get<string>(key);

  if (!salt) {
    // Generate new 64-character hex salt
    const buffer = new Uint8Array(32);
    crypto.getRandomValues(buffer);
    salt = Array.from(buffer)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    await set(key, salt);
  }

  return salt;
}

/**
 * Save encrypted note with user-specific key
 *
 * Appends a pre-encrypted note to the user's notes array.
 * Each user has their own notes stored separately in IndexedDB.
 *
 * @param note - Already encrypted note to save
 * @param uid - Firebase user ID
 */
export async function saveEncryptedNoteForUser(
  note: EncryptedNote,
  uid: string
): Promise<void> {
  const key = getUserNotesKey(uid);
  const existingNotes = (await get<EncryptedNote[]>(key)) || [];
  const updatedNotes = [...existingNotes, note];
  await set(key, updatedNotes);
}

/**
 * Load encrypted notes for specific user
 *
 * Returns raw encrypted notes without decryption.
 * Decryption should be performed at call site.
 *
 * @param uid - Firebase user ID
 * @returns Array of encrypted notes
 */
export async function loadEncryptedNotesForUser(
  uid: string
): Promise<EncryptedNote[]> {
  const key = getUserNotesKey(uid);
  return (await get<EncryptedNote[]>(key)) || [];
}

/**
 * Delete encrypted note for specific user
 *
 * @param noteId - ID of note to delete
 * @param uid - Firebase user ID
 */
export async function deleteEncryptedNoteForUser(
  noteId: string,
  uid: string
): Promise<void> {
  const key = getUserNotesKey(uid);
  const notes = (await get<EncryptedNote[]>(key)) || [];
  const filtered = notes.filter((n) => n.id !== noteId);
  await set(key, filtered);
}

/**
 * Run janitor for specific user
 *
 * Deletes notes older than 12 hours for a single user.
 *
 * @param uid - Firebase user ID
 * @returns Number of notes deleted
 */
export async function runJanitorForUser(uid: string): Promise<number> {
  const key = getUserNotesKey(uid);
  const notes = (await get<EncryptedNote[]>(key)) || [];
  const now = Date.now();
  const cutoff = now - SESSION_CONFIG.DATA_TTL_MS;

  const activeNotes = notes.filter((note) => note.timestamp > cutoff);
  const deletedCount = notes.length - activeNotes.length;

  if (deletedCount > 0) {
    await set(key, activeNotes);
    console.log(`Janitor deleted ${deletedCount} old note(s) for user ${uid}`);
  }

  return deletedCount;
}

/**
 * Clear user data on sign-out
 *
 * Clears notes from memory but keeps browser_salt (reusable for same user).
 *
 * @param uid - Firebase user ID
 */
export async function clearUserData(uid: string): Promise<void> {
  await del(getUserNotesKey(uid));
  // Keep browser_salt (reusable for same user on this device)
}

/**
 * Update a specific field in an encrypted note
 *
 * Loads note, decrypts, updates field, re-encrypts, saves back.
 * Used for updating SOAP note after regeneration with additional user input.
 *
 * @param noteId - Note ID to update
 * @param uid - Firebase user ID
 * @param vaultKey - Vault encryption key
 * @param updates - Partial updates to apply (e.g., { soapNote: "new text" })
 */
export async function updateEncryptedNoteForUser(
  noteId: string,
  uid: string,
  vaultKey: CryptoKey,
  updates: Partial<Pick<DecryptedNote, 'soapNote' | 'transcript' | 'duration'>>
): Promise<void> {
  const key = getUserNotesKey(uid);
  const notes = (await get<EncryptedNote[]>(key)) || [];

  // Find the note
  const noteIndex = notes.findIndex((n) => n.id === noteId);
  if (noteIndex === -1) {
    throw new Error('Note not found');
  }

  const encryptedNote = notes[noteIndex]!;

  // Decrypt current data
  const decryptedData = await decryptData(
    vaultKey,
    encryptedNote.iv,
    encryptedNote.data
  );

  const noteData = JSON.parse(decryptedData) as {
    transcript: string;
    soapNote: string;
    duration: number;
  };

  // Apply updates
  const updatedNoteData = { ...noteData, ...updates };

  // Re-encrypt
  const { iv, ciphertext } = await encryptData(
    vaultKey,
    JSON.stringify(updatedNoteData)
  );

  // Update in array
  notes[noteIndex] = {
    ...encryptedNote,
    iv,
    data: ciphertext,
  };

  // Save back
  await set(key, notes);
}
