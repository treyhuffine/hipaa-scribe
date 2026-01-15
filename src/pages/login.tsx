/**
 * Login Page
 *
 * Provides authentication options (Google OAuth and email/password).
 * After successful login, redirects to main app.
 * VaultContext automatically initializes vault on authentication.
 */

import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/context/AuthContext';
import { AuthScreen } from '@/components/AuthScreen';

export default function LoginPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  // Redirect if already authenticated
  useEffect(() => {
    if (!loading && user) {
      router.push('/');
    }
  }, [user, loading, router]);

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
      <AuthScreen mode="login" />
    </div>
  );
}
