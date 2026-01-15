/**
 * Profile Edit Modal
 *
 * Modal for editing existing user profile.
 * Pre-fills with current values, can be cancelled.
 * Accessible from topnav dropdown menu.
 *
 * HIPAA Note: Edits provider information only - NO PHI.
 */

'use client';

import { useState, useEffect } from 'react';
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
import { toast } from 'sonner';

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

interface ProfileEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProfileEditModal({ open, onOpenChange }: ProfileEditModalProps) {
  const { profile, updateProfile } = useUserProfile();

  const [name, setName] = useState('');
  const [credentials, setCredentials] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [clinicalSetting, setClinicalSetting] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pre-fill form when modal opens or profile changes
  useEffect(() => {
    if (profile) {
      setName(profile.name);
      setCredentials(profile.credentials);
      setSpecialty(profile.specialty);
      setClinicalSetting(profile.clinicalSetting);
    }
  }, [profile, open]);

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

      toast.success('Profile updated successfully');
      onOpenChange(false);
    } catch (err) {
      console.error('Failed to update profile:', err);
      setError(err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    // Reset form to current profile values
    if (profile) {
      setName(profile.name);
      setCredentials(profile.credentials);
      setSpecialty(profile.specialty);
      setClinicalSetting(profile.clinicalSetting);
    }
    setError(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
          <DialogDescription>
            Update your profile information. Changes will be saved immediately.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="edit-name">Full Name *</Label>
            <Input
              id="edit-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Dr. Sarah Johnson"
              disabled={isLoading}
            />
          </div>

          {/* Credentials */}
          <div className="space-y-2">
            <Label htmlFor="edit-credentials">Credentials *</Label>
            <Select value={credentials} onValueChange={setCredentials} disabled={isLoading}>
              <SelectTrigger id="edit-credentials" className="w-full">
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
            <Label htmlFor="edit-specialty">Specialty *</Label>
            <Input
              id="edit-specialty"
              value={specialty}
              onChange={(e) => setSpecialty(e.target.value)}
              placeholder="Internal Medicine"
              disabled={isLoading}
            />
          </div>

          {/* Clinical Setting */}
          <div className="space-y-2">
            <Label htmlFor="edit-clinicalSetting">Clinical Setting *</Label>
            <Input
              id="edit-clinicalSetting"
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

          {/* Action Buttons */}
          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={handleCancel} disabled={isLoading}>
              Cancel
            </Button>
            <Button
              type="submit"
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
                'Save Changes'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
