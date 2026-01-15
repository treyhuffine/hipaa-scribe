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
import { useRecording } from '@/context/RecordingContext';
import { useVault } from '@/context/VaultContext';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ProfileEditModal } from '@/components/ProfileEditModal';
import { DevTools } from '@/components/DevTools';
import { ChevronDown, User, LogOut, Info, Lock } from 'lucide-react';
import { toast } from 'sonner';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { user, signOut } = useAuth();
  const { profile } = useUserProfile();
  const { status, stopRecording } = useRecording();
  const { lockNow } = useVault();
  const [profileEditOpen, setProfileEditOpen] = useState(false);
  const [signOutDialogOpen, setSignOutDialogOpen] = useState(false);

  /**
   * Handle sign out click
   * If recording is in progress, show confirmation dialog
   * Otherwise, sign out directly
   */
  const handleSignOut = async () => {
    // Check if recording is in progress
    if (status === 'recording') {
      setSignOutDialogOpen(true);
      return;
    }

    // No recording, sign out directly
    try {
      await signOut();
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  /**
   * Handle "Stop Recording & Sign Out" button
   * Lock immediately - transcription will continue in background
   */
  const handleStopAndSignOut = async () => {
    stopRecording();
    setSignOutDialogOpen(false);

    // Lock immediately - transcription will continue in background
    // using captured vault secret from the recording session
    lockNow();
  };

  /**
   * Handle "Continue Recording" button
   */
  const handleContinueRecording = async () => {
    setSignOutDialogOpen(false);
    toast.info('Recording continues. Stop it from the lock screen.', {
      duration: 5000,
    });
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

          {/* Right side: Lock Button + User Dropdown */}
          <div className="flex items-center gap-2">
            {/* Lock Button */}
            {user && (
              <Button
                variant="outline"
                size="sm"
                onClick={lockNow}
                className="hidden sm:flex cursor-pointer border-yellow-500 hover:bg-yellow-500 hover:text-white"
              >
                <Lock className="h-4 w-4" />
                <span className="hidden md:inline">
                  {status === 'recording' ? 'Lock and continue recording' : 'Lock screen'}
                </span>
              </Button>
            )}

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
        </div>
      </header>
      <div className="h-16"></div>

      {/* Main Content */}
      <main className="mx-auto max-w-4xl p-4">{children}</main>

      {/* Profile Edit Modal */}
      <ProfileEditModal open={profileEditOpen} onOpenChange={setProfileEditOpen} />

      {/* Dev Tools */}
      <DevTools />

      {/* Sign Out Confirmation Dialog */}
      <AlertDialog open={signOutDialogOpen} onOpenChange={setSignOutDialogOpen}>
        <AlertDialogContent className="sm:max-w-xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Recording in Progress</AlertDialogTitle>
            <AlertDialogDescription>
              You have an active recording. Choose an option:
            </AlertDialogDescription>
          </AlertDialogHeader>

          {/* Info box */}
          <div className="flex gap-2 rounded-lg bg-muted p-3 text-sm">
            <Info className="h-5 w-5 shrink-0 text-muted-foreground" />
            <p className="text-muted-foreground">
              If you continue recording, you can stop it from the lock screen. The note will be
              encrypted and saved when you stop it.
            </p>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleStopAndSignOut}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Stop Recording & Sign Out
            </AlertDialogAction>
            <Button variant="default" onClick={handleContinueRecording}>
              Lock and Continue Recording
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
