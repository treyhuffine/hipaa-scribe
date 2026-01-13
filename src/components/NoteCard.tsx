/**
 * NoteCard Component
 *
 * Displays a clinical note with expand/collapse functionality.
 * Features:
 * - Formatted timestamp and duration
 * - SOAP note preview and full view
 * - Original transcript (expandable)
 * - Copy to clipboard functionality
 * - Delete confirmation dialog
 */

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ChevronDown, ChevronUp, Copy, Trash2, CheckCircle } from 'lucide-react';
import type { DecryptedNote } from '@/types';

interface NoteCardProps {
  note: DecryptedNote;
  onDelete: (noteId: string) => Promise<void>;
}

export function NoteCard({ note, onDelete }: NoteCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const [showDeletePrompt, setShowDeletePrompt] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [copiedItem, setCopiedItem] = useState<'soap' | 'transcript' | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  /**
   * Format timestamp as "Jan 8, 2026 at 3:45 PM"
   */
  const formatTimestamp = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  /**
   * Format duration as "12 min 34 sec"
   */
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;

    if (mins === 0) {
      return `${secs} sec`;
    }

    return `${mins} min ${secs} sec`;
  };

  /**
   * Get SOAP note preview (first 150 characters)
   */
  const getPreview = (text: string): string => {
    if (text.length <= 150) return text;
    return text.substring(0, 150) + '...';
  };

  /**
   * Copy text to clipboard
   */
  const handleCopy = async (text: string, type: 'soap' | 'transcript') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedItem(type);

      // Show delete prompt after successful copy
      setTimeout(() => {
        setCopiedItem(null);
        setShowDeletePrompt(true);
      }, 1000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  /**
   * Handle delete note
   */
  const handleDelete = async () => {
    setIsDeleting(true);

    try {
      await onDelete(note.id);
      setShowDeleteConfirm(false);
      setShowDeletePrompt(false);
    } catch (err) {
      console.error('Failed to delete note:', err);
      // Error is handled by parent component
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Card className="w-full">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-lg">{formatTimestamp(note.timestamp)}</CardTitle>
              <CardDescription>{formatDuration(note.duration)}</CardDescription>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              aria-label={isExpanded ? 'Collapse note' : 'Expand note'}
            >
              {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* SOAP Note Preview/Full View */}
          <div className="space-y-2">
            <h3 className="font-semibold text-foreground">SOAP Note</h3>
            <div className="whitespace-pre-wrap rounded-md bg-background p-3 text-sm">
              {isExpanded ? note.soapNote : getPreview(note.soapNote)}
            </div>

            {isExpanded && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleCopy(note.soapNote, 'soap')}
                className="w-full sm:w-auto"
              >
                {copiedItem === 'soap' ? (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="mr-2 h-4 w-4" />
                    Copy SOAP Note
                  </>
                )}
              </Button>
            )}
          </div>

          {/* Original Transcript (expandable) */}
          {isExpanded && (
            <div className="space-y-2">
              <button
                onClick={() => setShowTranscript(!showTranscript)}
                className="flex items-center text-sm font-semibold text-foreground hover:text-foreground"
              >
                {showTranscript ? (
                  <ChevronUp className="mr-1 h-4 w-4" />
                ) : (
                  <ChevronDown className="mr-1 h-4 w-4" />
                )}
                Original Transcript
              </button>

              {showTranscript && (
                <>
                  <div className="whitespace-pre-wrap rounded-md bg-background p-3 text-sm">
                    {note.transcript}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopy(note.transcript, 'transcript')}
                    className="w-full sm:w-auto"
                  >
                    {copiedItem === 'transcript' ? (
                      <>
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="mr-2 h-4 w-4" />
                        Copy Transcript
                      </>
                    )}
                  </Button>
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Prompt Dialog (after copy) */}
      <Dialog open={showDeletePrompt} onOpenChange={setShowDeletePrompt}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ready to delete?</DialogTitle>
            <DialogDescription>
              Now that you've copied the note, would you like to securely delete it from local
              storage?
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeletePrompt(false)}>
              Keep Note
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setShowDeletePrompt(false);
                setShowDeleteConfirm(true);
              }}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Note
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently delete this note? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteConfirm(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? (
                'Deleting...'
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Secure Delete
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
