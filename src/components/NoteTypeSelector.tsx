/**
 * Note Type Selector Component
 *
 * Dropdown selector for choosing clinical note type (SOAP, H&P, Progress, etc.).
 * Persists selection to Firebase preferences automatically.
 *
 * Used in:
 * - Recorder (for audio recording)
 * - QuickNoteDialog (for text notes)
 */

'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { NOTE_TYPE_CONFIGS, type NoteType } from '@/lib/prompts';
import { useUserProfile } from '@/context/UserProfileContext';

interface NoteTypeSelectorProps {
  value: NoteType;
  onValueChange: (value: NoteType) => void;
  disabled?: boolean;
}

export function NoteTypeSelector({ value, onValueChange, disabled }: NoteTypeSelectorProps) {
  const { updateNoteType } = useUserProfile();

  const handleChange = async (newType: NoteType) => {
    // Update local state immediately
    onValueChange(newType);

    // Persist to Firebase in background
    try {
      await updateNoteType(newType);
    } catch (error) {
      console.error('Failed to save note type preference:', error);
      // Don't block the UI - preference will be saved on next change
    }
  };

  return (
    <div className="space-y-2">
      <Select value={value} onValueChange={handleChange} disabled={disabled}>
        <SelectTrigger className="w-full h-auto min-h-14 whitespace-normal [&>span]:line-clamp-none [&>span]:text-left py-2">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {Object.values(NOTE_TYPE_CONFIGS)
            .filter((config) => config.id !== 'custom') // Hide custom for now (will be added in Phase 5)
            .map((config) => (
              <SelectItem key={config.id} value={config.id}>
                <div className="flex flex-col items-start">
                  <span className="font-medium">{config.label}</span>
                  <span className="text-xs text-muted-foreground">{config.description}</span>
                </div>
              </SelectItem>
            ))}
        </SelectContent>
      </Select>
    </div>
  );
}
