/**
 * Storage Utilities
 *
 * Helper functions for localStorage operations.
 * Used for non-PHI convenience features (e.g., remembering last login email).
 *
 * HIPAA Note: Only stores non-PHI data (email addresses).
 */

const LAST_EMAIL_KEY = 'scribevault_last_email';

/**
 * Save the last logged-in email address to localStorage
 *
 * @param email - Email address to save
 */
export function saveLastEmail(email: string): void {
  try {
    localStorage.setItem(LAST_EMAIL_KEY, email);
  } catch (e) {
    console.warn('Failed to save last email:', e);
  }
}

/**
 * Get the last logged-in email address from localStorage
 *
 * @returns The last email or null if not found
 */
export function getLastEmail(): string | null {
  try {
    return localStorage.getItem(LAST_EMAIL_KEY);
  } catch (e) {
    console.warn('Failed to get last email:', e);
    return null;
  }
}

/**
 * Clear the last logged-in email from localStorage
 */
export function clearLastEmail(): void {
  try {
    localStorage.removeItem(LAST_EMAIL_KEY);
  } catch (e) {
    console.warn('Failed to clear last email:', e);
  }
}
