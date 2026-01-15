/**
 * Dev Tools Component
 *
 * Development-only testing utilities for rapidly testing lock screen and recording features.
 * Triple-click on the app logo to show/hide the dev tools panel.
 *
 * Features:
 * - Instant lock screen trigger
 * - 5-second test recording
 *
 * Only visible when NEXT_PUBLIC_APP_STAGE !== 'production'.
 * Easily removable by checking IS_DEV_MODE flag.
 */

'use client';

import { useState } from 'react';
import { useVault } from '@/context/VaultContext';
import { useRecording } from '@/context/RecordingContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { IS_DEV_MODE } from '@/lib/constants';

export function DevTools() {
  const [isVisible, setIsVisible] = useState(false);
  const { lockNow } = useVault();
  const { startRecording, stopRecording, status } = useRecording();

  // Don't render in production
  if (!IS_DEV_MODE) return null;

  /**
   * Handle test recording (5-second auto-stop)
   */
  const handleTestRecording = async () => {
    if (status === 'recording') {
      stopRecording();
    } else {
      try {
        await startRecording();
        // Auto-stop after 5 seconds for quick testing
        setTimeout(() => {
          stopRecording();
        }, 5000);
      } catch (error) {
        console.error('Failed to start test recording:', error);
      }
    }
  };

  return (
    <>
      {/* Toggle Button */}
      <Button
        onClick={() => setIsVisible(!isVisible)}
        variant="outline"
        size="sm"
        className="fixed top-4 right-4 z-100 bg-yellow-50 border-yellow-500 hover:bg-yellow-100 dark:bg-yellow-950 dark:hover:bg-yellow-900"
      >
        🛠️ Dev Tools
      </Button>

      {/* Dev Tools Panel */}
      {isVisible && (
        <Card className="fixed bottom-4 right-4 z-100 w-80 shadow-lg border-yellow-500 border-2">
          <CardHeader className="bg-yellow-50 dark:bg-yellow-950 pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <span>🛠️</span>
              Dev Tools
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 pt-4">
            <Button
              onClick={lockNow}
              variant="destructive"
              className="w-full"
              size="sm"
            >
              Lock Screen Now
            </Button>
            <Button
              onClick={handleTestRecording}
              variant="outline"
              className="w-full"
              size="sm"
              disabled={status === 'processing'}
            >
              {status === 'recording'
                ? 'Stop Test Recording'
                : status === 'processing'
                ? 'Processing...'
                : '5-Second Test Recording'}
            </Button>
            <div className="pt-2 border-t">
              <p className="text-xs text-muted-foreground leading-relaxed">
                <strong>Dev Mode Active</strong>
                <br />
                Idle timeout: 1 min
                <br />
                Idle warning: 30 sec
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}
