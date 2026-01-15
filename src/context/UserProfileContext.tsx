/**
 * User Profile Context
 *
 * Manages user profile and preferences state.
 * Profile contains provider information (name, credentials, specialty, clinical setting).
 * Preferences contain app settings (last selected note type).
 *
 * HIPAA Note: NO PHI stored in profile or preferences.
 */

'use client';

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { useAuth } from '@/context/AuthContext';
import type { UserProfile, UserPreferences } from '@/types';
import type { NoteType } from '@/lib/prompts';

interface UserProfileContextType {
  /** User profile data */
  profile: UserProfile | null;

  /** User preferences data */
  preferences: UserPreferences | null;

  /** Whether profile is complete */
  isProfileComplete: boolean;

  /** Loading state */
  loading: boolean;

  /** Error state */
  error: string | null;

  /** Update profile */
  updateProfile: (updates: Partial<Omit<UserProfile, 'isComplete' | 'createdAt' | 'lastUpdated'>>) => Promise<void>;

  /** Update last selected note type */
  updateNoteType: (noteType: NoteType) => Promise<void>;

  /** Refresh profile and preferences from server */
  refreshProfile: () => Promise<void>;
}

const UserProfileContext = createContext<UserProfileContextType | undefined>(undefined);

export function UserProfileProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Load profile and preferences from API
   */
  const loadUserData = useCallback(async () => {
    if (!user) {
      setProfile(null);
      setPreferences(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const idToken = await user.getIdToken();

      // Fetch profile and preferences in parallel
      const [profileRes, prefsRes] = await Promise.all([
        fetch('/api/profile', {
          headers: {
            'Authorization': `Bearer ${idToken}`,
          },
        }),
        fetch('/api/profile/preferences', {
          headers: {
            'Authorization': `Bearer ${idToken}`,
          },
        }),
      ]);

      // Handle profile response
      if (profileRes.ok) {
        const profileData = await profileRes.json();
        setProfile(profileData.profile);
      } else if (profileRes.status === 404) {
        // Profile doesn't exist yet - this is fine for new users
        setProfile(null);
      } else {
        console.error('Failed to fetch profile:', profileRes.status);
        setProfile(null);
      }

      // Handle preferences response
      if (prefsRes.ok) {
        const prefsData = await prefsRes.json();
        setPreferences(prefsData.preferences);
      } else {
        // Default preferences if fetch fails
        setPreferences({
          lastNoteType: 'soap',
          lastUpdated: Date.now(),
        });
      }
    } catch (err) {
      console.error('Failed to load user data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load profile');
      setProfile(null);
      setPreferences({
        lastNoteType: 'soap',
        lastUpdated: Date.now(),
      });
    } finally {
      setLoading(false);
    }
  }, [user]);

  /**
   * Update profile
   */
  const updateProfile = useCallback(async (updates: Partial<Omit<UserProfile, 'isComplete' | 'createdAt' | 'lastUpdated'>>) => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    try {
      const idToken = await user.getIdToken();

      const response = await fetch('/api/profile', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || errorData.error || 'Failed to update profile');
      }

      const data = await response.json();
      setProfile(data.profile);
    } catch (err) {
      console.error('Failed to update profile:', err);
      throw err;
    }
  }, [user]);

  /**
   * Update note type preference
   */
  const updateNoteType = useCallback(async (noteType: NoteType) => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    try {
      const idToken = await user.getIdToken();

      const response = await fetch('/api/profile/preferences', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ noteType }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || errorData.error || 'Failed to update preferences');
      }

      const data = await response.json();
      setPreferences(data.preferences);
    } catch (err) {
      console.error('Failed to update note type:', err);
      throw err;
    }
  }, [user]);

  /**
   * Load user data when user changes
   */
  useEffect(() => {
    loadUserData();
  }, [loadUserData]);

  const isProfileComplete = profile?.isComplete ?? false;

  return (
    <UserProfileContext.Provider
      value={{
        profile,
        preferences,
        isProfileComplete,
        loading,
        error,
        updateProfile,
        updateNoteType,
        refreshProfile: loadUserData,
      }}
    >
      {children}
    </UserProfileContext.Provider>
  );
}

/**
 * Hook to access user profile context
 */
export function useUserProfile() {
  const context = useContext(UserProfileContext);
  if (context === undefined) {
    throw new Error('useUserProfile must be used within a UserProfileProvider');
  }
  return context;
}
