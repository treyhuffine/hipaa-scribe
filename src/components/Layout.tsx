/**
 * Layout Component
 *
 * Main application layout with header, user info, and sign out button.
 * Provides consistent spacing and responsive design across all pages.
 */

'use client';

import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background h-16 fixed top-0 left-0 right-0 z-50 w-full">
        <div className="mx-auto flex max-w-[1440px] items-center justify-between px-4 h-16">
          {/* App Name */}
          <h1 className="text-xl font-bold text-foreground">ScribeVault</h1>

          {/* User Info & Sign Out */}
          {user && (
            <div className="flex items-center gap-3">
              {/* User Email/Name */}
              <div className="hidden text-right sm:block">
                <p className="text-sm font-medium text-foreground">{user.displayName || 'User'}</p>
                <p className="text-xs text-muted-foreground">{user.email}</p>
              </div>

              {/* Sign Out Button */}
              <Button variant="outline" size="sm" onClick={handleSignOut} className="text-sm">
                Sign Out
              </Button>
            </div>
          )}
        </div>
      </header>
      <div className="h-16"></div>

      {/* Main Content */}
      <main className="mx-auto max-w-4xl p-4">{children}</main>
    </div>
  );
}
