/**
 * Next.js App Component
 *
 * Root application wrapper with authentication, profile, vault, and recording providers.
 * Provider hierarchy:
 * - AuthProvider (outermost) - Firebase authentication
 * - UserProfileProvider - User profile and preferences
 * - VaultProvider - Encryption key and session management
 * - RecordingProvider (innermost) - Recording state management
 *
 * This hierarchy ensures each provider has access to the contexts it depends on.
 */

import '@/styles/globals.css';
import type { AppProps } from 'next/app';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { UserProfileProvider } from '@/context/UserProfileContext';
import { VaultProvider, useVault } from '@/context/VaultContext';
import { RecordingProvider, useRecording } from '@/context/RecordingContext';
import { IdleWarningSheet } from '@/components/IdleWarningSheet';
import { Toaster } from 'sonner';

function IdleWarningContainer() {
  const { user } = useAuth();
  const { isLocked, vaultKey, isIdleWarningVisible, idleMinutes, dismissIdleWarning, lockNow } = useVault();
  const { status } = useRecording();

  // Only show warning when:
  // 1. User is authenticated
  // 2. Screen is NOT locked
  // 3. Vault is initialized
  const shouldShowWarning = user !== null && !isLocked && vaultKey !== null && isIdleWarningVisible;

  return (
    <IdleWarningSheet
      isVisible={shouldShowWarning}
      idleMinutes={idleMinutes}
      recordingInProgress={status === 'recording'}
      onDismiss={dismissIdleWarning}
      onLockNow={lockNow}
    />
  );
}

export default function App({ Component, pageProps }: AppProps) {
  return (
    <AuthProvider>
      <UserProfileProvider>
        <VaultProvider>
          <RecordingProvider>
            <Component {...pageProps} />
            <IdleWarningContainer />
            <Toaster position="top-right" richColors />
          </RecordingProvider>
        </VaultProvider>
      </UserProfileProvider>
    </AuthProvider>
  );
}
