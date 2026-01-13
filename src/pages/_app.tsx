/**
 * Next.js App Component
 *
 * Root application wrapper with authentication, vault, and recording providers.
 * Provider hierarchy:
 * - AuthProvider (outermost) - Firebase authentication
 * - VaultProvider - Encryption key and session management
 * - RecordingProvider (innermost) - Recording state management
 *
 * This hierarchy ensures each provider has access to the contexts it depends on.
 */

import '@/styles/globals.css';
import type { AppProps } from 'next/app';
import { AuthProvider } from '@/context/AuthContext';
import { VaultProvider } from '@/context/VaultContext';
import { RecordingProvider } from '@/context/RecordingContext';
import { Toaster } from 'sonner';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <AuthProvider>
      <VaultProvider>
        <RecordingProvider>
          <Component {...pageProps} />
          <Toaster position="top-right" richColors />
        </RecordingProvider>
      </VaultProvider>
    </AuthProvider>
  );
}
