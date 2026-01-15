/**
 * NoteDetailModal Component
 *
 * Full-screen modal for viewing and editing clinical notes.
 * Features:
 * - Full viewport coverage (100vh x 100vw, no rounded corners)
 * - Content max-width 960px, centered
 * - Tab-based navigation (Notes / Transcript)
 * - Copy buttons for both sections
 * - Fixed floating textarea for adding corrections/additional info
 * - SOAP note regeneration via Groq API with user input
 * - Toast notifications for success/error
 */

'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { X, Copy, Send, Loader2, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useVault } from '@/context/VaultContext';
import { useAuth } from '@/context/AuthContext';
import { updateEncryptedNoteForUser } from '@/lib/storage';
import type { DecryptedNote } from '@/types';

interface NoteDetailModalProps {
  note: DecryptedNote;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDelete: (noteId: string) => Promise<void>;
}

export function NoteDetailModal({ note, open, onOpenChange, onDelete }: NoteDetailModalProps) {
  const [output, setOutput] = useState(note.output);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [userInput, setUserInput] = useState('');
  const [activeSection, setActiveSection] = useState<'notes' | 'transcript'>('notes');
  const [copiedItem, setCopiedItem] = useState<'soap' | 'transcript' | null>(null);

  const { vaultKey } = useVault();
  const { user } = useAuth();

  // Reset state when note changes
  useEffect(() => {
    setOutput(note.output);
    setUserInput('');
    setActiveSection('notes');
    setCopiedItem(null);
  }, [note.id, note.output]);

  /**
   * Format timestamp as "3:45PM - 3:57PM on Jan 8"
   */
  const formatTimeRange = (timestamp: number, durationSeconds: number): string => {
    const startDate = new Date(timestamp);
    const endDate = new Date(timestamp + durationSeconds * 1000);

    const startTime = startDate
      .toLocaleString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      })
      .replace(' ', '');

    const endTime = endDate
      .toLocaleString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      })
      .replace(' ', '');

    const dateStr = endDate.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
    });

    return `${startTime} - ${endTime} on ${dateStr}`;
  };

  /**
   * Format simple timestamp for text notes: "Jan 8 at 3:45PM"
   */
  const formatSimpleTimestamp = (timestamp: number): string => {
    const date = new Date(timestamp);

    const dateStr = date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
    });

    const timeStr = date
      .toLocaleString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      })
      .replace(' ', '');

    return `${dateStr} at ${timeStr}`;
  };

  /**
   * Copy text to clipboard
   */
  const handleCopy = async (text: string, type: 'soap' | 'transcript') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedItem(type);
      toast.success(`${type === 'soap' ? 'SOAP note' : 'Transcript'} copied to clipboard`);

      // Reset copied state after 2 seconds
      setTimeout(() => {
        setCopiedItem(null);
      }, 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
      toast.error('Failed to copy to clipboard');
    }
  };

  /**
   * Handle form submission to regenerate SOAP note
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInput.trim() || !vaultKey || !user) return;

    setIsRegenerating(true);

    try {
      // Call API to regenerate note
      const response = await fetch('/api/regenerate-soap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: note.transcript,
          userInput: userInput.trim(),
          originalSoapNote: output, // API still uses old field name - will be updated later
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to regenerate note');
      }

      const data = await response.json();

      // Update IndexedDB with new encrypted note
      await updateEncryptedNoteForUser(note.id, user.uid, vaultKey, {
        output: data.soapNote || data.output, // Support both field names for now
      });

      // Update UI
      setOutput(data.soapNote || data.output);
      setUserInput('');
      toast.success('SOAP note updated successfully');
    } catch (error) {
      console.error('Failed to regenerate:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update note');
    } finally {
      setIsRegenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="h-screen w-screen max-w-none! rounded-none p-0 gap-0">
        {/* Fixed header with close button */}
        <div className="fixed top-0 left-0 right-0 bg-background border-b z-10 px-6 py-4">
          <div className="flex items-center justify-between max-w-[960px] mx-auto">
            <h2 className="text-xl font-semibold">
              {note.source === 'text'
                ? formatSimpleTimestamp(note.timestamp)
                : formatTimeRange(note.timestamp, note.duration ?? 0)}
            </h2>
            <DialogClose asChild>
              <Button variant="ghost" size="icon">
                <X className="h-5 w-5" />
              </Button>
            </DialogClose>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto pt-20 pb-32">
          <div className="max-w-[960px] mx-auto px-6 py-6 space-y-8">
            {/* Section tabs with Copy button floated right */}
            <div className="flex items-center justify-between border-b pb-2">
              {/* Left side: tabs */}
              <div className="flex gap-4">
                <button
                  onClick={() => setActiveSection('notes')}
                  className={cn(
                    'pb-2 px-4 font-semibold transition-colors',
                    activeSection === 'notes'
                      ? 'border-b-2 border-primary text-primary'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  Notes
                </button>
                <button
                  onClick={() => setActiveSection('transcript')}
                  className={cn(
                    'pb-2 px-4 font-semibold transition-colors',
                    activeSection === 'transcript'
                      ? 'border-b-2 border-primary text-primary'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  Transcript
                </button>
              </div>

              {/* Right side: Copy button */}
              <Button
                variant="default"
                size="sm"
                onClick={() =>
                  handleCopy(
                    activeSection === 'notes' ? output : note.transcript,
                    activeSection === 'notes' ? 'soap' : 'transcript'
                  )
                }
                disabled={isRegenerating}
              >
                {copiedItem ? (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="mr-2 h-4 w-4" />
                    {activeSection === 'notes' ? 'Copy Note' : 'Copy Transcript'}
                  </>
                )}
              </Button>
            </div>

            {/* Content sections */}
            {activeSection === 'notes' && (
              <div>
                {isRegenerating ? (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Regenerating note...</span>
                  </div>
                ) : (
                  <div className="whitespace-pre-wrap text-sm leading-relaxed">{output}</div>
                )}
              </div>
            )}

            {activeSection === 'transcript' && (
              <div className="whitespace-pre-wrap text-sm leading-relaxed">{note.transcript}</div>
            )}
          </div>
        </div>

        {/* Fixed floating textarea at bottom */}
        <div className="fixed bottom-0 left-0 right-0 bg-card border-t z-10 px-6 py-4">
          <div className="max-w-[960px] mx-auto">
            <form onSubmit={handleSubmit} className="space-y-3">
              <Textarea
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                placeholder="Add additional information or correct any details, then press send to update the note"
                className="min-h-[80px] resize-none"
                disabled={isRegenerating}
              />

              <div className="flex justify-end">
                <Button type="submit" disabled={isRegenerating || !userInput.trim()}>
                  {isRegenerating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Update Note
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
