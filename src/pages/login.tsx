/**
 * Login Page
 *
 * Provides authentication options (Google OAuth and email/password).
 * Supports login, signup, and email verification modes via URL query parameter.
 * After successful login, redirects to main app.
 * VaultContext automatically initializes vault on authentication.
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/context/AuthContext';
import { AuthScreen } from '@/components/AuthScreen';

export default function LoginPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup' | 'verify-email'>('login');

  // Parse mode from URL query parameter
  useEffect(() => {
    const queryMode = router.query.mode as string;
    if (queryMode === 'signup' || queryMode === 'verify-email') {
      setMode(queryMode);
    } else {
      setMode('login');
    }
  }, [router.query.mode]);

  // Redirect if already authenticated
  useEffect(() => {
    if (!loading && user) {
      router.push('/');
    }
  }, [user, loading, router]);

  // Handle mode change
  const handleModeChange = (newMode: 'login' | 'signup' | 'verify-email') => {
    setMode(newMode);
    router.push(`/login?mode=${newMode}`, undefined, { shallow: true });
  };

  // Show loading state
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="text-lg">Loading...</div>
        </div>
      </div>
    );
  }

  // Don't show login page if already authenticated
  if (user) {
    return null;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <AuthScreen mode={mode} onModeChange={handleModeChange} />
    </div>
  );
}
