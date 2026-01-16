import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Mail, RefreshCw } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

interface EmailVerificationScreenProps {
  email: string;
  onBack?: () => void;
}

export function EmailVerificationScreen({ email, onBack }: EmailVerificationScreenProps) {
  const { sendVerificationEmail, reloadUser, signOut } = useAuth();
  const [resendCooldown, setResendCooldown] = useState(0);
  const [isResending, setIsResending] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState('');

  // Cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => {
        setResendCooldown(resendCooldown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleResend = async () => {
    if (resendCooldown > 0) return;

    setIsResending(true);
    setError('');

    try {
      await sendVerificationEmail();
      setResendCooldown(60);
    } catch (err: any) {
      console.error('Resend verification email error:', err);
      setError(err.message || 'Failed to resend email. Please try again.');
    } finally {
      setIsResending(false);
    }
  };

  const handleCheckVerification = async () => {
    setIsChecking(true);
    setError('');

    try {
      await reloadUser();
      // The auth context will update and trigger a re-render
      // The parent component will handle the redirect if verified
    } catch (err: any) {
      console.error('Check verification error:', err);
      setError(err.message || 'Failed to check verification status.');
    } finally {
      setIsChecking(false);
    }
  };

  const handleBackToLogin = async () => {
    try {
      await signOut();
      if (onBack) onBack();
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Mail className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Check your email</CardTitle>
          <CardDescription className="mt-2">
            We sent a verification link to <strong>{email}</strong>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-center text-sm text-muted-foreground">
            Click the link in the email to verify your account. Once verified, return here and click "I've verified my email".
          </p>

          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="space-y-3">
            <Button
              onClick={handleCheckVerification}
              disabled={isChecking}
              className="w-full"
            >
              {isChecking ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Checking...
                </>
              ) : (
                "I've verified my email"
              )}
            </Button>

            <Button
              onClick={handleResend}
              disabled={resendCooldown > 0 || isResending}
              variant="outline"
              className="w-full"
            >
              {isResending ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : resendCooldown > 0 ? (
                `Resend email (${resendCooldown}s)`
              ) : (
                'Resend verification email'
              )}
            </Button>

            <Button
              onClick={handleBackToLogin}
              variant="ghost"
              className="w-full"
            >
              Back to login
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
