/**
 * Profile Setup Modal
 *
 * Blocking modal for new users to complete their profile.
 * Collects: name, credentials, specialty, clinical setting.
 * Cannot be closed until all fields are filled.
 *
 * HIPAA Note: Collects provider information only - NO PHI.
 */

'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertCircle } from 'lucide-react';
import { useUserProfile } from '@/context/UserProfileContext';

const CREDENTIAL_OPTIONS = [
  { value: 'MD', label: 'MD - Doctor of Medicine' },
  { value: 'DO', label: 'DO - Doctor of Osteopathic Medicine' },
  { value: 'NP', label: 'NP - Nurse Practitioner' },
  { value: 'PA', label: 'PA - Physician Assistant' },
  { value: 'RN', label: 'RN - Registered Nurse' },
  { value: 'LPN', label: 'LPN - Licensed Practical Nurse' },
  { value: 'PharmD', label: 'PharmD - Doctor of Pharmacy' },
  { value: 'Other', label: 'Other' },
];

interface ProfileSetupModalProps {
  open: boolean;
}

export function ProfileSetupModal({ open }: ProfileSetupModalProps) {
  const { updateProfile } = useUserProfile();

  const [name, setName] = useState('');
  const [credentials, setCredentials] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [clinicalSetting, setClinicalSetting] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!name.trim() || !credentials || !specialty.trim() || !clinicalSetting.trim()) {
      setError('All fields are required');
      return;
    }

    if (name.trim().length < 2) {
      setError('Name must be at least 2 characters');
      return;
    }

    if (specialty.trim().length < 2) {
      setError('Specialty must be at least 2 characters');
      return;
    }

    if (clinicalSetting.trim().length < 2) {
      setError('Clinical setting must be at least 2 characters');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await updateProfile({
        name: name.trim(),
        credentials,
        specialty: specialty.trim(),
        clinicalSetting: clinicalSetting.trim(),
      });

      // Modal will auto-close when isProfileComplete becomes true
    } catch (err) {
      console.error('Failed to save profile:', err);
      setError(err instanceof Error ? err.message : 'Failed to save profile');
      setIsLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={() => {
        /* Cannot close until complete */
      }}
    >
      <DialogContent className="sm:max-w-[500px]" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Welcome to ScribeVault</DialogTitle>
          <DialogDescription>
            Please complete your profile to get started. This information helps personalize your
            experience.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Full Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Dr. Sarah Johnson"
              disabled={isLoading}
              autoFocus
            />
          </div>

          {/* Credentials */}
          <div className="space-y-2">
            <Label htmlFor="credentials">Credentials *</Label>
            <Select value={credentials} onValueChange={setCredentials} disabled={isLoading}>
              <SelectTrigger id="credentials" className="w-full">
                <SelectValue placeholder="Select your credentials" />
              </SelectTrigger>
              <SelectContent>
                {CREDENTIAL_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Specialty */}
          <div className="space-y-2">
            <Label htmlFor="specialty">Specialty *</Label>
            <Input
              id="specialty"
              value={specialty}
              onChange={(e) => setSpecialty(e.target.value)}
              placeholder="Internal Medicine"
              disabled={isLoading}
            />
          </div>

          {/* Clinical Setting */}
          <div className="space-y-2">
            <Label htmlFor="clinicalSetting">Clinical Setting *</Label>
            <Input
              id="clinicalSetting"
              value={clinicalSetting}
              onChange={(e) => setClinicalSetting(e.target.value)}
              placeholder="Private Practice"
              disabled={isLoading}
            />
          </div>

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full"
            disabled={
              isLoading ||
              !name.trim() ||
              !credentials ||
              !specialty.trim() ||
              !clinicalSetting.trim()
            }
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Complete Setup'
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
