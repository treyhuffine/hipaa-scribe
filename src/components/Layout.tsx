/**
 * Layout Component
 *
 * Main application layout with header, user info, and profile dropdown menu.
 * Provides consistent spacing and responsive design across all pages.
 */

'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useUserProfile } from '@/context/UserProfileContext';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ProfileEditModal } from '@/components/ProfileEditModal';
import { ChevronDown, User, LogOut } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { user, signOut } = useAuth();
  const { profile } = useUserProfile();
  const [profileEditOpen, setProfileEditOpen] = useState(false);

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

          {/* User Profile Dropdown */}
          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-2">
                  <div className="text-right">
                    <p className="text-sm font-medium">
                      {profile?.name || user.displayName || 'User'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {profile?.credentials || user.email}
                    </p>
                  </div>
                  <ChevronDown className="h-4 w-4 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={() => setProfileEditOpen(true)}>
                  <User className="mr-2 h-4 w-4" />
                  Edit Profile
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </header>
      <div className="h-16"></div>

      {/* Main Content */}
      <main className="mx-auto max-w-4xl p-4">{children}</main>

      {/* Profile Edit Modal */}
      <ProfileEditModal open={profileEditOpen} onOpenChange={setProfileEditOpen} />
    </div>
  );
}
