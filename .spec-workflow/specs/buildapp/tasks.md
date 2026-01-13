# Tasks Document: ScribeVault Implementation

## Phase 1: Foundation and Project Setup

- [x] 1.1. Install required dependencies and configure project

  - Files:
    - `package.json`
    - `tsconfig.json`
    - `.env.example`
    - `next.config.js`
  - Install Firebase, Groq SDK, idb-keyval, uuid, and shadcn/ui components
  - Configure TypeScript strict mode and Next.js for Pages Router
  - Set up environment variable template
  - _Leverage: Existing Next.js setup, package.json_
  - _Requirements: Foundation requirements from PRD Section 3_
  - _Prompt: Implement the task for spec buildapp, first run spec-workflow-guide to get the workflow guide then implement the task: | Role: DevOps Engineer with expertise in Node.js project setup and dependency management | Task: Install all required dependencies (firebase, firebase-admin, groq-sdk, idb-keyval, uuid, shadcn/ui components: button, card, input, dialog, alert, toast, sonner) and configure tsconfig.json for strict mode, ensure Next.js is configured for Pages Router (NOT App Router) in next.config.js with output: 'standalone', create .env.example with all required environment variables as documented in PRD Section 5.1 | Restrictions: Do NOT use App Router, ONLY Pages Router; ensure TypeScript strict mode is enabled with noUncheckedIndexedAccess: true; do not install unnecessary dependencies | \_Leverage: Existing package.json and Next.js configuration | Success: All dependencies installed successfully, tsconfig.json has strict mode enabled, .env.example created with all required variables, next.config.js configured for Pages Router with standalone output | Instructions: After completing this task, mark it in-progress in tasks.md before starting, then log the implementation with the log-implementation tool including detailed artifacts (list all dependencies installed in artifacts), and finally mark it as complete in tasks.md_

- [x] 1.2. Create TypeScript type definitions

  - Files:
    - `src/types/index.ts`
  - Define all interfaces: EncryptedNote, DecryptedNote, VaultState, RecordingStatus
  - Add complete JSDoc comments for all types
  - _Leverage: TypeScript type system_
  - _Requirements: Requirements 5-11 (data structures)_
  - _Prompt: Implement the task for spec buildapp, first run spec-workflow-guide to get the workflow guide then implement the task: | Role: TypeScript Developer specializing in type systems and type safety | Task: Create comprehensive TypeScript interfaces in src/types/index.ts defining EncryptedNote (id, timestamp, iv, data), DecryptedNote (id, timestamp, transcript, soapNote, duration), VaultState (isUnlocked, isFirstTime, pinAttemptsRemaining), RecordingStatus type ('idle' | 'recording' | 'processing' | 'complete' | 'error'), and any other required types from the design document | Restrictions: Use strict TypeScript types, no 'any' types allowed; add JSDoc comments for all interfaces; ensure type safety for encryption/decryption operations | \_Leverage: TypeScript strict mode configuration | Success: All type definitions are complete and compile without errors, JSDoc comments added, types match the design document specifications exactly | Instructions: After completing this task, mark it in-progress in tasks.md before starting, then log the implementation with the log-implementation tool including detailed artifacts (document all interfaces created in artifacts.classes), and finally mark it as complete in tasks.md_

- [x] 1.3. Create application constants
  - Files:
    - `src/lib/constants.ts`
  - Define CRYPTO_CONFIG, SESSION_CONFIG, PIN_CONFIG as const objects
  - Add JSDoc comments explaining each constant
  - _Leverage: TypeScript const assertions_
  - _Requirements: Requirements 5, 6, 10, 11, 12 (configuration values)_
  - _Prompt: Implement the task for spec buildapp, first run spec-workflow-guide to get the workflow guide then implement the task: | Role: Backend Developer with expertise in application configuration and constants management | Task: Create src/lib/constants.ts with CRYPTO_CONFIG (PBKDF2_ITERATIONS: 250000, KEY_LENGTH: 256, IV_LENGTH: 12, SALT_ALGORITHM: 'SHA-256'), SESSION_CONFIG (IDLE_TIMEOUT_MS: 15*60*1000, MAX_RECORDING_MS: 60*60*1000, DATA_TTL_MS: 12*60*60*1000, JANITOR_INTERVAL_MS: 5*60\*1000, MAX_PIN_ATTEMPTS: 5), PIN_CONFIG (MIN_LENGTH: 6, MAX_LENGTH: 8) using TypeScript const assertions (as const) | Restrictions: Use const assertions for type safety; add JSDoc comments explaining purpose of each constant; do not use magic numbers elsewhere in the codebase | \_Leverage: TypeScript const assertions pattern | Success: All constants defined with proper types and const assertions, JSDoc comments added, values match PRD Section 7.1 exactly | Instructions: After completing this task, mark it in-progress in tasks.md before starting, then log the implementation with the log-implementation tool including detailed artifacts, and finally mark it as complete in tasks.md_

## Phase 2: Authentication Layer

- [x] 2.1. Initialize Firebase Client SDK

  - Files:
    - `src/lib/firebase-client.ts`
  - Initialize Firebase app for browser authentication
  - Export auth, googleProvider, emailPasswordProvider
  - Set persistence to browserSessionPersistence
  - _Leverage: Firebase SDK documentation_
  - _Requirements: Requirement 1 (User Authentication)_
  - _Prompt: Implement the task for spec buildapp, first run spec-workflow-guide to get the workflow guide then implement the task: | Role: Frontend Developer with expertise in Firebase Authentication | Task: Create src/lib/firebase-client.ts that initializes Firebase client SDK using environment variables (NEXT_PUBLIC_FIREBASE_\*), exports auth instance with setPersistence(browserSessionPersistence), exports googleProvider (GoogleAuthProvider), and configures email/password authentication as documented in PRD Section 6.1-6.2 | Restrictions: Must use browserSessionPersistence (not local persistence); do not hardcode config values; ensure singleton pattern for Firebase app; handle case where app already initialized | _Leverage: Firebase SDK initialization patterns | Success: Firebase client properly initialized, auth instance exported with session persistence, Google and email/password providers configured and exported | Instructions: After completing this task, mark it in-progress in tasks.md before starting, then log the implementation with the log-implementation tool including detailed artifacts (document exports in artifacts.functions), and finally mark it as complete in tasks.md_

- [x] 2.2. Initialize Firebase Admin SDK

  - Files:
    - `src/lib/firebase-admin.ts`
  - Initialize Firebase Admin for server-side token verification
  - Export adminAuth instance
  - _Leverage: Firebase Admin SDK documentation_
  - _Requirements: Requirement 2 (Vault Secret Management), Requirement 13 (Server-Side Security)_
  - _Prompt: Implement the task for spec buildapp, first run spec-workflow-guide to get the workflow guide then implement the task: | Role: Backend Developer with expertise in Firebase Admin SDK and server-side authentication | Task: Create src/lib/firebase-admin.ts that initializes Firebase Admin SDK using FIREBASE_SERVICE_ACCOUNT_JSON environment variable (parse JSON string), initializes app with credential, exports adminAuth instance for token verification as documented in PRD Section 6.2 | Restrictions: Only run on server-side (API routes); handle singleton pattern; never log service account credentials; parse env var as JSON | \_Leverage: Firebase Admin SDK patterns | Success: Firebase Admin properly initialized server-side only, adminAuth exported for token verification, singleton pattern ensures single instance | Instructions: After completing this task, mark it in-progress in tasks.md before starting, then log the implementation with the log-implementation tool including detailed artifacts (document exports in artifacts.functions), and finally mark it as complete in tasks.md_

- [x] 2.3. Create AuthContext provider

  - Files:
    - `src/context/AuthContext.tsx`
  - Manage auth state: user, loading, idToken, vaultSecret
  - Provide signInWithGoogle, signInWithEmail, signOut functions
  - Extract vault_secret from JWT custom claims
  - _Leverage: React Context API, Firebase Auth state observers_
  - _Requirements: Requirement 1 (User Authentication), Requirement 2 (Vault Secret Management)_
  - _Prompt: Implement the task for spec buildapp, first run spec-workflow-guide to get the workflow guide then implement the task: | Role: React Developer with expertise in Context API and Firebase Authentication | Task: Create src/context/AuthContext.tsx implementing AuthContext with state (user, loading, idToken, vaultSecret), methods (signInWithGoogle using signInWithPopup, signInWithEmail using signInWithEmailAndPassword, signOut), listen to onAuthStateChanged, extract vault_secret from JWT custom claims by decoding idToken, provide AuthProvider component as documented in PRD Section 6.3 | Restrictions: Must extract vault_secret from JWT (use jwt-decode or manual base64 decode); handle loading states properly; ensure clean unmount; do not store tokens in localStorage | \_Leverage: React useContext, useState, useEffect, Firebase onAuthStateChanged | Success: AuthContext provides all auth state and methods, vault_secret successfully extracted from JWT custom claims, proper loading states, clean auth state management | Instructions: After completing this task, mark it in-progress in tasks.md before starting, then log the implementation with the log-implementation tool including detailed artifacts (document context value interface in artifacts.components), and finally mark it as complete in tasks.md_

- [x] 2.4. Create vault initialization API endpoint

  - Files:
    - `src/pages/api/auth/init.ts`
  - Verify Firebase ID token
  - Generate or retrieve vault_secret custom claim
  - Return status: 'ready' or 'created'
  - _Leverage: Firebase Admin SDK, Node.js crypto_
  - _Requirements: Requirement 2 (Vault Secret Management)_
  - _Prompt: Implement the task for spec buildapp, first run spec-workflow-guide to get the workflow guide then implement the task: | Role: Backend Developer with expertise in Next.js API routes and Firebase custom claims | Task: Create src/pages/api/auth/init.ts that verifies idToken using firebase-admin, checks if vault_secret custom claim exists, if not generates 32-byte hex string using crypto.randomBytes(32).toString('hex') and sets custom claim using adminAuth.setCustomUserClaims(uid, { vault_secret }), returns { status: 'created' } or { status: 'ready' } as documented in PRD Section 6.4 | Restrictions: Must verify token before processing; use crypto.randomBytes for secure random; only generate once per user; return 401 for invalid token; never log vault_secret | \_Leverage: Firebase Admin setCustomUserClaims, crypto.randomBytes | \_Requirements: Requirement 2 | Success: API endpoint verifies tokens correctly, generates secure vault secrets, sets custom claims, returns appropriate status, handles errors with proper HTTP codes | Instructions: After completing this task, mark it in-progress in tasks.md before starting, then log the implementation with the log-implementation tool including detailed artifacts (document API endpoint in artifacts.apiEndpoints with method, path, purpose, request/response formats, location), and finally mark it as complete in tasks.md_

- [x] 2.5. Create login page
  - Files:
    - `src/pages/login.tsx`
  - Display Google Sign-In button and email/password form
  - Handle authentication flow and redirect
  - Call /api/auth/init after login
  - _Leverage: AuthContext, shadcn/ui components_
  - _Requirements: Requirement 1 (User Authentication)_
  - _Prompt: Implement the task for spec buildapp, first run spec-workflow-guide to get the workflow guide then implement the task: | Role: Full-stack Developer with expertise in Next.js pages and authentication flows | Task: Create src/pages/login.tsx with centered card showing Google Sign-In button and email/password form, use AuthContext for signInWithGoogle/signInWithEmail, redirect authenticated users to index, after successful login call /api/auth/init then force token refresh with auth.currentUser?.getIdToken(true), redirect to /, display privacy notice "All data is encrypted locally" as documented in PRD Section 12.1 | Restrictions: Must redirect if already authenticated; must call /api/auth/init and refresh token before redirect; use shadcn/ui Button, Card, Input components; show loading states | \_Leverage: AuthContext, shadcn/ui components, Next.js router | Success: Login page displays properly, Google and email/password auth work, vault initialization called, token refreshed, redirects to main page after successful login | Instructions: After completing this task, mark it in-progress in tasks.md before starting, then log the implementation with the log-implementation tool including detailed artifacts (document page component in artifacts.components), and finally mark it as complete in tasks.md_

## Phase 3: Encryption Layer

- [x] 3.1. Create crypto utilities

  - Files:
    - `src/lib/crypto.ts`
  - Implement deriveVaultKey using PBKDF2
  - Implement encryptData using AES-GCM
  - Implement decryptData using AES-GCM
  - Implement isValidPIN function
  - _Leverage: Web Crypto API_
  - _Requirements: Requirement 5 (Encryption and Decryption)_
  - _Prompt: Implement the task for spec buildapp, first run spec-workflow-guide to get the workflow guide then implement the task: | Role: Security Engineer with expertise in Web Crypto API and cryptographic operations | Task: Create src/lib/crypto.ts implementing deriveVaultKey(pin, vaultSecret) using PBKDF2 with 250k iterations, SHA-256, non-extractable AES-GCM 256-bit key; encryptData(key, data) generating random 12-byte IV, returning {iv, ciphertext} as Base64; decryptData(key, iv, ciphertext); isValidPIN(pin) validating 6-8 digits as documented in PRD Section 7.3 | Restrictions: MUST set extractable: false on derived key; MUST generate unique IV per encryption; MUST use crypto.getRandomValues for IV; no external crypto libraries; use browser Web Crypto API only | \_Leverage: Web Crypto API (crypto.subtle) | \_Requirements: Requirement 5 | Success: deriveVaultKey produces consistent results with same inputs, encryption generates unique ciphertexts with different IVs, decryption recovers original plaintext, wrong key fails decryption, isValidPIN validates correctly | Instructions: After completing this task, mark it in-progress in tasks.md before starting, then log the implementation with the log-implementation tool including detailed artifacts (document all functions in artifacts.functions with signatures, purpose, location), and finally mark it as complete in tasks.md_

- [x] 3.2. Create storage utilities

  - Files:
    - `src/lib/storage.ts`
  - Implement saveEncryptedNote using idb-keyval
  - Implement loadAllNotes with decryption
  - Implement deleteNote and purgeAllData
  - Implement runJanitor for 12-hour TTL
  - _Leverage: idb-keyval, crypto.ts_
  - _Requirements: Requirement 8 (Note Storage), Requirement 11 (Data TTL)_
  - _Prompt: Implement the task for spec buildapp, first run spec-workflow-guide to get the workflow guide then implement the task: | Role: Frontend Developer with expertise in IndexedDB and browser storage APIs | Task: Create src/lib/storage.ts implementing saveEncryptedNote(key, note) that encrypts DecryptedNote to JSON then encrypts, stores in IndexedDB array under key 'clinical_notes'; loadAllNotes(key) that loads array, decrypts each note, sorts by timestamp descending; deleteNote(noteId) that filters array; purgeAllData() that deletes IndexedDB database; runJanitor() that filters notes older than 12 hours as documented in PRD Section 7.4 | Restrictions: Use idb-keyval for IndexedDB operations; handle decryption errors gracefully; ensure atomic operations; do not lose data on errors | \_Leverage: idb-keyval (get/set), crypto.ts functions | \_Requirements: Requirements 8, 11 | Success: Notes save encrypted to IndexedDB, load and decrypt correctly, delete works, purge clears all data, janitor removes old notes, error handling prevents data corruption | Instructions: After completing this task, mark it in-progress in tasks.md before starting, then log the implementation with the log-implementation tool including detailed artifacts (document all functions in artifacts.functions), and finally mark it as complete in tasks.md_

- [x] 3.3. Create VaultContext provider
  - Files:
    - `src/context/VaultContext.tsx`
  - Manage vault key state and PIN operations
  - Implement unlock, lock, setupPIN functions
  - Integrate idle timer (15-minute timeout)
  - Integrate janitor (5-minute interval)
  - Track recording status to prevent idle lock
  - _Leverage: AuthContext, crypto.ts, storage.ts_
  - _Requirements: Requirements 3, 4, 10, 11, 12 (vault operations, session management)_
  - _Prompt: Implement the task for spec buildapp, first run spec-workflow-guide to get the workflow guide then implement the task: | Role: React Developer with expertise in complex state management and security patterns | Task: Create src/context/VaultContext.tsx managing vaultKey state, isLocked, isFirstTimeSetup, pinAttemptsRemaining (from localStorage 'scribevault_pin_attempts'), recordingStatus; implement unlock(pin) that derives key and tests decryption of first note, decrements attempts on failure, purges data after 5 failures; implement lock() clearing vaultKey; implement setupPIN(pin) deriving key; add idle timer (15 min) using event listeners (mousedown, keydown, scroll, touchstart) that locks vault when idle (unless recording/processing); run janitor on mount and every 5 minutes as documented in PRD Section 8 | Restrictions: Never store PIN or key in localStorage; only store attempt counter; respect recording/processing status for idle timeout; call purgeAllData and signOut after 5 failed attempts; reset attempts on successful unlock | \_Leverage: AuthContext for vaultSecret and signOut, crypto.ts, storage.ts, React hooks | \_Requirements: Requirements 3, 4, 10, 11, 12 | Success: Vault unlocks with correct PIN, locks with incorrect PIN, attempts counter works, 5 failures trigger purge, idle timeout works, recording prevents timeout, janitor runs periodically, first-time setup detected correctly | Instructions: After completing this task, mark it in-progress in tasks.md before starting, then log the implementation with the log-implementation tool including detailed artifacts (document context interface in artifacts.components, integration with auth in artifacts.integrations), and finally mark it as complete in tasks.md_

## Phase 4: UI Components - PIN Management

- [x] 4.1. Create PINOverlay component

  - Files:
    - `src/components/PINOverlay.tsx`
  - Full-screen overlay with PIN input
  - Display remaining attempts
  - Show warning when attempts < 3
  - _Leverage: VaultContext, shadcn/ui components_
  - _Requirements: Requirement 4 (Vault Unlocking)_
  - _Prompt: Implement the task for spec buildapp, first run spec-workflow-guide to get the workflow guide then implement the task: | Role: React Developer with expertise in UI components and forms | Task: Create src/components/PINOverlay.tsx as full-screen overlay (fixed position, blur/dark background) with centered card, PIN input with inputmode="numeric" for mobile numeric keyboard, display "X attempts remaining", show warning when attempts < 3, "Unlock" button calls VaultContext.unlock(pin), on failure show shake animation and clear input, on success overlay closes as documented in PRD Section 11.2 | Restrictions: Must use inputmode="numeric" for mobile; show attempts remaining; clear input on failure; implement shake animation on error; use full-screen overlay pattern | \_Leverage: VaultContext for unlock and pinAttemptsRemaining, shadcn/ui Card, Input, Button, Alert | \_Requirements: Requirement 4 | Success: Overlay displays properly full-screen, PIN input works with numeric keyboard on mobile, attempts counter shows correctly, warning appears when low, unlock succeeds/fails appropriately, shake animation on error | Instructions: After completing this task, mark it in-progress in tasks.md before starting, then log the implementation with the log-implementation tool including detailed artifacts (document component in artifacts.components with name, type, purpose, location, props), and finally mark it as complete in tasks.md_

- [x] 4.2. Create PINSetup component

  - Files:
    - `src/components/PINSetup.tsx`
  - PIN creation with confirmation
  - Validate PIN format (6-8 digits)
  - Show disclaimer about PIN not being stored
  - _Leverage: VaultContext, shadcn/ui components_
  - _Requirements: Requirement 3 (PIN Creation)_
  - _Prompt: Implement the task for spec buildapp, first run spec-workflow-guide to get the workflow guide then implement the task: | Role: React Developer with expertise in form validation and user onboarding | Task: Create src/components/PINSetup.tsx with welcome message, PIN input (6-8 digits) with inputmode="numeric", confirm PIN input, validate PINs match and are 6-8 digits using isValidPIN from crypto.ts, "Create PIN" button calls VaultContext.setupPIN(pin), show disclaimer "This PIN is never stored. If forgotten, all local data will be lost." as documented in PRD Section 11.3 | Restrictions: Must validate PIN format (6-8 digits); must confirm PIN matches; must show disclaimer; use inputmode="numeric"; disable submit until valid | \_Leverage: VaultContext.setupPIN, crypto.isValidPIN, shadcn/ui Input, Button, Card, Alert | \_Requirements: Requirement 3 | Success: Setup flow works correctly, PIN validation enforces 6-8 digits, confirmation validates match, disclaimer displayed, setupPIN called with valid PIN, transitions to unlocked state | Instructions: After completing this task, mark it in-progress in tasks.md before starting, then log the implementation with the log-implementation tool including detailed artifacts (document component in artifacts.components), and finally mark it as complete in tasks.md_

- [x] 4.3. Create Layout component
  - Files:
    - `src/components/Layout.tsx`
  - Header with app name and user info
  - Sign out button when authenticated
  - Consistent padding and max-width
  - _Leverage: AuthContext, shadcn/ui components_
  - _Requirements: UI layout requirements from PRD Section 11.1_
  - _Prompt: Implement the task for spec buildapp, first run spec-workflow-guide to get the workflow guide then implement the task: | Role: Frontend Developer with expertise in layout components and responsive design | Task: Create src/components/Layout.tsx with header showing "ScribeVault" app name, user email/name from AuthContext, sign out button (visible when authenticated) calling AuthContext.signOut, main content area with consistent padding (p-4) and max-width (max-w-4xl mx-auto), responsive design for mobile/desktop as documented in PRD Section 11.1 | Restrictions: Must show user info when authenticated; must provide sign out button; use responsive design (mobile-first); ensure proper spacing and max-width | \_Leverage: AuthContext for user and signOut, shadcn/ui Button | Success: Layout displays header with app name, shows user info when authenticated, sign out button works, content area properly padded and constrained, responsive on all screen sizes | Instructions: After completing this task, mark it in-progress in tasks.md before starting, then log the implementation with the log-implementation tool including detailed artifacts (document component in artifacts.components), and finally mark it as complete in tasks.md_

## Phase 5: Recording System

- [x] 5.1. Create useRecorder hook

  - Files:
    - `src/hooks/useRecorder.ts`
  - Manage MediaRecorder state
  - Track duration with 60-minute hard stop
  - Implement Wake Lock to prevent sleep
  - _Leverage: MediaRecorder API, Wake Lock API_
  - _Requirements: Requirement 6 (Audio Recording)_
  - _Prompt: Implement the task for spec buildapp, first run spec-workflow-guide to get the workflow guide then implement the task: | Role: Frontend Developer with expertise in Web APIs and media recording | Task: Create src/hooks/useRecorder.ts implementing startRecording() that requests microphone access with navigator.mediaDevices.getUserMedia, creates MediaRecorder with audio/webm;codecs=opus, starts recording, starts duration timer (increment every second), acquires Wake Lock if supported; stopRecording() that stops MediaRecorder and returns Blob; implement 60-minute hard stop using setTimeout, display remaining time (60min - duration) as documented in PRD Section 9 | Restrictions: Handle microphone permission denial gracefully; use audio/webm;codecs=opus format; implement 60-minute timeout; Wake Lock is optional (graceful degradation); track duration accurately | \_Leverage: MediaRecorder API, Wake Lock API, React hooks (useState, useEffect, useRef) | \_Requirements: Requirement 6 | Success: Recording starts successfully, microphone access requested, duration tracked accurately, 60-minute limit enforced with auto-stop, Wake Lock prevents sleep (if supported), stopRecording returns valid audio Blob | Instructions: After completing this task, mark it in-progress in tasks.md before starting, then log the implementation with the log-implementation tool including detailed artifacts (document hook interface in artifacts.functions), and finally mark it as complete in tasks.md_

- [x] 5.2. Initialize Groq SDK

  - Files:
    - `src/lib/groq.ts`
  - Initialize Groq client with API key
  - Define SOAP_SYSTEM_PROMPT constant
  - _Leverage: Groq SDK_
  - _Requirements: Requirement 7 (Transcription)_
  - _Prompt: Implement the task for spec buildapp, first run spec-workflow-guide to get the workflow guide then implement the task: | Role: Backend Developer with expertise in API client initialization | Task: Create src/lib/groq.ts initializing Groq client with GROQ_API_KEY environment variable, export groq client instance, define and export SOAP_SYSTEM_PROMPT constant with exact prompt from PRD Section 10.3 (Senior Medical Scribe with formatting instructions for SOAP notes) | Restrictions: Use GROQ_API_KEY from env; do not hardcode API key; export both groq client and SOAP_SYSTEM_PROMPT | \_Leverage: Groq SDK initialization | \_Requirements: Requirement 7 | Success: Groq client initialized properly, SOAP_SYSTEM_PROMPT matches PRD specification exactly, both exports available for use in API routes | Instructions: After completing this task, mark it in-progress in tasks.md before starting, then log the implementation with the log-implementation tool including detailed artifacts (document exports in artifacts.functions), and finally mark it as complete in tasks.md_

- [x] 5.3. Create scribe API endpoint

  - Files:
    - `src/pages/api/scribe.ts`
  - Verify Firebase token
  - Transcribe audio with Groq Whisper
  - Format SOAP note with Groq Llama
  - _Leverage: Firebase Admin, Groq SDK_
  - _Requirements: Requirement 7 (Transcription), Requirement 13 (Server Security)_
  - _Prompt: Implement the task for spec buildapp, first run spec-workflow-guide to get the workflow guide then implement the task: | Role: Full-stack Developer with expertise in Next.js API routes and multipart form handling | Task: Create src/pages/api/scribe.ts accepting POST with multipart/form-data (audio file, idToken), verify idToken with firebase-admin, transcribe audio using groq.audio.transcriptions.create with whisper-large-v3-turbo model, format transcript into SOAP note using groq.chat.completions.create with llama-3.3-70b-versatile model and SOAP_SYSTEM_PROMPT, return {transcript, soapNote} as documented in PRD Section 10 | Restrictions: MUST verify token before processing; MUST NOT log PHI (transcripts, notes); MUST NOT write to filesystem; use stateless processing only; return 401 for invalid token; handle multipart form data properly | \_Leverage: Firebase adminAuth.verifyIdToken, Groq SDK for transcription and completion, Next.js API route patterns | \_Requirements: Requirements 7, 13 | Success: Token verification works, audio transcription successful with Whisper, SOAP note formatting works with Llama, no PHI logged, stateless processing, proper error handling with HTTP codes | Instructions: After completing this task, mark it in-progress in tasks.md before starting, then log the implementation with the log-implementation tool including detailed artifacts (document API endpoint in artifacts.apiEndpoints with full details, document integration in artifacts.integrations showing Groq API flow), and finally mark it as complete in tasks.md_

- [x] 5.4. Create Recorder component
  - Files:
    - `src/components/Recorder.tsx`
  - Display recording UI with visual states
  - Handle start/stop recording
  - Upload audio and process response
  - Save encrypted note to IndexedDB
  - _Leverage: useRecorder hook, VaultContext, storage.ts_
  - _Requirements: Requirement 6 (Recording), Requirement 7 (Transcription), Requirement 8 (Storage)_
  - _Prompt: Implement the task for spec buildapp, first run spec-workflow-guide to get the workflow guide then implement the task: | Role: React Developer with expertise in complex UI interactions and API integration | Task: Create src/components/Recorder.tsx using useRecorder hook, display states: idle (microphone button "Tap to Record"), recording (pulsing red indicator, waveform animation, timer, "Stop" button), processing (spinner, "Transcribing..." then "Generating SOAP note..."), complete (checkmark, "Note saved"), error (error icon, message, "Try Again"); on stop, upload audio to /api/scribe with idToken from AuthContext, on success encrypt and save note using VaultContext.vaultKey and storage.saveEncryptedNote, generate UUID for note id as documented in PRD Section 11.4 | Restrictions: Show all visual states clearly; handle errors gracefully with retry; generate unique note IDs (use uuid package); save encrypted to IndexedDB; display processing status messages; update VaultContext.recordingStatus during recording/processing | \_Leverage: useRecorder hook, VaultContext for vaultKey and recordingStatus, AuthContext for idToken, storage.saveEncryptedNote, uuid for ID generation, shadcn/ui Button, Spinner | \_Requirements: Requirements 6, 7, 8 | Success: Recording starts/stops correctly, visual states display properly, audio uploads to API, transcription and SOAP note received, note encrypted and saved to IndexedDB, errors handled with retry option, recording status prevents idle timeout | Instructions: After completing this task, mark it in-progress in tasks.md before starting, then log the implementation with the log-implementation tool including detailed artifacts (document component in artifacts.components, document API integration in artifacts.integrations showing Recorder -> /api/scribe flow), and finally mark it as complete in tasks.md_

## Phase 6: Notes Management

- [x] 6.1. Create useNotes hook

  - Files:
    - `src/hooks/useNotes.ts`
  - Load notes from IndexedDB with decryption
  - Provide delete note function
  - Handle decryption errors gracefully
  - _Leverage: VaultContext, storage.ts_
  - _Requirements: Requirement 9 (Note Management)_
  - _Prompt: Implement the task for spec buildapp, first run spec-workflow-guide to get the workflow guide then implement the task: | Role: React Developer with expertise in custom hooks and data management | Task: Create src/hooks/useNotes.ts providing notes state (DecryptedNote[]), loading state, loadNotes() function calling storage.loadAllNotes with VaultContext.vaultKey, deleteNote(id) calling storage.deleteNote, error state for handling decryption failures, auto-load notes when vaultKey becomes available, handle individual note decryption errors without failing entire load | Restrictions: Depend on VaultContext.vaultKey; handle decryption errors per-note; provide loading states; auto-reload when vaultKey changes | \_Leverage: VaultContext.vaultKey, storage.ts functions (loadAllNotes, deleteNote), React hooks (useState, useEffect, useCallback) | \_Requirements: Requirement 9 | Success: Notes load automatically when vault unlocked, decryption errors handled gracefully per-note, delete function works, loading states managed properly, re-loads on vaultKey change | Instructions: After completing this task, mark it in-progress in tasks.md before starting, then log the implementation with the log-implementation tool including detailed artifacts (document hook interface in artifacts.functions), and finally mark it as complete in tasks.md_

- [x] 6.2. Create NoteCard component

  - Files:
    - `src/components/NoteCard.tsx`
  - Display note with formatted timestamp and duration
  - Expand/collapse functionality
  - Copy SOAP note and transcript to clipboard
  - Delete confirmation with modal
  - _Leverage: shadcn/ui components_
  - _Requirements: Requirement 9 (Note Display)_
  - _Prompt: Implement the task for spec buildapp, first run spec-workflow-guide to get the workflow guide then implement the task: | Role: React Developer with expertise in UI components and user interactions | Task: Create src/components/NoteCard.tsx displaying note with timestamp formatted as "Jan 8, 2026 at 3:45 PM", duration as "12 min 34 sec", SOAP note preview (first 150 chars), expand/collapse toggle; expanded view shows full SOAP note with formatting, original transcript (collapsed by default), "Copy SOAP Note" button, "Copy Transcript" button, when copied show modal asking "Ready to delete?", "Secure Delete" button with confirmation dialog as documented in PRD Section 11.5 | Restrictions: Format timestamp correctly; format duration as min/sec; show preview then full note; implement copy to clipboard; show delete confirmation modal after copy; use shadcn/ui Dialog for modals | \_Leverage: shadcn/ui Card, Button, Dialog, Collapsible components, clipboard API (navigator.clipboard.writeText) | \_Requirements: Requirement 9 | Success: Note displays properly, timestamp and duration formatted correctly, expand/collapse works, copy buttons work and show modal, delete confirmation dialog works, all interactions smooth and intuitive | Instructions: After completing this task, mark it in-progress in tasks.md before starting, then log the implementation with the log-implementation tool including detailed artifacts (document component in artifacts.components with props interface), and finally mark it as complete in tasks.md_

- [x] 6.3. Create NotesList component
  - Files:
    - `src/components/NotesList.tsx`
  - Display list of NoteCard components
  - Show empty state when no notes
  - Display "All notes deleted after 12 hours" message
  - _Leverage: NoteCard component, useNotes hook_
  - _Requirements: Requirement 9 (Note Display), Requirement 11 (TTL notice)_
  - _Prompt: Implement the task for spec buildapp, first run spec-workflow-guide to get the workflow guide then implement the task: | Role: React Developer with expertise in list rendering and state management | Task: Create src/components/NotesList.tsx using useNotes hook, map notes to NoteCard components passing note and onDelete callback, show empty state "No notes yet. Record your first encounter." when notes array is empty, display notice "All notes are automatically deleted 12 hours after creation" at top of list, show loading state while notes are loading | Restrictions: Handle empty state; show TTL notice; display loading state; pass delete callback to NoteCard; maintain proper spacing between cards | \_Leverage: useNotes hook, NoteCard component, shadcn/ui Alert for notice | \_Requirements: Requirements 9, 11 | Success: Notes list displays all notes sorted by timestamp, empty state shows when no notes, TTL notice displayed, delete functionality works through callback, loading state shown appropriately | Instructions: After completing this task, mark it in-progress in tasks.md before starting, then log the implementation with the log-implementation tool including detailed artifacts (document component in artifacts.components), and finally mark it as complete in tasks.md_

## Phase 7: Session Management

- [x] 7.1. Create SessionTimer component
  - Files:
    - `src/components/SessionTimer.tsx`
  - Display time until auto-lock when idle
  - Display elapsed/remaining time when recording
  - Show warning color when < 2 minutes to lock
  - _Leverage: VaultContext_
  - _Requirements: Requirement 10 (Session Management)_
  - _Prompt: Implement the task for spec buildapp, first run spec-workflow-guide to get the workflow guide then implement the task: | Role: React Developer with expertise in timers and visual feedback | Task: Create src/components/SessionTimer.tsx that displays "Session locks in 12:45" countdown when idle (using idle timer from VaultContext), shows "05:32 / 60:00" elapsed/total when recording (from VaultContext.recordingStatus), shows warning color (red/orange) when less than 2 minutes until lock, progress bar for recording, hidden when processing/complete as documented in PRD Section 11.7 | Restrictions: Update every second for accuracy; show warning color when < 2 min; hide during processing; show progress bar when recording; format time as MM:SS | \_Leverage: VaultContext for idle timer and recordingStatus, React hooks for interval updates | \_Requirements: Requirement 10 | Success: Timer displays correctly for idle and recording states, countdown accurate, warning color appears at < 2 min, progress bar shows during recording, updates smoothly every second | Instructions: After completing this task, mark it in-progress in tasks.md before starting, then log the implementation with the log-implementation tool including detailed artifacts (document component in artifacts.components), and finally mark it as complete in tasks.md_

## Phase 8: Main Application Pages

- [x] 8.1. Update \_app.tsx with providers

  - Files:
    - `src/pages/_app.tsx`
  - Wrap app with AuthProvider and VaultProvider
  - Add any necessary global styles or setup
  - _Leverage: AuthContext, VaultContext_
  - _Requirements: Application structure_
  - _Prompt: Implement the task for spec buildapp, first run spec-workflow-guide to get the workflow guide then implement the task: | Role: Next.js Developer with expertise in app structure and providers | Task: Update src/pages/\_app.tsx to wrap Component with AuthProvider (outer) and VaultProvider (inner) in correct order (AuthProvider wraps VaultProvider since VaultProvider depends on AuthContext), import global styles, add Toaster from shadcn/ui for notifications, ensure proper provider nesting | Restrictions: AuthProvider must wrap VaultProvider (outer to inner); import and apply global styles; add Toaster for toast notifications; maintain Next.js App component structure | \_Leverage: AuthContext, VaultContext, shadcn/ui Toaster, Next.js App component pattern | Success: Providers properly nested, AuthContext available to VaultContext, global styles applied, Toaster available for notifications throughout app | Instructions: After completing this task, mark it in-progress in tasks.md before starting, then log the implementation with the log-implementation tool including detailed artifacts (document integration in artifacts.integrations showing provider hierarchy), and finally mark it as complete in tasks.md_

- [x] 8.2. Create main index page
  - Files:
    - `src/pages/index.tsx`
  - Implement auth guard (redirect to login if not authenticated)
  - Show PINOverlay when locked
  - Show PINSetup when first time
  - Display Recorder and NotesList when unlocked
  - _Leverage: All contexts and components_
  - _Requirements: All UI requirements from PRD Section 12.2_
  - _Prompt: Implement the task for spec buildapp, first run spec-workflow-guide to get the workflow guide then implement the task: | Role: Full-stack Developer with expertise in Next.js pages and complex UI flows | Task: Create src/pages/index.tsx that redirects to /login if not authenticated (use AuthContext), shows PINOverlay when VaultContext.isLocked && !isFirstTimeSetup, shows PINSetup when isFirstTimeSetup, when unlocked displays Layout with Recorder component and NotesList component in vertical layout with spacing, shows SessionTimer, implements complete application layout from PRD Section 12.2 | Restrictions: Must implement auth guard first; show appropriate UI based on vault state (locked/setup/unlocked); use Layout component; ensure responsive design; show SessionTimer when unlocked | \_Leverage: AuthContext, VaultContext, Layout, PINOverlay, PINSetup, Recorder, NotesList, SessionTimer components, Next.js router for redirects | Success: Auth guard redirects unauthenticated users, PIN flows work correctly (overlay and setup), main app displays when unlocked, recorder and notes list functional, session timer visible, complete user journey works end-to-end | Instructions: After completing this task, mark it in-progress in tasks.md before starting, then log the implementation with the log-implementation tool including detailed artifacts (document page component in artifacts.components, document complete user flow in artifacts.integrations), and finally mark it as complete in tasks.md_

## Phase 9: Configuration and Deployment

- [x] 9.1. Configure Next.js for production

  - Files:
    - `next.config.js`
  - Set output: 'standalone'
  - Add security headers (CSP, X-Frame-Options, etc.)
  - Configure compression and optimizations
  - _Leverage: Next.js configuration_
  - _Requirements: Production readiness_
  - _Prompt: Implement the task for spec buildapp, first run spec-workflow-guide to get the workflow guide then implement the task: | Role: DevOps Engineer with expertise in Next.js production configuration and security | Task: Update next.config.js with output: 'standalone', reactStrictMode: true, compress: true, poweredByHeader: false, add async headers() function returning security headers: X-Frame-Options: DENY, X-Content-Type-Options: nosniff, Strict-Transport-Security: max-age=31536000, Content-Security-Policy with appropriate directives for Firebase and Groq domains as documented in design document deployment section | Restrictions: Must use standalone output; must include all security headers; CSP must allow Firebase and Groq domains; compress must be enabled; no powered-by header | \_Leverage: Next.js configuration patterns, security best practices | Success: next.config.js configured for production, security headers properly set, CSP allows required domains, standalone build enabled, all optimizations active | Instructions: After completing this task, mark it in-progress in tasks.md before starting, then log the implementation with the log-implementation tool including detailed artifacts, and finally mark it as complete in tasks.md_

- [x] 9.2. Create Dockerfile

  - Files:
    - `Dockerfile`
  - Multi-stage build (builder + runner)
  - Copy standalone output
  - Expose port 3000
  - _Leverage: Docker best practices_
  - _Requirements: Deployment requirements_
  - _Prompt: Implement the task for spec buildapp, first run spec-workflow-guide to get the workflow guide then implement the task: | Role: DevOps Engineer with expertise in Docker and containerization | Task: Create Dockerfile with multi-stage build: builder stage (node:20-alpine, npm ci, npm run build), runner stage (node:20-alpine, copy standalone output from builder, copy .next/static and public, set NODE_ENV=production, expose 3000, CMD node server.js) as documented in PRD Section 16.1 | Restrictions: Must use multi-stage build for optimization; must use node:20-alpine; must copy standalone output; set NODE_ENV=production in runner; expose port 3000 only | \_Leverage: Docker multi-stage builds, Next.js standalone output | Success: Dockerfile builds successfully, image size optimized with multi-stage, standalone output copied correctly, container runs on port 3000, production environment set | Instructions: After completing this task, mark it in-progress in tasks.md before starting, then log the implementation with the log-implementation tool including detailed artifacts, and finally mark it as complete in tasks.md_

- [x] 9.3. Create comprehensive README
  - Files:
    - `README.md`
  - Document setup instructions
  - Explain environment variables
  - Provide development and build commands
  - Document security features and HIPAA compliance
  - _Leverage: Project documentation_
  - _Requirements: Documentation requirements_
  - _Prompt: Implement the task for spec buildapp, first run spec-workflow-guide to get the workflow guide then implement the task: | Role: Technical Writer with expertise in developer documentation | Task: Create comprehensive README.md with sections: Project Overview (ScribeVault HIPAA-compliant app), Features (zero-knowledge encryption, etc.), Setup Instructions (dependencies, env vars from .env.example, Firebase and Groq setup notes), Development (npm run dev), Build (npm run build, npm start), Deployment (Docker instructions), Security Features (encryption, session management, TTL), HIPAA Compliance notes (BAA requirements, no PHI logging), Architecture overview | Restrictions: Must be clear and comprehensive; include all setup steps; document all environment variables; explain security features; mention HIPAA compliance requirements; provide all necessary commands | \_Leverage: PRD content, design document | Success: README provides complete setup guide, all environment variables documented, security and compliance clearly explained, easy for new developers to understand and set up | Instructions: After completing this task, mark it in-progress in tasks.md before starting, then log the implementation with the log-implementation tool including detailed artifacts, and finally mark it as complete in tasks.md_

## Phase 10: Testing and Quality Assurance

- [ ] 10.1. Test complete user flow end-to-end

  - Files:
    - Manual testing (no new files)
  - Test first-time user: login → PIN setup → record → view note → delete
  - Test returning user: login → unlock → record → view notes
  - Test error scenarios: wrong PIN, microphone denial, network errors
  - Test session management: idle timeout, recording timeout
  - _Leverage: All implemented features_
  - _Requirements: All requirements_
  - _Prompt: Implement the task for spec buildapp, first run spec-workflow-guide to get the workflow guide then implement the task: | Role: QA Engineer with expertise in manual testing and user acceptance testing | Task: Perform comprehensive manual testing covering: 1) First-time user flow (login with Google/email, /api/auth/init called, token refreshed, PIN setup 6-8 digits, record audio, verify transcription and SOAP note, verify encryption and IndexedDB storage, copy and delete note), 2) Returning user flow (login, PIN overlay, unlock with correct/incorrect PINs, view existing notes, record new note), 3) Error scenarios (wrong PIN 5 times triggers purge, microphone access denied shows error, network failure retries), 4) Session management (15-min idle timeout locks vault, recording prevents timeout, 60-min recording auto-stops), 5) Data lifecycle (12-hour janitor deletes old notes), 6) Mobile testing (iOS Safari, Android Chrome) | Restrictions: Test on multiple browsers (Chrome, Safari, Firefox, Edge); test on mobile devices; verify no PHI in console or network tab; test all error scenarios; verify encryption in IndexedDB (data should be encrypted Base64 strings) | \_Leverage: Browser DevTools, multiple devices/browsers | Success: All user flows work end-to-end, error scenarios handled gracefully, session management works correctly, data encrypted in IndexedDB, no PHI visible in logs or network, mobile experience smooth, all acceptance criteria from requirements met | Instructions: After completing this task, mark it in-progress in tasks.md before starting, document all findings and issues, create bug reports for any issues found, then log the implementation with the log-implementation tool including statistics about tests performed and issues found, and finally mark it as complete in tasks.md_

- [ ] 10.2. Security audit and verification

  - Files:
    - Security checklist documentation
  - Verify encryption implementation (non-extractable keys, unique IVs)
  - Verify no PHI logging in console or network
  - Verify token verification on all API routes
  - Test brute force protection (5 attempts)
  - Verify data purge and session management
  - _Leverage: Security requirements_
  - _Requirements: Requirements 5, 12, 13, 14 (security requirements)_
  - _Prompt: Implement the task for spec buildapp, first run spec-workflow-guide to get the workflow guide then implement the task: | Role: Security Engineer with expertise in web application security and HIPAA compliance | Task: Perform comprehensive security audit: 1) Verify vault key has extractable: false in Web Crypto API, 2) Verify unique IV generated per encryption (inspect IndexedDB, check different IVs), 3) Verify no PHI in console.log statements (search codebase for console.log in API routes), 4) Verify no PHI in network tab (check /api/scribe request/response), 5) Test brute force protection (5 wrong PINs triggers purgeAllData), 6) Verify token verification on all API routes (test with invalid token), 7) Test stateless processing (no filesystem writes in API routes), 8) Verify session security (browserSessionPersistence, idle timeout), 9) Test data isolation (different users can't decrypt each other's notes) | Restrictions: Must verify all security requirements from PRD Section 13; must check for PHI leakage in logs and network; must test authentication on all API routes; verify encryption best practices | \_Leverage: Browser DevTools, IndexedDB inspector, Network tab, security testing tools | Success: All security requirements verified, encryption properly implemented with non-extractable keys and unique IVs, no PHI logged anywhere, all API routes protected, brute force protection works, data isolation confirmed, session management secure | Instructions: After completing this task, mark it in-progress in tasks.md before starting, document all security findings in a checklist, address any security issues found, then log the implementation with the log-implementation tool including detailed security verification results, and finally mark it as complete in tasks.md_

- [ ] 10.3. Fix any bugs and polish UI/UX
  - Files:
    - Various files based on issues found
  - Address any bugs found during testing
  - Polish UI for better user experience
  - Ensure responsive design works on all devices
  - Add loading states where missing
  - Improve error messages for clarity
  - _Leverage: Testing feedback_
  - _Requirements: Usability requirements_
  - _Prompt: Implement the task for spec buildapp, first run spec-workflow-guide to get the workflow guide then implement the task: | Role: Senior Developer with expertise in bug fixing and UX polish | Task: Based on testing feedback from tasks 10.1 and 10.2, fix all identified bugs, polish UI/UX including: ensure all loading states are smooth and clear, improve error messages to be user-friendly and actionable, verify responsive design on all screen sizes (mobile, tablet, desktop), add appropriate transitions and animations where beneficial, ensure accessibility (keyboard navigation, screen reader support), optimize performance (minimize re-renders, optimize images), ensure consistent styling throughout app, add helpful tooltips or hints where needed | Restrictions: Do not break existing functionality; maintain security requirements; ensure all changes improve UX without compromising security; test thoroughly after each fix | \_Leverage: Testing feedback, user experience best practices, accessibility guidelines | Success: All bugs fixed, UI polished and consistent, responsive design verified on all devices, loading states clear, error messages helpful, accessibility improved, performance optimized, overall user experience smooth and professional | Instructions: After completing this task, mark it in-progress in tasks.md before starting, track all fixes and improvements made, then log the implementation with the log-implementation tool including detailed artifacts about fixes and improvements, and finally mark it as complete in tasks.md_

[ ] 11 - Add WebAuthn as an optional way for the user to replace pin, and use that to encreypt locally
