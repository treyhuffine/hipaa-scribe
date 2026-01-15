/**
 * NoteCard Component
 *
 * Displays a simplified clinical note card with timestamp and duration.
 * Features:
 * - Formatted timestamp range (start - end time) with date
 * - Duration display
 * - "Open" button to view full note in modal
 */

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { DecryptedNote } from '@/types';
import { NoteDetailModal } from '@/components/NoteDetailModal';

interface NoteCardProps {
  note: DecryptedNote;
  onDelete: (noteId: string) => Promise<void>;
}

export function NoteCard({ note, onDelete }: NoteCardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  /**
   * Format timestamp as "3:45PM - 3:57PM on Jan 8"
   */
  const formatTimeRange = (timestamp: number, durationSeconds: number): string => {
    const startDate = new Date(timestamp);
    const endDate = new Date(timestamp + durationSeconds * 1000);

    // Format start time
    const startTime = startDate
      .toLocaleString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      })
      .replace(' ', ''); // Remove space before AM/PM

    // Format end time
    const endTime = endDate
      .toLocaleString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      })
      .replace(' ', ''); // Remove space before AM/PM

    // Format date
    const dateStr = endDate.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
    });

    return `${startTime} - ${endTime} on ${dateStr}`;
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
      .replace(' ', ''); // Remove space before AM/PM

    return `${dateStr} at ${timeStr}`;
  };

  return (
    <>
      <Card
        className="w-full shadow-none cursor-pointer hover:shadow-sm transition-all duration-200"
        onClick={() => setIsModalOpen(true)}
      >
        <CardContent>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-lg">
                {note.source === 'text'
                  ? formatSimpleTimestamp(note.timestamp)
                  : formatTimeRange(note.timestamp, note.duration ?? 0)}
              </CardTitle>
              <CardDescription>
                {note.source === 'text' ? 'Quick Note' : formatDuration(note.duration ?? 0)}
              </CardDescription>
            </div>

            <Button variant="secondary" size="lg" className="cursor-pointer font-bold">
              Open
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Note Detail Modal */}
      <NoteDetailModal
        note={note}
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        onDelete={onDelete}
      />
    </>
  );
}
