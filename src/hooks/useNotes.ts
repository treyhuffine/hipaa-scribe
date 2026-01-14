/**
 * useNotes Hook
 *
 * Manages encrypted notes from IndexedDB.
 * Features:
 * - Auto-load notes when vault unlocked
 * - Decrypt notes with vault key
 * - Delete individual notes
 * - Graceful error handling for decryption failures
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useVault } from '@/context/VaultContext';
import { loadEncryptedNotesForUser, deleteEncryptedNoteForUser } from '@/lib/storage';
import { decryptData } from '@/lib/crypto';
import type { DecryptedNote } from '@/types';

interface UseNotesReturn {
  notes: DecryptedNote[];
  loading: boolean;
  error: string | null;
  loadNotes: () => Promise<void>;
  deleteNote: (noteId: string) => Promise<void>;
  refreshNotes: () => Promise<void>;
}

export function useNotes(): UseNotesReturn {
  const { user } = useAuth();
  const { vaultKey } = useVault();
  const [notes, setNotes] = useState<DecryptedNote[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Load notes from IndexedDB (user-scoped)
   *
   * Loads encrypted notes for the current user and decrypts them.
   * Handles individual note decryption errors without failing the entire load.
   */
  const loadNotes = useCallback(async () => {
    if (!vaultKey || !user) {
      setNotes([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Load encrypted notes for current user
      const encryptedNotes = await loadEncryptedNotesForUser(user.uid);

      // Decrypt each note
      const decryptedNotes: DecryptedNote[] = [];
      for (const encryptedNote of encryptedNotes) {
        try {
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

          decryptedNotes.push({
            id: encryptedNote.id,
            timestamp: encryptedNote.timestamp,
            transcript: noteData.transcript,
            soapNote: noteData.soapNote,
            duration: noteData.duration,
          });
        } catch (decryptError) {
          console.error(`Failed to decrypt note ${encryptedNote.id}:`, decryptError);
          // Continue loading other notes
        }
      }

      // Sort by timestamp descending (newest first)
      const sortedNotes = decryptedNotes.sort(
        (a, b) => b.timestamp - a.timestamp
      );

      setNotes(sortedNotes);
    } catch (err) {
      console.error('Failed to load notes:', err);
      setError(
        err instanceof Error ? err.message : 'Failed to load notes'
      );

      // Set empty array on error
      setNotes([]);
    } finally {
      setLoading(false);
    }
  }, [vaultKey, user]);

  /**
   * Delete a note by ID (user-scoped)
   *
   * Removes from IndexedDB and updates local state.
   */
  const deleteNote = useCallback(
    async (noteId: string) => {
      if (!user) return;

      try {
        await deleteEncryptedNoteForUser(noteId, user.uid);

        // Update local state by filtering out the deleted note
        setNotes((prevNotes) => prevNotes.filter((note) => note.id !== noteId));
      } catch (err) {
        console.error('Failed to delete note:', err);
        throw err;
      }
    },
    [user]
  );

  /**
   * Refresh notes (alias for loadNotes)
   *
   * Useful for manual refresh after operations that might affect the list.
   */
  const refreshNotes = useCallback(async () => {
    await loadNotes();
  }, [loadNotes]);

  /**
   * Auto-load notes when vaultKey becomes available
   */
  useEffect(() => {
    if (vaultKey) {
      loadNotes();
    } else {
      // Clear notes when vault is locked
      setNotes([]);
      setError(null);
    }
  }, [vaultKey, loadNotes]);

  /**
   * Listen for noteAdded event and refresh
   * Triggered by useRecorder after saving to IndexedDB
   */
  useEffect(() => {
    const handleNoteAdded = () => {
      if (vaultKey) {
        loadNotes();
      }
    };

    window.addEventListener('noteAdded', handleNoteAdded);
    return () => window.removeEventListener('noteAdded', handleNoteAdded);
  }, [vaultKey, loadNotes]);

  return {
    notes,
    loading,
    error,
    loadNotes,
    deleteNote,
    refreshNotes,
  };
}
