/**
 * Vault Secret Utilities
 *
 * Manages vault secret generation and server API interactions.
 * Vault secrets are 64-character cryptographically secure random strings
 * encrypted by server using BACKEND_SECRET and stored in Firestore.
 *
 * Security Model (Two-Layer Encryption):
 * Layer 1: Server encrypts vault_secret with uid + per-user-salt + BACKEND_SECRET
 * Layer 2: Client encrypts notes with vault_secret + browser_salt
 */

/**
 * Fetch or create the user's vault secret via server API
 *
 * Calls unified /api/vault/secret endpoint which:
 * - Returns existing vault_secret if vault exists (decrypts with BACKEND_SECRET)
 * - Creates and returns new vault_secret if vault doesn't exist
 *
 * Server handles Layer 1 encryption (uid + per-user-salt + BACKEND_SECRET).
 * Client handles Layer 2 encryption (vault_secret + browser_salt).
 *
 * @param uid - Firebase user ID (unused, token contains uid)
 * @param idToken - Firebase ID token for authentication
 * @returns The user's vault secret
 * @throws Error if API call fails
 */
export async function getOrCreateVaultSecret(
  uid: string,
  idToken: string
): Promise<string> {
  try {
    const response = await fetch('/api/vault/secret', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${idToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to get vault secret');
    }

    const { vaultSecret } = await response.json();
    return vaultSecret;
  } catch (error) {
    console.error('Failed to get or create vault secret:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(
      'Unable to access vault secret. Please check your connection and try again.'
    );
  }
}
