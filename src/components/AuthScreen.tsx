/**
 * Unified Authentication Screen
 *
 * Single component used for both login page and lock screen.
 * Supports both Google OAuth and email/password authentication.
 * Auto-populates email field with last logged-in email for convenience.
 *
 * Modes:
 * - 'login': Initial login page
 * - 'locked': Session locked, requires re-authentication
 */

'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRecording } from '@/context/RecordingContext';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Lock } from 'lucide-react';
import { getLastEmail, saveLastEmail } from '@/lib/storage-utils';

interface AuthScreenProps {
  mode: 'login' | 'locked';
}

export function AuthScreen({ mode }: AuthScreenProps) {
  const { signInWithGoogle, signInWithEmail } = useAuth();
  const { status, capturedProfile, stopRecording, duration } = useRecording();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load last email on mount
  useEffect(() => {
    const lastEmail = getLastEmail();
    if (lastEmail) {
      setEmail(lastEmail);
    }
  }, []);

  // Clear error on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && error) {
        setError(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [error]);

  /**
   * Handle Google sign-in
   */
  const handleGoogleSignIn = async () => {
    setError(null);
    setIsLoading(true);

    try {
      await signInWithGoogle();
      // VaultContext will automatically initialize on auth state change
    } catch (error) {
      console.error('Google sign-in error:', error);
      setError('Failed to sign in with Google. Please try again.');
      setIsLoading(false);
    }
  };

  /**
   * Handle email/password sign-in
   */
  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      await signInWithEmail(email, password);
      // Save email for next time
      saveLastEmail(email);
      // VaultContext will automatically initialize on auth state change
    } catch (error) {
      console.error('Email sign-in error:', error);
      if (error instanceof Error) {
        if (error.message.includes('invalid-credential')) {
          setError('Invalid email or password.');
        } else if (error.message.includes('user-not-found')) {
          setError('No account found with this email.');
        } else if (error.message.includes('wrong-password')) {
          setError('Incorrect password.');
        } else {
          setError('Failed to sign in. Please try again.');
        }
      } else {
        setError('Failed to sign in. Please try again.');
      }
      setIsLoading(false);
    }
  };

  // Mode-specific content
  const title = mode === 'locked' ? 'Session Locked' : 'ScribeVault';
  const description =
    mode === 'locked'
      ? 'Your session locked due to inactivity. Please sign in again to continue.'
      : 'HIPAA-compliant voice transcription for healthcare professionals';
  const showLockIcon = mode === 'locked';

  return (
    <div
      className={
        mode === 'locked'
          ? 'fixed inset-0 bg-background/95 backdrop-blur-sm flex items-center justify-center z-50'
          : ''
      }
    >
      {/* Recording Indicator Banner */}
      {status === 'recording' && capturedProfile && (
        <Card className="w-full max-w-md mt-8 mb-4 border-orange-500 bg-orange-50 dark:bg-orange-950">
          <CardContent className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <p className="font-semibold text-foreground">
                  A session is being recorded by {capturedProfile.name}
                  {capturedProfile.credentials && `, ${capturedProfile.credentials}`}
                </p>
                {duration > 0 && (
                  <p className="text-sm font-medium text-foreground mt-1">
                    Recording for {duration < 60 ? 1 : Math.floor(duration / 60)}{' '}
                    {(duration < 60 ? 1 : Math.floor(duration / 60)) === 1 ? 'minute' : 'minutes'}
                  </p>
                )}
                <p className="text-sm text-muted-foreground mt-1">
                  This note will be encrypted for the person who started it, and they must use their
                  account to access it.
                </p>
              </div>
            </div>
            <Button onClick={stopRecording} variant="default" size="sm" className="w-full">
              Stop and Generate Note
            </Button>
          </CardContent>
        </Card>
      )}

      <Card className={mode === 'locked' ? 'w-full max-w-md mx-4' : 'w-full max-w-md'}>
        <CardHeader className={mode === 'locked' ? 'text-center' : 'space-y-1 text-center'}>
          {showLockIcon && (
            <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-muted flex items-center justify-center">
              <Lock className="w-6 h-6" />
            </div>
          )}
          <CardTitle className="text-2xl font-bold">{title}</CardTitle>
          <CardDescription className="text-pretty">{description}</CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Error Alert */}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Google Sign-In */}
          <Button
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className="w-full"
            size="lg"
            variant="outline"
          >
            <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            {isLoading ? 'Signing in...' : 'Continue with Google'}
          </Button>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
            </div>
          </div>

          {/* Email/Password Sign-In */}
          <form onSubmit={handleEmailSignIn} className="space-y-3">
            <div className="space-y-2">
              <Input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                required
                autoFocus={!email}
              />
              <Input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                required
                autoFocus={!!email}
              />
            </div>
            <Button type="submit" disabled={isLoading} className="w-full" size="lg">
              {isLoading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>

          {/* Footer */}
          <p className="text-center text-xs text-muted-foreground">
            {mode === 'login' && (
              <>
                By signing in, you agree to our Terms of Service and Privacy Policy.
                <br />
              </>
            )}
            All data is encrypted client-side for HIPAA compliance.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
