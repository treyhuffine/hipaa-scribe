/**
 * Recording Context
 *
 * Provides global access to recording state across components.
 * This allows AuthScreen to show recording banner when locked
 * and recording is in progress.
 *
 * Uses the useRecorder hook internally and exposes its state/functions
 * to all child components.
 */

'use client';

import { createContext, useContext, ReactNode } from 'react';
import { useRecorder, RecordingStatus } from '@/hooks/useRecorder';
import type { NoteType } from '@/lib/prompts';

interface RecordingContextValue {
  /** Current recording status */
  status: RecordingStatus;

  /** Recording duration in seconds */
  duration: number;

  /** Time remaining until max recording length (60 minutes) */
  remainingTime: number;

  /** Error message if recording failed */
  error: string | null;

  /** Active MediaStream during recording (null when not recording) */
  stream: MediaStream | null;

  /** Start recording */
  startRecording: () => Promise<void>;

  /** Stop recording */
  stopRecording: () => void;

  /** Reset recording state after completion/error */
  reset: () => void;

  /** Current note type for recording */
  noteType: NoteType;

  /** Set note type for next recording */
  setNoteType: (noteType: NoteType) => void;

  /** Captured profile info from when recording started (survives sign-out) */
  capturedProfile: { name: string; credentials: string } | null;
}

const RecordingContext = createContext<RecordingContextValue | null>(null);

export function RecordingProvider({ children }: { children: ReactNode }) {
  // Use the useRecorder hook internally
  const recorder = useRecorder();

  return (
    <RecordingContext.Provider value={recorder}>
      {children}
    </RecordingContext.Provider>
  );
}

/**
 * Hook to access recording state and functions
 *
 * @throws Error if used outside RecordingProvider
 */
export function useRecording() {
  const context = useContext(RecordingContext);
  if (!context) {
    throw new Error('useRecording must be used within RecordingProvider');
  }
  return context;
}
