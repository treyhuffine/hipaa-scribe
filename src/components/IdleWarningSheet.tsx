import { Button } from '@/components/ui/button';

interface IdleWarningSheetProps {
  isVisible: boolean;
  idleMinutes: number;
  recordingInProgress: boolean;
  onDismiss: () => void;
  onLockNow: () => void;
}

export function IdleWarningSheet({
  isVisible,
  idleMinutes,
  recordingInProgress,
  onDismiss,
  onLockNow,
}: IdleWarningSheetProps) {
  if (!isVisible) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 border-t bg-card shadow-lg"
      role="alert"
      aria-live="polite"
    >
      <div className="max-w-2xl mx-auto p-4 space-y-3">
        {/* Warning Message */}
        <p className="text-sm text-foreground">
          You have been idle {idleMinutes} {idleMinutes === 1 ? 'minute' : 'minutes'}. At 15 minutes
          the screen will lock
          {recordingInProgress && ', but if you have an active recording it will continue'}.
        </p>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button onClick={onDismiss} variant="default" className="flex-1">
            I&apos;m still here
          </Button>
          <Button onClick={onLockNow} variant="outline" className="flex-1">
            Lock now
          </Button>
        </div>
      </div>
    </div>
  );
}
