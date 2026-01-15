/**
 * Main Application Page
 *
 * Entry point for authenticated users.
 * Flow:
 * 1. Auth guard: redirect to /login if not authenticated
 * 2. Profile guard: show setup modal if profile incomplete
 * 3. Lock screen: show when vault is locked (isLocked || !vaultKey)
 * 4. Main app: show recorder and notes list when unlocked
 */

import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/context/AuthContext';
import { useUserProfile } from '@/context/UserProfileContext';
import { useVault } from '@/context/VaultContext';
import { useRecording } from '@/context/RecordingContext';
import { Layout } from '@/components/Layout';
import { LockScreen } from '@/components/LockScreen';
import { RecordingLockScreen } from '@/components/RecordingLockScreen';
import { ProfileSetupModal } from '@/components/ProfileSetupModal';
import { Recorder } from '@/components/Recorder';
import { NotesList } from '@/components/NotesList';
import { runJanitorForUser } from '@/lib/storage';
import { SESSION_CONFIG } from '@/lib/constants';

export default function Home() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { isProfileComplete, loading: profileLoading } = useUserProfile();
  const { isLocked, isLoading: vaultLoading, vaultKey } = useVault();
  const { status: recordingStatus, duration, stopRecording } = useRecording();

  /**
   * Auth guard: redirect to login if not authenticated
   */
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  /**
   * Run janitor on mount and periodically (user-scoped)
   * Deletes notes older than 12 hours for current user
   */
  useEffect(() => {
    if (!user) return;

    // Run janitor for current user
    runJanitorForUser(user.uid);

    const interval = setInterval(() => {
      if (user) {
        runJanitorForUser(user.uid);
      }
    }, SESSION_CONFIG.JANITOR_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [user]);

  // Show loading while checking auth, profile, or initializing vault
  if (authLoading || profileLoading || vaultLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="text-lg">Loading...</div>
        </div>
      </div>
    );
  }

  // Don't render if not authenticated (will redirect)
  if (!user) {
    return null;
  }

  // Show profile setup modal if profile incomplete
  // This is blocking - user cannot proceed until profile is complete
  if (!isProfileComplete) {
    return <ProfileSetupModal open={true} />;
  }

  // Show recording lock screen if locked but recording is in progress
  // This happens when session would lock but recording is still active
  if (isLocked && recordingStatus === 'recording') {
    return (
      <RecordingLockScreen
        duration={duration}
        onStopRecording={stopRecording}
      />
    );
  }

  // Show lock screen when vault is locked or key not available
  if (isLocked || !vaultKey) {
    return <LockScreen />;
  }

  // Show main app when unlocked
  return (
    <Layout>
      <div className="max-w-2xl mx-auto py-8 px-4 space-y-8">
        <Recorder />
        <NotesList />
      </div>
    </Layout>
  );
}
