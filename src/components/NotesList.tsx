/**
 * NotesList Component
 *
 * Displays a list of clinical notes with automatic TTL notice.
 * Features:
 * - Auto-loading from IndexedDB
 * - Empty state message
 * - TTL notice (12-hour automatic deletion)
 * - Loading state
 */

'use client';

import { useNotes } from '@/hooks/useNotes';
import { NoteCard } from '@/components/NoteCard';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, FileText } from 'lucide-react';

export function NotesList() {
  const { notes, loading, error, deleteNote } = useNotes();

  /**
   * Handle note deletion
   */
  const handleDelete = async (noteId: string) => {
    try {
      await deleteNote(noteId);
    } catch (err) {
      console.error('Failed to delete note:', err);
      // Error handling is managed by the hook
    }
  };

  // Show loading state
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center space-y-4 py-12">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-muted-foreground">Loading notes...</p>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  // Show empty state
  if (notes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center space-y-4 py-12">
        <FileText className="h-16 w-16 text-muted-foreground" />
        <p className="text-center text-lg text-muted-foreground">No notes available</p>
      </div>
    );
  }

  // Show notes list
  return (
    <div className="space-y-6">
      {/* TTL Notice */}
      <Alert>
        <AlertDescription className="text-sm">
          All notes are automatically deleted 12 hours after creation for security and compliance.
        </AlertDescription>
      </Alert>

      {/* Notes List */}
      <div className="space-y-4">
        {notes.map((note) => (
          <NoteCard key={note.id} note={note} onDelete={handleDelete} />
        ))}
      </div>
    </div>
  );
}
