/**
 * Quick Note Dialog Component
 *
 * Modal dialog for text-based note entry (paste or type clinical notes).
 * Sends text to Groq for SOAP formatting, encrypts, and stores in IndexedDB.
 *
 * Flow:
 * 1. User types or pastes text
 * 2. Submit sends to /api/text-note for SOAP formatting
 * 3. Response encrypted and saved to IndexedDB
 * 4. noteAdded event dispatched to refresh list
 * 5. Dialog auto-closes on success
 *
 * SECURITY: Uses same encryption as audio notes. HIPAA compliant.
 */

'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useVault } from '@/context/VaultContext';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { encryptData } from '@/lib/crypto';
import { saveEncryptedNoteForUser } from '@/lib/storage';

interface QuickNoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function QuickNoteDialog({ open, onOpenChange }: QuickNoteDialogProps) {
  const { user } = useAuth();
  const { vaultKey } = useVault();
  const [text, setText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  /**
   * Reset dialog state when closed
   */
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      // Reset state when closing
      setText('');
      setError(null);
      setIsSuccess(false);
    }
    onOpenChange(newOpen);
  };

  /**
   * Handle form submission
   */
  const handleSubmit = async () => {
    if (!user || !vaultKey) {
      setError('Vault is locked. Please unlock to continue.');
      return;
    }

    const trimmedText = text.trim();
    if (!trimmedText) {
      setError('Please enter some text before submitting.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Get Firebase ID token for authentication
      const idToken = await user.getIdToken();

      // Call API to format text as SOAP note
      const response = await fetch('/api/text-note', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: trimmedText,
          idToken,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || errorData.error || 'Failed to format note');
      }

      const { output } = await response.json();

      // Encrypt note data
      // For text notes: transcript = user's original text, no duration field
      const noteData = JSON.stringify({
        transcript: trimmedText,
        output,
        type: 'soap', // Default to SOAP format (UI for type selection will be added later)
        source: 'text',
        // Note: no duration field for text notes
      });

      const encrypted = await encryptData(vaultKey, noteData);

      // Save to IndexedDB
      await saveEncryptedNoteForUser(
        {
          id: crypto.randomUUID(),
          timestamp: Date.now(),
          iv: encrypted.iv,
          data: encrypted.ciphertext,
        },
        user.uid
      );

      // Dispatch event to refresh notes list
      window.dispatchEvent(new CustomEvent('noteAdded'));

      // Show success state
      setIsSuccess(true);

      // Auto-close after 1 second
      setTimeout(() => {
        handleOpenChange(false);
      }, 1000);
    } catch (err) {
      console.error('Quick note error:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Quick Note</DialogTitle>
          <DialogDescription>
            Paste or type your clinical note. It will be formatted as a SOAP note and encrypted for storage.
          </DialogDescription>
        </DialogHeader>

        {isSuccess ? (
          // Success state
          <div className="flex flex-col items-center justify-center py-8 space-y-4">
            <CheckCircle className="h-12 w-12 text-green-500" />
            <p className="text-lg font-semibold text-green-700">Note saved successfully</p>
          </div>
        ) : (
          // Input form
          <div className="space-y-4">
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Paste or type your clinical note here..."
              className="min-h-[200px] resize-none"
              disabled={isLoading}
              autoFocus
            />

            {/* Character counter */}
            <p className="text-sm text-muted-foreground text-right">
              {text.length} characters
            </p>

            {/* Error display */}
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Action buttons */}
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => handleOpenChange(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isLoading || !text.trim()}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  'Create Note'
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
