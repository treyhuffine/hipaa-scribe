/**
 * Recorder Component
 *
 * Audio recording interface with visual state feedback.
 * States: idle → recording → processing → complete/error
 *
 * Uses RecordingContext for global recording state:
 * - Captures vault secret at recording start (closure pattern)
 * - Records audio via MediaRecorder
 * - Uploads to /api/scribe for transcription
 * - Encrypts with captured secret
 * - Saves to IndexedDB
 *
 * This component only handles UI and calls startRecording/stopRecording.
 */

'use client';

import { useRecording } from '@/context/RecordingContext';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Mic, Square, CheckCircle, AlertCircle } from 'lucide-react';
import { LiveWaveform } from '@/components/ui/live-waveform';

export function Recorder() {
  const {
    status,
    duration,
    remainingTime,
    error,
    startRecording,
    stopRecording,
    reset,
    stream,
  } = useRecording();

  /**
   * Format seconds as MM:SS
   */
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  /**
   * Handle start recording
   */
  const handleStart = async () => {
    await startRecording();
  };

  /**
   * Handle stop recording
   */
  const handleStop = () => {
    stopRecording();
  };

  // Recording State
  if (status === 'recording') {
    return (
      <div className="space-y-6">
        <div className="flex flex-col items-center justify-center space-y-6 py-8">
          {/* LiveWaveform visualization */}
          <div className="w-full">
            <LiveWaveform
              active={status === 'recording'}
              processing={false}
              stream={stream}
              mode="static"
              height={80}
              barWidth={3}
              barGap={2}
              barRadius={1.5}
              barColor="gray"
              sensitivity={1.2}
              smoothingTimeConstant={0.8}
              fadeEdges={true}
              fadeWidth={32}
            />
          </div>

          {/* Duration Display */}
          <div className="text-center space-y-1">
            <p className="text-3xl font-bold tabular-nums text-foreground">
              {formatTime(duration)}
            </p>
            <p className="text-sm text-muted-foreground">
              {formatTime(remainingTime)} remaining
            </p>
          </div>
        </div>

        {/* Stop Button */}
        <div className="w-full flex items-center">
          <Button onClick={handleStop} size="lg" className="mx-auto" variant="destructive">
            <Square className="mr-2 h-5 w-5" />
            Stop Recording
          </Button>
        </div>
      </div>
    );
  }

  // Processing State
  if (status === 'processing') {
    return (
      <div className="flex flex-col items-center justify-center space-y-4 py-12">
        <div className="h-16 w-16 animate-spin rounded-full border-4 border-muted border-t-primary"></div>
        <p className="text-lg font-semibold text-foreground">Processing recording...</p>
        <p className="text-sm text-muted-foreground">Transcribing and generating SOAP note</p>

        {/* Show processing animation on waveform */}
        <div className="w-full max-w-md mt-4">
          <LiveWaveform
            active={false}
            processing={true}
            stream={null}
            mode="static"
            height={80}
            barWidth={3}
            barGap={2}
            barRadius={1.5}
            barColor="gray"
          />
        </div>
      </div>
    );
  }

  // Complete State
  if (status === 'complete') {
    return (
      <div className="flex flex-col items-center justify-center space-y-4 py-12">
        <CheckCircle className="h-16 w-16 text-green-500" />
        <p className="text-lg font-semibold text-green-700">Note saved successfully</p>
        <Button onClick={reset} variant="outline" className="mt-4">
          Record Another
        </Button>
      </div>
    );
  }

  // Error State
  if (status === 'error' && error) {
    return (
      <div className="space-y-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button onClick={reset} className="w-full">
          Try Again
        </Button>
      </div>
    );
  }

  // Idle State - Record Button
  return (
    <div className="flex flex-col items-center justify-center space-y-6 py-8">
      <button
        onClick={handleStart}
        className="flex h-32 w-32 items-center justify-center rounded-full bg-primary text-white transition-all hover:bg-primary/90 active:scale-95 cursor-pointer"
        aria-label="Start recording"
      >
        <Mic className="h-16 w-16" />
      </button>

      <p className="text-center text-lg font-medium text-foreground">Record Visit</p>
      <p className="text-center text-sm text-muted-foreground">Max 60 minute recording time</p>
    </div>
  );
}
