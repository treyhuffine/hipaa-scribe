# Requirements Document: ScribeVault

## Introduction

ScribeVault is a HIPAA-compliant zero-knowledge web application that enables clinical staff to record patient encounters and generate professionally formatted SOAP notes. The application prioritizes patient data security through client-side encryption, stateless cloud processing, and aggressive session management. All Protected Health Information (PHI) remains encrypted on the user's device, with encryption keys that are never stored anywhere - derived solely from a user-defined PIN.

**Core Value Proposition:** Safe harbor compliance ensures that even if a device is stolen or cloud accounts are compromised, all PHI remains encrypted and inaccessible without the user's PIN.

## Alignment with Product Vision

This application implements a zero-knowledge architecture where:
- The server acts purely as a transit pipe to AI APIs (Groq)
- All data at rest is encrypted with keys derived from user secrets
- No PHI is ever persisted on servers or in cloud storage
- The client maintains complete control over data encryption and decryption

## Requirements

### Requirement 1: User Authentication

**User Story:** As a clinical staff member, I want to authenticate using Google Sign-In or email/password, so that I can securely access the application while maintaining HIPAA compliance.

#### Acceptance Criteria

1. WHEN a user navigates to the login page THEN the system SHALL display options for Google Sign-In and email/password authentication
2. WHEN a user successfully authenticates THEN the system SHALL call `/api/auth/init` to initialize or retrieve the vault secret
3. WHEN the vault initialization completes THEN the system SHALL force a token refresh to include the `vault_secret` custom claim
4. WHEN an unauthenticated user attempts to access the main page THEN the system SHALL redirect them to the login page
5. IF the user closes the browser THEN the system SHALL clear the session (using `browserSessionPersistence`)

### Requirement 2: Vault Secret Management

**User Story:** As a clinical staff member, I want a cryptographically secure vault secret tied to my account, so that my encryption keys are unique and derived from secure sources.

#### Acceptance Criteria

1. WHEN a user first authenticates THEN the system SHALL generate a 32-byte cryptographically secure random hex string as the vault secret
2. WHEN the vault secret is generated THEN the system SHALL store it as a Firebase custom claim (`vault_secret`) on the user's account
3. IF a vault secret already exists for a user THEN the system SHALL return the existing secret without regeneration
4. WHEN the vault secret is set THEN the system SHALL return status 'created'
5. WHEN the vault secret already exists THEN the system SHALL return status 'ready'

### Requirement 3: PIN Creation and Setup

**User Story:** As a first-time user, I want to create a 6-8 digit PIN, so that I can secure my encrypted notes with a memorable passphrase.

#### Acceptance Criteria

1. WHEN a user has no notes in IndexedDB and has a vault secret THEN the system SHALL display the PIN setup screen
2. WHEN creating a PIN THEN the system SHALL validate that the PIN is 6-8 digits only
3. WHEN entering a PIN THEN the system SHALL require confirmation by re-entering the same PIN
4. IF the PINs do not match THEN the system SHALL display an error message
5. WHEN a valid PIN is confirmed THEN the system SHALL derive the vault key using PBKDF2 with 250,000 iterations
6. WHEN the vault key is derived THEN the system SHALL set the vault as unlocked and mark first-time setup as complete
7. WHEN displaying PIN setup THEN the system SHALL show a disclaimer: "This PIN is never stored. If forgotten, all local data will be lost."

### Requirement 4: Vault Unlocking

**User Story:** As a returning user, I want to unlock my vault with my PIN, so that I can access my encrypted notes.

#### Acceptance Criteria

1. WHEN a user has existing notes in IndexedDB THEN the system SHALL display a full-screen PIN entry overlay
2. WHEN a user enters a PIN THEN the system SHALL derive a vault key from the PIN and vault secret
3. WHEN the derived key is correct THEN the system SHALL successfully decrypt the first note and unlock the vault
4. IF the decryption fails THEN the system SHALL decrement the remaining PIN attempts counter
5. WHEN PIN attempts reach 0 THEN the system SHALL purge all local data and sign the user out
6. WHEN a PIN unlock fails THEN the system SHALL display the number of remaining attempts
7. IF remaining attempts are less than 3 THEN the system SHALL display a warning message
8. WHEN an incorrect PIN is entered THEN the system SHALL clear the input field and show a shake animation

### Requirement 5: Encryption and Decryption

**User Story:** As a clinical staff member, I want my notes encrypted using AES-GCM with unique IVs, so that my patient data is cryptographically secure.

#### Acceptance Criteria

1. WHEN encrypting data THEN the system SHALL use AES-GCM with a 256-bit key
2. WHEN encrypting data THEN the system SHALL generate a unique 12-byte random IV for each encryption operation
3. WHEN deriving the vault key THEN the system SHALL use PBKDF2 with SHA-256, 250,000 iterations, and the vault secret as salt
4. WHEN deriving the vault key THEN the system SHALL set `extractable: false` to prevent key extraction
5. WHEN encrypting THEN the system SHALL return the IV and ciphertext as Base64 strings
6. WHEN decrypting THEN the system SHALL use the same IV that was used for encryption
7. IF decryption fails with the wrong key THEN the system SHALL throw an error

### Requirement 6: Audio Recording

**User Story:** As a clinical staff member, I want to record patient encounters using my device's microphone, so that I can capture the conversation for transcription.

#### Acceptance Criteria

1. WHEN starting a recording THEN the system SHALL request microphone access from the browser
2. IF microphone access is denied THEN the system SHALL display an error message with instructions to enable it in browser settings
3. WHEN recording THEN the system SHALL use MediaRecorder with audio/webm;codecs=opus format
4. WHEN recording THEN the system SHALL display elapsed time and remaining time
5. WHEN recording reaches 60 minutes THEN the system SHALL automatically stop recording and display a notification
6. WHEN recording THEN the system SHALL prevent device sleep using the Wake Lock API (if supported)
7. WHEN a user stops recording THEN the system SHALL return the audio as a Blob
8. WHEN recording THEN the system SHALL show a pulsing red indicator and waveform animation

### Requirement 7: Transcription and SOAP Note Generation

**User Story:** As a clinical staff member, I want my recordings automatically transcribed and formatted as SOAP notes, so that I can quickly document patient encounters.

#### Acceptance Criteria

1. WHEN a recording is stopped THEN the system SHALL upload the audio file to `/api/scribe` with the user's Firebase ID token
2. WHEN processing audio THEN the system SHALL verify the Firebase ID token using firebase-admin
3. IF the token is invalid THEN the system SHALL return a 401 error
4. WHEN processing audio THEN the system SHALL transcribe it using Groq Whisper Turbo
5. WHEN transcription completes THEN the system SHALL format the transcript into a SOAP note using Groq Llama 3.3 70B
6. WHEN formatting THEN the system SHALL use the SOAP system prompt to ensure professional medical documentation
7. WHEN processing completes THEN the system SHALL return both the transcript and SOAP note to the client
8. WHEN processing THEN the system SHALL display status messages: "Transcribing..." then "Generating SOAP note..."
9. IF processing fails THEN the system SHALL display an error message with a retry option

### Requirement 8: Note Storage and Retrieval

**User Story:** As a clinical staff member, I want my notes encrypted and stored locally in IndexedDB, so that they remain secure and accessible offline.

#### Acceptance Criteria

1. WHEN a SOAP note is generated THEN the system SHALL encrypt the note data (transcript, SOAP note, duration) using the vault key
2. WHEN encrypting a note THEN the system SHALL generate a unique IV for that note
3. WHEN saving a note THEN the system SHALL store the encrypted data with the IV, timestamp, and unique ID in IndexedDB
4. WHEN loading notes THEN the system SHALL retrieve all encrypted notes from IndexedDB
5. WHEN decrypting notes THEN the system SHALL use the current vault key
6. WHEN displaying notes THEN the system SHALL sort them by timestamp (newest first)
7. IF a note fails to decrypt THEN the system SHALL display an error message offering to delete the corrupted note

### Requirement 9: Note Display and Management

**User Story:** As a clinical staff member, I want to view, copy, and delete my SOAP notes, so that I can manage my clinical documentation.

#### Acceptance Criteria

1. WHEN displaying a note THEN the system SHALL show the timestamp formatted as "Jan 8, 2026 at 3:45 PM"
2. WHEN displaying a note THEN the system SHALL show the recording duration formatted as "12 min 34 sec"
3. WHEN displaying a note THEN the system SHALL show a preview of the first 150 characters of the SOAP note
4. WHEN a user clicks a note THEN the system SHALL expand to show the full SOAP note with proper formatting
5. WHEN a note is expanded THEN the system SHALL provide buttons to "Copy SOAP Note" and "Copy Transcript"
6. WHEN a user clicks "Copy SOAP Note" THEN the system SHALL copy the SOAP note to the clipboard
7. WHEN a note is copied THEN the system SHALL display a modal asking if the user is ready to delete the note
8. WHEN a user clicks "Secure Delete" THEN the system SHALL show a confirmation dialog
9. WHEN deletion is confirmed THEN the system SHALL remove the note from IndexedDB
10. WHEN there are no notes THEN the system SHALL display "No notes yet. Record your first encounter."

### Requirement 10: Session Management and Idle Timeout

**User Story:** As a clinical staff member, I want my session to automatically lock after 15 minutes of inactivity, so that my data remains secure if I step away.

#### Acceptance Criteria

1. WHEN the user performs any activity (mousedown, keydown, scroll, touchstart) THEN the system SHALL reset the idle timer
2. WHEN 15 minutes pass without activity AND the user is not recording or processing THEN the system SHALL lock the vault
3. WHEN the vault locks THEN the system SHALL clear the vault key from memory and display the PIN entry overlay
4. IF the user is recording or processing THEN the system SHALL NOT trigger the idle timeout
5. WHEN idle THEN the system SHALL display "Session locks in 12:45" with a countdown
6. WHEN less than 2 minutes remain THEN the system SHALL display the timer in a warning color

### Requirement 11: Data Time-to-Live (TTL)

**User Story:** As a clinical staff member, I want notes older than 12 hours automatically deleted, so that I don't accumulate stale patient data on my device.

#### Acceptance Criteria

1. WHEN the application loads THEN the system SHALL run the janitor function to delete old notes
2. WHEN the janitor runs THEN the system SHALL identify notes where `(Date.now() - timestamp) >= 12 hours`
3. WHEN old notes are identified THEN the system SHALL delete them from IndexedDB
4. WHEN the janitor completes THEN the system SHALL return the count of deleted notes
5. WHEN the application is running THEN the system SHALL run the janitor every 5 minutes
6. WHEN displaying notes THEN the system SHALL show a message indicating "All notes are deleted 12 hours after creation"

### Requirement 12: Brute Force Protection

**User Story:** As a clinical staff member, I want my data automatically purged after 5 failed PIN attempts, so that unauthorized users cannot access my patient information.

#### Acceptance Criteria

1. WHEN a PIN unlock fails THEN the system SHALL decrement the attempts counter stored in localStorage
2. WHEN 5 failed attempts occur THEN the system SHALL call the purge function
3. WHEN purging data THEN the system SHALL delete the IndexedDB database completely
4. WHEN purging data THEN the system SHALL clear any localStorage items related to the app
5. WHEN data is purged THEN the system SHALL sign the user out
6. WHEN data is purged THEN the system SHALL display "Too many incorrect PIN attempts. All local data has been erased for security."
7. WHEN a successful unlock occurs THEN the system SHALL reset the attempts counter to 5

### Requirement 13: Server-Side Security

**User Story:** As a healthcare organization, I want the server to be stateless and never log PHI, so that we maintain HIPAA compliance.

#### Acceptance Criteria

1. WHEN processing an API request THEN the system SHALL verify the Firebase ID token
2. WHEN processing audio THEN the system SHALL NOT log transcript data
3. WHEN processing audio THEN the system SHALL NOT write any data to the filesystem
4. WHEN processing audio THEN the system SHALL keep data only in function memory during the request
5. WHEN the request completes THEN the system SHALL discard all PHI from memory
6. WHEN errors occur THEN the system SHALL log only error types and user IDs, never PHI
7. IF token verification fails THEN the system SHALL return a 401 error without processing the request

### Requirement 14: User-Specific Data Isolation

**User Story:** As a clinical staff member, I want to see only my own notes, so that I don't accidentally access other users' patient information.

#### Acceptance Criteria

1. WHEN loading notes THEN the system SHALL load only notes from the current browser's IndexedDB
2. WHEN a user signs out THEN the system SHALL lock the vault and clear the vault key from memory
3. WHEN a different user signs in on the same device THEN the system SHALL show only their notes (encrypted with their vault secret)
4. IF User A's notes are encrypted with their vault secret THEN User B SHALL NOT be able to decrypt them even with the correct PIN

## Non-Functional Requirements

### Code Architecture and Modularity

- **Single Responsibility Principle**: Each file should have a single, well-defined purpose (separate files for crypto, storage, Firebase, Groq, etc.)
- **Modular Design**: Components should be isolated and reusable (PINOverlay, PINSetup, Recorder, NoteCard, etc.)
- **Dependency Management**: Minimize interdependencies - contexts should not depend on each other circularly
- **Clear Interfaces**: Define clean TypeScript interfaces for all data structures (EncryptedNote, DecryptedNote, VaultState, etc.)
- **Pages Router**: Use Next.js Pages Router (NOT App Router) with structure in `src/pages/`

### Performance

- Key derivation (PBKDF2 with 250,000 iterations) may take 100-500ms - display loading indicator
- Audio upload size should be monitored - 60 minutes at 128kbps ≈ 60MB
- IndexedDB operations should complete within 100ms for typical note counts (<100 notes)
- Idle timer checks should run efficiently without blocking the UI (use requestIdleCallback if available)

### Security

- **Zero Knowledge**: Server never has access to unencrypted PHI
- **Non-Extractable Keys**: All CryptoKey objects must have `extractable: false`
- **Unique IVs**: Each encryption operation must generate a new random IV
- **Token Verification**: All API routes must verify Firebase JWT before processing
- **No Logging of PHI**: Console.log must never output transcripts, notes, or patient data
- **HTTPS Only**: Application must be served over HTTPS in production
- **Session Persistence**: Use `browserSessionPersistence` to ensure tokens don't survive browser closure
- **Content Security Policy**: Implement CSP headers to prevent XSS

### Reliability

- **Offline Recording**: User should be able to record even if network is temporarily unavailable
- **Retry Logic**: Failed uploads should retry with exponential backoff (3 attempts)
- **Graceful Degradation**: If Wake Lock API is unavailable, recording should still work
- **Error Boundaries**: React error boundaries should catch and display component errors gracefully
- **Data Corruption Handling**: If a note fails to decrypt, offer deletion without crashing the app

### Usability

- **Mobile First**: Design should be responsive and work well on mobile devices (iPhone, iPad, Android)
- **Accessibility**: Keyboard navigation should work for all interactive elements
- **Visual Feedback**: All actions (recording, processing, copying) should have clear visual feedback
- **Error Messages**: All error messages should be clear, actionable, and user-friendly
- **Loading States**: All async operations should show appropriate loading indicators
- **Touch-Friendly**: Buttons and interactive elements should be at least 44x44px for touch targets
- **Numeric Keypad**: PIN entry should use `inputmode="numeric"` to trigger numeric keyboard on mobile

### Browser Compatibility

- Support latest versions of Chrome, Safari, Firefox, Edge
- Require Web Crypto API support (available in all modern browsers)
- Require IndexedDB support (available in all modern browsers)
- MediaRecorder API support (available in all modern browsers)
- Wake Lock API is optional (graceful degradation)

### Data Compliance

- **HIPAA Safe Harbor**: Even with device theft or cloud compromise, PHI remains inaccessible
- **No Server Storage**: Zero PHI persistence on servers or cloud storage
- **Stateless Processing**: All server operations must be stateless
- **BAA Requirements**: Human will sign BAAs with Google Cloud Platform and Groq
- **Audit Trail**: Log only user IDs, timestamps, and error types (never PHI)
