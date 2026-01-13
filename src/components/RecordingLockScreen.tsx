/**
 * Recording Lock Screen Component
 *
 * Displayed when:
 * - A recording is in progress
 * - Idle timeout would have triggered lock
 * - User walked away during recording
 *
 * Features:
 * - Shows recording indicator and duration
 * - Allows stopping the recording
 * - Warning message about needing to sign in to review notes
 * - No unlock capability - must wait for recording to finish or stop it
 */

'use client';

import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Mic, Square, AlertTriangle } from 'lucide-react';

interface RecordingLockScreenProps {
  /** Current recording duration in seconds */
  duration: number;

  /** Callback when "Stop Recording" button is clicked */
  onStopRecording: () => void;
}

export function RecordingLockScreen({ duration, onStopRecording }: RecordingLockScreenProps) {
  /**
   * Format seconds as MM:SS
   */
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 bg-background/95 backdrop-blur-sm flex items-center justify-center z-50">
      <Card className="w-full max-w-md mx-4">
        <CardHeader className="text-center space-y-4">
          {/* Recording Indicator */}
          <div className="mx-auto relative h-16 w-16">
            <div className="absolute inset-0 animate-pulse rounded-full bg-red-500 opacity-75"></div>
            <div className="absolute inset-0 flex items-center justify-center rounded-full bg-red-600">
              <Mic className="h-8 w-8 text-white" />
            </div>
          </div>

          <CardTitle className="text-2xl">Recording in Progress</CardTitle>

          {/* Duration Display */}
          <div className="text-4xl font-bold tabular-nums text-foreground">
            {formatTime(duration)}
          </div>

          <CardDescription className="text-base">
            Session locked due to inactivity, but recording is still active.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Warning Alert */}
          <Alert variant="default" className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950">
            <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-500" />
            <AlertDescription className="text-sm text-yellow-800 dark:text-yellow-200">
              To review this note after it saves, you must sign in with the account that started the recording.
            </AlertDescription>
          </Alert>

          {/* Stop Recording Button */}
          <Button
            onClick={onStopRecording}
            variant="destructive"
            className="w-full"
            size="lg"
          >
            <Square className="mr-2 h-5 w-5" />
            Stop Recording
          </Button>

          {/* Info Text */}
          <p className="text-center text-xs text-muted-foreground">
            The recording will continue until stopped or until the maximum recording time (60 minutes) is reached.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
