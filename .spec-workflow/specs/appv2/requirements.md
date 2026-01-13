# Requirements Document - AppV2 Vault Secret Architecture Update

## Introduction

This specification updates ScribeVault's encryption architecture from a PIN-based zero-knowledge system to a Firestore-based vault secret approach. The change eliminates UX friction from PIN entry while maintaining HIPAA-compliant security. The vault secret is stored securely in Firestore with immutable security rules, fetched only during authentication, and held in memory during active sessions. The re-authentication unlock mechanism preserves security while providing a seamless user experience.

**Note:** For comprehensive implementation details and code examples, refer to `/Users/treyhuffine/hipaa-notetaker/prd2.md`.

## Alignment with Product Vision

This feature aligns with ScribeVault's core principles:
- **Minimal data management**: Vault secret stored only in Firestore, encrypted notes in IndexedDB
- **HIPAA compliance**: Re-authentication required after idle timeout, secrets cleared from memory
- **Client-side encryption**: All PHI encrypted in browser before storage
- **Seamless UX**: Removes PIN entry friction while maintaining security boundaries

## Requirements

### Requirement 1: Firestore Vault Secret Storage

**User Story:** As a ScribeVault user, I want my encryption key stored securely in Firestore, so that I don't need to remember or enter a PIN while maintaining security.

#### Acceptance Criteria

1. WHEN a new user authenticates for the first time THEN the system SHALL generate a 64-character alphanumeric vault secret using cryptographically secure random values
2. WHEN the vault secret is generated THEN the system SHALL store it in Firestore at `/users/{uid}/vault/secret` with immutable security rules
3. WHEN a returning user authenticates THEN the system SHALL fetch their existing vault secret from Firestore
4. IF a vault secret document already exists THEN Firestore security rules SHALL prevent any update or delete operations
5. WHEN the vault secret is stored THEN it SHALL be 64 characters long using URL-safe Base64 charset (A-Z, a-z, 0-9, -, _)
6. WHEN Firestore rules are evaluated THEN only the authenticated user SHALL be able to read their own vault secret document
7. WHEN generating random characters THEN the system SHALL use `crypto.getRandomValues()` to ensure cryptographic security

### Requirement 2: Remove PIN-Based Authentication

**User Story:** As a developer, I want to remove all PIN-related code, so that the codebase reflects the new Firestore-based architecture.

#### Acceptance Criteria

1. WHEN the update is complete THEN the system SHALL NOT contain `PINOverlay.tsx` component
2. WHEN the update is complete THEN the system SHALL NOT contain `PINSetup.tsx` component
3. WHEN the update is complete THEN the system SHALL NOT contain `/pages/api/auth/init.ts` endpoint
4. WHEN the update is complete THEN `VaultContext.tsx` SHALL NOT contain PIN-related state or logic
5. WHEN the update is complete THEN the system SHALL NOT use custom claims for vault_secret storage
6. WHEN the update is complete THEN the system SHALL NOT contain PIN brute-force protection logic

### Requirement 3: Re-Authentication Unlock Mechanism

**User Story:** As a ScribeVault user, I want to unlock my session by re-authenticating, so that I can access my notes after the session locks without entering a PIN.

#### Acceptance Criteria

1. WHEN the session is locked due to idle timeout THEN the system SHALL display a lock screen overlay
2. WHEN the lock screen is displayed THEN it SHALL show an "Unlock Session" button
3. WHEN the user clicks "Unlock Session" THEN the system SHALL call `initializeVault()` to re-fetch the vault secret from Firestore
4. IF the vault secret is successfully fetched THEN the system SHALL derive the encryption key and unlock the session
5. WHEN the session unlocks THEN the system SHALL display the user's decrypted notes
6. WHEN the lock screen is displayed THEN it SHALL show the authenticated user's email address
7. WHEN the lock screen is displayed THEN it SHALL provide a "Sign in with a different account" option that triggers sign out and redirect to login

### Requirement 4: Session Lock on Idle Timeout

**User Story:** As a ScribeVault user, I want my session to automatically lock after 15 minutes of inactivity, so that my PHI is protected if I leave my device unattended.

#### Acceptance Criteria

1. WHEN user input events occur (mousedown, keydown, scroll, touchstart) THEN the system SHALL update the last activity timestamp
2. WHEN 15 minutes pass without user activity THEN the system SHALL lock the session
3. WHEN the session locks THEN the system SHALL clear `vaultKey` and `vaultSecret` from memory
4. WHEN the session locks THEN the system SHALL set `isLocked` to `true`
5. IF a recording is in progress THEN the system SHALL NOT lock the session regardless of idle time
6. WHEN checking for idle timeout THEN the system SHALL perform the check every 30 seconds

### Requirement 5: Recording Closure Pattern

**User Story:** As a ScribeVault user, I want my recordings to complete successfully even if my session locks during recording, so that I don't lose clinical data.

#### Acceptance Criteria

1. WHEN recording starts THEN the system SHALL capture the current `vaultSecret` and `uid` in closure variables
2. WHEN recording is in progress THEN the captured values SHALL remain accessible even if the session locks
3. WHEN recording stops THEN the system SHALL use the captured `vaultSecret` to encrypt the note data
4. WHEN recording completes THEN the system SHALL clear the captured secrets from memory
5. IF the session locks during recording THEN the recording SHALL continue and complete successfully
6. WHEN recording starts THEN the system SHALL set `recordingInProgress` to `true` to prevent idle timeout lock
7. WHEN recording stops THEN the system SHALL set `recordingInProgress` to `false` to re-enable idle timeout

### Requirement 6: Vault Key Derivation

**User Story:** As a developer, I want to derive encryption keys directly from the vault secret, so that the encryption is consistent and secure.

#### Acceptance Criteria

1. WHEN deriving a vault key THEN the system SHALL use PBKDF2 with 100,000 iterations
2. WHEN deriving a vault key THEN the system SHALL use the vault secret as both input material and salt
3. WHEN deriving a vault key THEN the system SHALL produce an AES-256-GCM key
4. WHEN deriving a vault key THEN the key SHALL be non-extractable
5. WHEN deriving a vault key THEN it SHALL be used for both encryption and decryption operations

### Requirement 7: Client-Side Encryption

**User Story:** As a ScribeVault user, I want my clinical notes encrypted in the browser before storage, so that my PHI never exists unencrypted on disk.

#### Acceptance Criteria

1. WHEN a recording is processed THEN the system SHALL encrypt the transcript and SOAP note using AES-256-GCM
2. WHEN encrypting data THEN the system SHALL generate a random 12-byte IV for each note
3. WHEN encrypting data THEN the system SHALL encode the IV and ciphertext as Base64
4. WHEN saving a note THEN the system SHALL store only the encrypted data, IV, timestamp, and note ID in IndexedDB
5. WHEN loading notes THEN the system SHALL decrypt each note using the vault key
6. IF decryption fails for a note THEN the system SHALL skip that note and log an error

### Requirement 8: Data Lifecycle Management

**User Story:** As a ScribeVault user, I want old notes automatically deleted after 12 hours, so that PHI doesn't accumulate unnecessarily on my device.

#### Acceptance Criteria

1. WHEN the app loads THEN the system SHALL run the janitor to purge notes older than 12 hours
2. WHEN the janitor runs THEN it SHALL execute every 5 minutes
3. WHEN notes are purged THEN the system SHALL remove them from IndexedDB
4. WHEN notes are purged THEN the system SHALL return the count of purged notes
5. WHEN calculating note age THEN the system SHALL use the note's timestamp field

### Requirement 9: Authentication Integration

**User Story:** As a ScribeVault user, I want to authenticate using Google OAuth or email/password, so that I can access my vault secret securely.

#### Acceptance Criteria

1. WHEN a user authenticates via Google THEN the system SHALL fetch or create their vault secret from Firestore
2. WHEN a user authenticates via email/password THEN the system SHALL fetch or create their vault secret from Firestore
3. WHEN authentication completes THEN the system SHALL call `initializeVault()` to set up the encryption key
4. WHEN a user signs out THEN the system SHALL clear all vault state from memory
5. WHEN a user is not authenticated THEN the system SHALL redirect to the login page

### Requirement 10: Constants Configuration

**User Story:** As a developer, I want centralized configuration constants, so that security and session parameters are consistent across the app.

#### Acceptance Criteria

1. WHEN the constants are defined THEN `VAULT_SECRET_LENGTH` SHALL be 64
2. WHEN the constants are defined THEN `PBKDF2_ITERATIONS` SHALL be 100,000
3. WHEN the constants are defined THEN `KEY_LENGTH` SHALL be 256 bits
4. WHEN the constants are defined THEN `IV_LENGTH` SHALL be 12 bytes
5. WHEN the constants are defined THEN `IDLE_TIMEOUT_MS` SHALL be 15 minutes
6. WHEN the constants are defined THEN `MAX_RECORDING_MS` SHALL be 60 minutes
7. WHEN the constants are defined THEN `DATA_TTL_MS` SHALL be 12 hours
8. WHEN the constants are defined THEN `JANITOR_INTERVAL_MS` SHALL be 5 minutes

## Non-Functional Requirements

### Code Architecture and Modularity

- **Single Responsibility Principle**: Each file shall have a single, well-defined purpose
  - `vault.ts`: Vault secret generation and Firestore operations
  - `crypto.ts`: Encryption/decryption operations
  - `storage.ts`: IndexedDB operations and janitor
  - `firestore.ts`: Firestore client initialization
- **Modular Design**: Components, utilities, and services shall be isolated and reusable
- **Dependency Management**: Minimize interdependencies between modules
- **Clear Interfaces**: Define clean contracts between components and layers

### Performance

- Vault secret fetch SHALL complete within 2 seconds on normal network conditions
- Encryption/decryption operations SHALL complete within 100ms per note
- IndexedDB operations SHALL be non-blocking to the UI
- Janitor SHALL execute in the background without impacting user interactions

### Security

- All PHI SHALL be encrypted using AES-256-GCM before storage
- Vault secrets SHALL be generated using cryptographically secure random number generation
- Vault secrets SHALL be stored in Firestore with immutable security rules
- Encryption keys SHALL be non-extractable from the Web Crypto API
- Sessions SHALL automatically lock after 15 minutes of inactivity
- Vault secrets SHALL be cleared from memory when the session locks
- Firestore security rules SHALL prevent vault secret modification or deletion
- Only authenticated users SHALL be able to read their own vault secret

### Reliability

- System SHALL handle network errors gracefully when fetching vault secrets
- System SHALL skip corrupted notes during decryption and log errors
- System SHALL prevent data loss during recording if session locks
- System SHALL complete in-progress recordings before allowing session lock

### Usability

- Users SHALL NOT be required to remember or enter a PIN
- Unlock process SHALL require only a single button click (re-authentication is transparent)
- Lock screen SHALL clearly indicate the session is locked and show the authenticated user
- Error messages SHALL be user-friendly and actionable
- Recording SHALL have a maximum duration of 60 minutes with visual feedback
