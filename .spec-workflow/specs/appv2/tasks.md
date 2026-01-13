# Tasks Document - AppV2 Vault Secret Architecture Update

**Note:** For comprehensive implementation details and code examples, refer to `/Users/treyhuffine/hipaa-notetaker/prd2.md`.

## Phase 1: New Infrastructure

- [x] 1. Update constants and create Firestore client
  - Files: src/lib/constants.ts, src/lib/firestore.ts
  - Update constants.ts: Add VAULT_SECRET_LENGTH = 64, update PBKDF2_ITERATIONS to 100000, remove PIN_CONFIG
  - Create firestore.ts: Initialize and export Firestore client using existing Firebase app
  - Purpose: Establish foundation for Firestore-based vault secret storage
  - _Leverage: src/lib/firebase-client.ts (existing Firebase app)_
  - _Requirements: 1.1, 1.10_
  - _Prompt: **Implement the task for spec appv2, first run spec-workflow-guide to get the workflow guide then implement the task:**

    **Role:** Backend Infrastructure Developer specializing in Firebase and TypeScript configuration

    **Task:** Update constants.ts to add VAULT_SECRET_LENGTH = 64, change PBKDF2_ITERATIONS from 250000 to 100000, and remove PIN_CONFIG entirely (including MIN_LENGTH, MAX_LENGTH). Also remove MAX_PIN_ATTEMPTS from SESSION_CONFIG. Create new file src/lib/firestore.ts that imports getFirestore from 'firebase/firestore', imports the existing app from './firebase-client', and exports the initialized Firestore client as 'db'. Reference prd2.md sections 3 (Constants) and 4.1 (Firestore Client Setup) for exact implementation details.

    **Restrictions:** Do not modify any other constants in SESSION_CONFIG or CRYPTO_CONFIG except PBKDF2_ITERATIONS. Do not change the Firebase app initialization in firebase-client.ts. Do not add any Firestore operations yet, only client initialization.

    **Success:** constants.ts has VAULT_SECRET_LENGTH = 64, PBKDF2_ITERATIONS = 100000, PIN_CONFIG removed entirely, MAX_PIN_ATTEMPTS removed from SESSION_CONFIG. firestore.ts exports a working Firestore client 'db'. TypeScript compiles without errors. No runtime errors when importing these modules.

    **After completing this task:** Mark task 1 as in-progress in tasks.md before starting. When complete, use the log-implementation tool to record implementation details with comprehensive artifacts (functions, exports, changes), then mark task 1 as complete [x] in tasks.md.

- [x] 2. Create vault secret utilities
  - File: src/lib/vault.ts
  - Implement generateVaultSecret() using crypto.getRandomValues() with URL-safe Base64 charset (64 chars)
  - Implement getOrCreateVaultSecret(uid: string) to fetch or create vault secret in Firestore
  - Purpose: Manage vault secret generation and Firestore CRUD operations
  - _Leverage: src/lib/firestore.ts (Firestore client), src/lib/constants.ts (VAULT_SECRET_LENGTH)_
  - _Requirements: 1.1_
  - _Prompt: **Implement the task for spec appv2, first run spec-workflow-guide to get the workflow guide then implement the task:**

    **Role:** Security Engineer specializing in cryptographic key generation and Firebase Firestore

    **Task:** Create src/lib/vault.ts implementing the vault secret utilities. Reference prd2.md section 4.2 (Vault Secret Utilities) for exact implementation. The module must export getOrCreateVaultSecret(uid: string): Promise<string> which: (1) fetches the vault secret from Firestore at /users/{uid}/vault/secret, (2) if it exists, returns docSnap.data().vaultSecret, (3) if it doesn't exist, generates a new 64-character vault secret using the URL-safe Base64 charset 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_', (4) saves it to Firestore with createdAt: serverTimestamp(), (5) returns the vault secret. Use crypto.getRandomValues() for random generation with zero modulo bias (256 / 64 = 4).

    **Restrictions:** Must use crypto.getRandomValues() for random generation, not Math.random(). Must use the exact 64-character charset specified. Must use Firestore serverTimestamp() for createdAt. Must handle Firestore errors gracefully. Do not add any other Firestore operations beyond get and set.

    **Success:** vault.ts exports getOrCreateVaultSecret(uid: string): Promise<string>. Function generates cryptographically secure 64-character vault secrets. Function correctly fetches existing secrets from Firestore. Function creates new secrets in Firestore when none exist. Generated secrets use only the specified charset. TypeScript compiles without errors.

    **After completing this task:** Mark task 2 as in-progress in tasks.md before starting. When complete, use the log-implementation tool to record implementation details with comprehensive artifacts (functions exported, Firestore operations, integration patterns), then mark task 2 as complete [x] in tasks.md.

- [x] 3. Deploy Firestore security rules
  - File: firestore.rules (create in project root)
  - Create Firestore security rules file with immutable vault secret rules
  - Document deployment instructions for manual deployment via Firebase console
  - Purpose: Enforce vault secret immutability and per-user access control
  - _Leverage: None (new configuration)_
  - _Requirements: 1.1_
  - _Prompt: **Implement the task for spec appv2, first run spec-workflow-guide to get the workflow guide then implement the task:**

    **Role:** Firebase Security Specialist with expertise in Firestore security rules

    **Task:** Create firestore.rules file in project root with security rules from prd2.md section 1.2 (Security Rules). Rules must: (1) allow read of /users/{userId}/vault/secret only if authenticated and auth.uid == userId, (2) allow create only if authenticated, auth.uid == userId, and document doesn't exist yet (using !exists() check), (3) deny all update and delete operations (allow update, delete: if false), (4) deny all other collections (default deny). Add comments in the file explaining each rule. Create a DEPLOYMENT.md file documenting how to deploy these rules via Firebase console: firebase deploy --only firestore:rules.

    **Restrictions:** Must use Firestore security rules version 2. Must ensure vault secret cannot be updated or deleted after creation. Must enforce per-user isolation (users can only access their own vault secret). Do not allow public read/write access anywhere.

    **Success:** firestore.rules file exists with correct security rules matching prd2.md section 1.2. Rules enforce read-only after creation. Rules enforce per-user isolation. DEPLOYMENT.md documents deployment process. Rules syntax is valid (can be validated with firebase tools).

    **After completing this task:** Mark task 3 as in-progress in tasks.md before starting. When complete, use the log-implementation tool to record implementation details (include the security rules content as artifact documentation, deployment instructions), then mark task 3 as complete [x] in tasks.md.

## Phase 2: Crypto Layer Update

- [x] 4. Update crypto utilities to remove PIN dependency
  - File: src/lib/crypto.ts
  - Remove pin parameter from deriveVaultKey(), use vault secret as both material and salt
  - Remove isValidPIN() function entirely
  - Update PBKDF2 to use 100,000 iterations (already updated in constants)
  - Purpose: Simplify key derivation by removing PIN from the process
  - _Leverage: src/lib/constants.ts (CRYPTO_CONFIG)_
  - _Requirements: 1.6_
  - _Prompt: **Implement the task for spec appv2, first run spec-workflow-guide to get the workflow guide then implement the task:**

    **Role:** Cryptography Developer with expertise in Web Crypto API and PBKDF2 key derivation

    **Task:** Update src/lib/crypto.ts deriveVaultKey() function. Reference prd2.md section 4.3 (Crypto Utilities). Change function signature from deriveVaultKey(pin: string, vaultSecret: string) to deriveVaultKey(vaultSecret: string). Use vaultSecret as both the key material (importKey from vaultSecret) and the salt (encoder.encode(vaultSecret)). Keep all other crypto parameters the same (PBKDF2, iterations from CRYPTO_CONFIG.PBKDF2_ITERATIONS which is now 100000, SHA-256 hash, AES-GCM 256-bit, non-extractable). Remove the isValidPIN() function entirely. Do not modify encryptData() or decryptData() functions.

    **Restrictions:** Do not change encryptData() or decryptData() functions. Do not change crypto algorithm (must remain AES-GCM). Do not change IV length or key length. Do not make key extractable. Must use vaultSecret as both key material and salt (this is intentional for simplified architecture).

    **Success:** deriveVaultKey(vaultSecret: string): Promise<CryptoKey> function signature updated. Function uses vaultSecret as both material and salt. isValidPIN() function removed. PBKDF2 uses 100,000 iterations. Key remains non-extractable AES-256-GCM. TypeScript compiles without errors. Function produces valid CryptoKey for encryption/decryption.

    **After completing this task:** Mark task 4 as in-progress in tasks.md before starting. When complete, use the log-implementation tool to record implementation details with comprehensive artifacts (function signature changes, removed functions, cryptographic parameters), then mark task 4 as complete [x] in tasks.md.

- [x] 5. Update storage utilities to match new encryption interface
  - File: src/lib/storage.ts
  - Update function signatures and implementations to remove direct encryption from saveEncryptedNote
  - Update saveEncryptedNote to accept EncryptedNote instead of performing encryption
  - Ensure loadAllNotes, deleteNote, purgeAllData, runJanitor remain compatible
  - Purpose: Align storage layer with new encryption interface where encryption happens at call site
  - _Leverage: src/lib/crypto.ts (updated), idb-keyval_
  - _Requirements: 1.7_
  - _Prompt: **Implement the task for spec appv2, first run spec-workflow-guide to get the workflow guide then implement the task:**

    **Role:** Data Layer Developer specializing in IndexedDB and storage patterns

    **Task:** Update src/lib/storage.ts to align with new encryption interface. Reference prd2.md section 4.4 (Storage Utilities). Change saveEncryptedNote(note: EncryptedNote): Promise<void> to accept EncryptedNote directly instead of encrypting. The function should: (1) get existing notes from IndexedDB, (2) append the new note, (3) save back to IndexedDB. Remove the encryption logic from this function (it now happens at call site). Keep loadAllNotes(key: CryptoKey): Promise<DecryptedNote[]>, deleteNote(noteId: string): Promise<void>, purgeAllData(): Promise<void>, and runJanitor(): Promise<number> unchanged. Update localStorage cleanup in purgeAllData to remove 'scribevault_pin_attempts' if it exists.

    **Restrictions:** Do not modify loadAllNotes, deleteNote, or runJanitor logic (they work correctly as-is). Do not change IndexedDB key name 'clinical_notes'. Do not modify EncryptedNote or DecryptedNote interfaces. Must maintain backward compatibility with existing encrypted notes in IndexedDB.

    **Success:** saveEncryptedNote accepts EncryptedNote directly and no longer performs encryption. loadAllNotes, deleteNote, purgeAllData, runJanitor remain unchanged and functional. purgeAllData removes 'scribevault_pin_attempts' from localStorage. TypeScript compiles without errors. All storage operations work correctly with new interface.

    **After completing this task:** Mark task 5 as in-progress in tasks.md before starting. When complete, use the log-implementation tool to record implementation details with comprehensive artifacts (function signature changes, removed logic, localStorage cleanup additions), then mark task 5 as complete [x] in tasks.md.

## Phase 3: Context Updates

- [x] 6. Replace VaultContext with simplified version
  - File: src/context/VaultContext.tsx
  - Replace entire VaultContext implementation removing all PIN logic
  - Implement initializeVault() to fetch vault secret from Firestore and derive key
  - Implement lock() to clear secrets from memory
  - Add getVaultSecretForRecording() and setRecordingInProgress() for closure pattern
  - Add idle timeout logic that respects recording state
  - Purpose: Simplify vault management by removing PIN authentication
  - _Leverage: src/lib/vault.ts, src/lib/crypto.ts, src/context/AuthContext.tsx, src/lib/constants.ts_
  - _Requirements: 1.3, 1.4, 1.5, 1.10_
  - _Prompt: **Implement the task for spec appv2, first run spec-workflow-guide to get the workflow guide then implement the task:**

    **Role:** React Context Developer specializing in state management and session handling

    **Task:** Replace src/context/VaultContext.tsx with new implementation from prd2.md section 4.5 (Vault Context). The new VaultContext must: (1) manage vaultKey, vaultSecret, isLocked, isLoading state, (2) implement initializeVault() that calls getOrCreateVaultSecret(user.uid) from vault.ts and deriveVaultKey(secret) from crypto.ts, (3) implement lock() that clears vaultKey and vaultSecret, sets isLocked = true, (4) implement getVaultSecretForRecording() returning vaultSecret for closure capture, (5) implement setRecordingInProgress(boolean) to update recordingInProgressRef, (6) track user activity (mousedown, keydown, scroll, touchstart) and update lastActivityRef, (7) check idle every 30s and lock if > 15min idle AND NOT recording, (8) call initializeVault() on mount when user changes. Remove ALL PIN-related logic: unlock(pin), setupPIN(pin), isFirstTimeSetup, pinAttemptsRemaining, brute force protection.

    **Restrictions:** Do not keep any PIN-related state or methods. Must prevent lock during recording (check recordingInProgressRef). Must clear secrets from memory on lock. Must re-fetch vault secret on initializeVault(). Do not modify AuthContext. Must maintain idle timeout at 15 minutes (SESSION_CONFIG.IDLE_TIMEOUT_MS).

    **Success:** VaultContext exports VaultProvider and useVault hook. Context provides: vaultKey, vaultSecret, isLocked, isLoading, initializeVault, lock, getVaultSecretForRecording, setRecordingInProgress. Idle timeout works correctly (15min) and respects recording state. Vault initializes on user authentication. Lock clears secrets from memory. No PIN-related code remains. TypeScript compiles without errors.

    **After completing this task:** Mark task 6 as in-progress in tasks.md before starting. When complete, use the log-implementation tool to record implementation details with comprehensive artifacts (context value interface, methods provided, state management, activity tracking logic), then mark task 6 as complete [x] in tasks.md.

- [x] 7. Update AuthContext to remove custom claims logic
  - File: src/context/AuthContext.tsx
  - Remove idToken state and vaultSecret state from AuthContext
  - Remove JWT custom claims extraction logic
  - Keep authentication methods (signInWithGoogle, signInWithEmail, signOut)
  - Purpose: Simplify authentication context since vault secret now comes from Firestore
  - _Leverage: src/lib/firebase-client.ts (auth, googleProvider)_
  - _Requirements: 1.9_
  - _Prompt: **Implement the task for spec appv2, first run spec-workflow-guide to get the workflow guide then implement the task:**

    **Role:** React Context Developer specializing in Firebase authentication

    **Task:** Update src/context/AuthContext.tsx to remove custom claims logic. Keep: user state, loading state, signInWithGoogle(), signInWithEmail(email, password), signOut(). Remove: idToken state, vaultSecret state, token fetching logic (await user.getIdToken()), custom claims extraction (await user.getIdTokenResult() and tokenResult.claims.vault_secret). The context should only manage Firebase authentication state, not vault secrets. Update AuthContextValue interface in src/types/index.ts to remove idToken and vaultSecret fields.

    **Restrictions:** Do not modify authentication methods (signInWithGoogle, signInWithEmail, signOut). Must keep onAuthStateChanged listener for user state. Must maintain loading state for auth initialization. Do not add any Firestore logic to AuthContext. Must update types/index.ts to match.

    **Success:** AuthContext no longer manages idToken or vaultSecret. AuthContextValue interface updated in types/index.ts. Authentication methods (Google, email/password, sign out) still work correctly. onAuthStateChanged listener maintained. TypeScript compiles without errors. Authentication flow works without custom claims.

    **After completing this task:** Mark task 7 as in-progress in tasks.md before starting. When complete, use the log-implementation tool to record implementation details with comprehensive artifacts (removed state, removed logic, updated interfaces), then mark task 7 as complete [x] in tasks.md.

## Phase 4: UI Components and Hooks

- [x] 8. Create LockScreen component
  - File: src/components/LockScreen.tsx
  - Create full-screen lock overlay with backdrop blur
  - Add "Unlock Session" button that calls initializeVault()
  - Add "Sign in with a different account" button that signs out and redirects
  - Display authenticated user's email
  - Purpose: Provide UI for unlocking session after idle timeout
  - _Leverage: src/components/ui/button.tsx, src/components/ui/card.tsx, src/context/VaultContext.tsx, src/context/AuthContext.tsx_
  - _Requirements: 1.3_
  - _Prompt: **Implement the task for spec appv2, first run spec-workflow-guide to get the workflow guide then implement the task:**

    **Role:** React UI Developer specializing in Shadcn UI and Tailwind CSS

    **Task:** Create src/components/LockScreen.tsx following prd2.md section 4.7 (Lock Screen Component). Component must: (1) use VaultContext to get initializeVault and isLoading, (2) use AuthContext to get user and signOut, (3) render fixed inset-0 overlay with bg-background/95 backdrop-blur-sm, (4) center a Card with Lock icon, "Session Locked" title, user email (if available), (5) "Unlock Session" Button (size="lg", full width) that calls initializeVault() and is disabled when isLoading, (6) "Sign in with a different account" Button (variant="ghost", size="sm", full width) that calls signOut() and router.push('/login'), (7) display error message if unlock fails. Use Shadcn Card, CardHeader, CardTitle, CardDescription, CardContent, Button components. Use lucide-react Lock icon.

    **Restrictions:** Must use Shadcn UI components (Card, Button). Must use Tailwind classes for styling. Must disable "Unlock" button during loading. Must call initializeVault() not unlock(). Must redirect to /login after sign out. Do not add form inputs (no PIN entry).

    **Success:** LockScreen.tsx exports LockScreen component. Component renders full-screen overlay with backdrop blur. Shows user email when available. "Unlock Session" button calls initializeVault(). "Sign in with a different account" signs out and redirects. Error messages display correctly. Component uses Shadcn UI and Tailwind styling. TypeScript compiles without errors.

    **After completing this task:** Mark task 8 as in-progress in tasks.md before starting. When complete, use the log-implementation tool to record implementation details with comprehensive artifacts (React component, props, Shadcn components used, user interactions), then mark task 8 as complete [x] in tasks.md.

- [x] 9. Update useRecorder hook with closure pattern
  - File: src/hooks/useRecorder.ts
  - Implement closure pattern to capture vaultSecret and uid at recording start
  - Use captured values in onstop handler for encryption
  - Call setRecordingInProgress(true) on start, setRecordingInProgress(false) on stop
  - Update to match new storage interface (encrypt then save)
  - Purpose: Enable recording to complete successfully even if session locks mid-recording
  - _Leverage: src/context/VaultContext.tsx, src/context/AuthContext.tsx, src/lib/crypto.ts, src/lib/storage.ts_
  - _Requirements: 1.5, 1.7_
  - _Prompt: **Implement the task for spec appv2, first run spec-workflow-guide to get the workflow guide then implement the task:**

    **Role:** React Hooks Developer specializing in MediaRecorder API and closure patterns

    **Task:** Update src/hooks/useRecorder.ts to implement closure pattern from prd2.md section 4.6 (Recording Hook with Closure). Changes needed: (1) add capturedSecretRef, capturedUidRef, capturedDurationRef refs to store captured values, (2) in startRecording(), capture vaultSecret via getVaultSecretForRecording() and uid from user, store in refs, call setRecordingInProgress(true), (3) in mediaRecorder.onstop handler, use captured values (not current state) to encrypt and save, derive key from captured secret (await deriveVaultKey(capturedSecretRef.current)), encrypt note data with key, create EncryptedNote object, call saveEncryptedNote(encryptedNote), (4) clear captured values and call setRecordingInProgress(false) after save completes. Remove dependency on current vaultKey state in onstop handler. Change return interface to: status, duration, remainingTime, error, startRecording, stopRecording, reset.

    **Restrictions:** Must capture vaultSecret at recording start, not use current state in onstop. Must call setRecordingInProgress(true/false) to notify VaultContext. Must handle case where captured secret is null (session expired during recording). Must use new storage interface (saveEncryptedNote accepts EncryptedNote). Do not modify MediaRecorder setup or duration tracking logic.

    **Success:** useRecorder captures vaultSecret and uid in closure at recording start. Recording completes successfully even if session locks mid-recording. Encryption uses captured secret in onstop handler. setRecordingInProgress called appropriately. saveEncryptedNote receives pre-encrypted EncryptedNote. Return interface matches new design. TypeScript compiles without errors. Recording flow works end-to-end.

    **After completing this task:** Mark task 9 as in-progress in tasks.md before starting. When complete, use the log-implementation tool to record implementation details with comprehensive artifacts (closure pattern implementation, refs used, recording lifecycle, integration with VaultContext and storage), then mark task 9 as complete [x] in tasks.md.

- [x] 10. Update useNotes hook (minimal changes)
  - File: src/hooks/useNotes.ts
  - Verify useNotes works with updated VaultContext (vaultKey still exists)
  - Ensure no breaking changes needed for notes loading/decryption
  - Purpose: Ensure notes hook remains compatible with new vault architecture
  - _Leverage: src/context/VaultContext.tsx, src/lib/storage.ts_
  - _Requirements: 1.7_
  - _Prompt: **Implement the task for spec appv2, first run spec-workflow-guide to get the workflow guide then implement the task:**

    **Role:** React Hooks Developer with expertise in data fetching patterns

    **Task:** Review and update (if needed) src/hooks/useNotes.ts to ensure compatibility with new VaultContext. Reference prd2.md section 4.8 (Notes Hook). The hook should: (1) get vaultKey from useVault(), (2) call loadAllNotes(vaultKey) from storage.ts, (3) handle loading/error states, (4) provide deleteNote and refresh functions. Verify that the hook works correctly with the new VaultContext interface. Most likely no changes needed, but verify vaultKey access and error handling. Check that notes load correctly after unlock, and that lock clears notes (because vaultKey becomes null).

    **Restrictions:** Do not change core loading logic unless necessary for compatibility. Must handle vaultKey being null (locked state). Must maintain existing error handling. Do not add new features beyond compatibility fixes.

    **Success:** useNotes hook works correctly with new VaultContext. Notes load successfully when vault is unlocked. Notes clear when vault is locked (vaultKey null). deleteNote and refresh functions work correctly. TypeScript compiles without errors. No breaking changes to components using this hook.

    **After completing this task:** Mark task 10 as in-progress in tasks.md before starting. When complete, use the log-implementation tool to record implementation details with comprehensive artifacts (any changes made, compatibility verification, integration with VaultContext), then mark task 10 as complete [x] in tasks.md.

- [x] 11. Update main page to integrate LockScreen
  - File: src/pages/index.tsx
  - Add conditional rendering for LockScreen when isLocked || !vaultKey
  - Remove PIN setup conditional rendering
  - Simplify authentication checks
  - Purpose: Integrate lock screen into main app flow
  - _Leverage: src/components/LockScreen.tsx, src/context/VaultContext.tsx, src/context/AuthContext.tsx_
  - _Requirements: 1.3_
  - _Prompt: **Implement the task for spec appv2, first run spec-workflow-guide to get the workflow guide then implement the task:**

    **Role:** Next.js Pages Developer specializing in authentication flows

    **Task:** Update src/pages/index.tsx following prd2.md section 4.9 (Main Page Integration). Changes: (1) import LockScreen component, (2) get isLocked and vaultKey from useVault(), (3) add conditional: if (isLocked || !vaultKey) return <LockScreen />, (4) remove isFirstTimeSetup conditional and PIN setup rendering, (5) keep existing Layout, Recorder, NotesList rendering when unlocked, (6) keep janitor setup (runJanitor on mount and interval), (7) keep authentication redirect (redirect to /login if !user). The flow should be: loading → redirect if not authenticated → show lock screen if locked → show main content if unlocked.

    **Restrictions:** Do not remove janitor setup. Do not remove authentication checks. Must render LockScreen when isLocked OR !vaultKey. Do not modify Layout, Recorder, or NotesList components. Keep existing loading states.

    **Success:** index.tsx shows LockScreen when vault is locked. LockScreen appears after idle timeout. Main content (Recorder, NotesList) shows when unlocked. No PIN setup UI remains. Authentication flow intact. Janitor runs on schedule. TypeScript compiles without errors. Page flow works correctly: login → unlock → use app → lock → unlock.

    **After completing this task:** Mark task 11 as in-progress in tasks.md before starting. When complete, use the log-implementation tool to record implementation details with comprehensive artifacts (conditional rendering logic, removed components, authentication flow), then mark task 11 as complete [x] in tasks.md.

## Phase 5: Cleanup

- [x] 12. Delete PIN-related components and API endpoint
  - Files: src/components/PINOverlay.tsx, src/components/PINSetup.tsx, src/pages/api/auth/init.ts
  - Delete these files entirely as they're no longer needed
  - Purpose: Remove obsolete PIN-based authentication code
  - _Leverage: None (deletion task)_
  - _Requirements: 1.2_
  - _Prompt: **Implement the task for spec appv2, first run spec-workflow-guide to get the workflow guide then implement the task:**

    **Role:** Code Cleanup Specialist with attention to dependency management

    **Task:** Delete the following files: src/components/PINOverlay.tsx, src/components/PINSetup.tsx, src/pages/api/auth/init.ts. These files are no longer needed with the new Firestore-based vault secret architecture. Before deleting, verify that no other files import or reference these components. Search the codebase for imports like "from '@/components/PINOverlay'" or "from './PINOverlay'" or references to the /api/auth/init endpoint. If any references exist, remove them first, then delete the files.

    **Restrictions:** Must verify no imports remain before deletion. Do not delete any other files. Must completely remove files, not just comment out code.

    **Success:** PINOverlay.tsx deleted. PINSetup.tsx deleted. /pages/api/auth/init.ts deleted. No remaining imports or references to these files exist in the codebase. TypeScript compiles without errors about missing modules. Application runs without attempting to import deleted files.

    **After completing this task:** Mark task 12 as in-progress in tasks.md before starting. When complete, use the log-implementation tool to record implementation details (list files deleted, any import cleanup performed), then mark task 12 as complete [x] in tasks.md.

- [x] 13. Update TypeScript type definitions
  - File: src/types/index.ts
  - Update VaultContextValue interface to remove PIN-related fields and add new methods
  - Update AuthContextValue interface to remove idToken and vaultSecret fields
  - Ensure EncryptedNote and DecryptedNote interfaces remain unchanged
  - Purpose: Align types with new architecture
  - _Leverage: None (type definitions)_
  - _Requirements: All_
  - _Prompt: **Implement the task for spec appv2, first run spec-workflow-guide to get the workflow guide then implement the task:**

    **Role:** TypeScript Developer specializing in type safety and interfaces

    **Task:** Update src/types/index.ts. For VaultContextValue: (1) remove isFirstTimeSetup, isVaultInitializing, vaultError, pinAttemptsRemaining, recordingStatus fields, (2) remove unlock, setupPIN, setRecordingStatus, resetBruteForce, retryVaultInit methods, (3) add vaultSecret: string | null, isLoading: boolean fields, (4) add initializeVault: () => Promise<void>, getVaultSecretForRecording: () => string | null, setRecordingInProgress: (inProgress: boolean) => void methods. For AuthContextValue: (1) remove idToken: string | null and vaultSecret: string | null fields. Keep EncryptedNote and DecryptedNote interfaces unchanged. Remove VaultState interface if it exists (no longer used). Keep RecordingStatus type unchanged. Remove AuthInitRequest and AuthInitResponse interfaces (init endpoint deleted).

    **Restrictions:** Do not modify EncryptedNote or DecryptedNote interfaces. Must ensure all context interfaces match actual implementations. Do not add fields that aren't implemented. Must remove all PIN-related types.

    **Success:** VaultContextValue interface updated with new fields/methods, PIN fields removed. AuthContextValue interface has idToken and vaultSecret removed. EncryptedNote and DecryptedNote unchanged. AuthInitRequest and AuthInitResponse removed. RecordingStatus type unchanged. TypeScript compiles without type errors. All context implementations match interfaces.

    **After completing this task:** Mark task 13 as in-progress in tasks.md before starting. When complete, use the log-implementation tool to record implementation details with comprehensive artifacts (interface changes, removed types, field additions/removals), then mark task 13 as complete [x] in tasks.md.

## Phase 6: Testing and Verification

- [ ] 14. Manual testing and verification
  - Files: All updated files
  - Test complete flow: sign in → vault initialized → record → save → lock → unlock → decrypt notes
  - Test idle timeout (may need to reduce timeout temporarily for testing)
  - Test recording during idle (verify recording completes after lock)
  - Verify Firestore security rules work correctly
  - Test browser close and reopen (session should require re-auth)
  - Purpose: Ensure all components work together correctly
  - _Leverage: All updated modules_
  - _Requirements: All_
  - _Prompt: **Implement the task for spec appv2, first run spec-workflow-guide to get the workflow guide then implement the task:**

    **Role:** QA Engineer specializing in end-to-end testing and user flow validation

    **Task:** Perform comprehensive manual testing following the test scenarios in prd2.md section 9 (Testing Scenarios). Test these critical flows: (1) Fresh user: Sign in → vault secret created in Firestore → can record and save, (2) Returning user: Sign in → vault secret fetched → can decrypt existing notes, (3) Idle timeout: Wait 15 min (or reduce SESSION_CONFIG.IDLE_TIMEOUT_MS for testing) → lock screen appears → notes hidden, (4) Unlock: Click "Unlock Session" → vault secret fetched → notes visible again, (5) Recording during lock: Start recording → trigger idle timeout → verify recording continues → finish recording → note encrypted with captured secret and saved successfully, (6) Browser close: Close tab → reopen → must login again → notes still there and decryptable after unlock, (7) Firestore immutability: Try to update/delete vault secret via console (should fail). Document any issues found and create a test report.

    **Restrictions:** Must test all critical flows. Must verify Firestore security rules. Must test edge cases (lock during recording, browser close). Must document any issues found. For testing idle timeout, temporarily reduce IDLE_TIMEOUT_MS to 1 minute in constants.ts, then restore it after testing.

    **Success:** All test scenarios pass successfully. Fresh user flow works (vault secret created). Returning user flow works (vault secret fetched, notes decrypt). Idle timeout triggers lock after 15 minutes. Unlock via re-authentication works. Recording completes during lock. Browser close clears session. Firestore rules prevent vault secret modification. Test report documents results and any issues. Application meets all acceptance criteria from requirements.md.

    **After completing this task:** Mark task 14 as in-progress in tasks.md before starting. When complete, use the log-implementation tool to record testing results, issues found (if any), and verification status. Include test coverage summary as artifacts. Then mark task 14 as complete [x] in tasks.md.

- [ ] 15. Deploy Firestore security rules to Firebase
  - File: firestore.rules
  - Deploy security rules to Firebase using Firebase CLI or console
  - Verify rules are active in Firebase console
  - Purpose: Activate vault secret security rules in production
  - _Leverage: firestore.rules from task 3_
  - _Requirements: 1.1_
  - _Prompt: **Implement the task for spec appv2, first run spec-workflow-guide to get the workflow guide then implement the task:**

    **Role:** DevOps Engineer with expertise in Firebase deployment

    **Task:** Deploy the Firestore security rules created in task 3. If Firebase CLI is available, run: firebase deploy --only firestore:rules. If not, deploy via Firebase Console: (1) Go to console.firebase.google.com, (2) Select scribevault project, (3) Navigate to Firestore Database → Rules, (4) Copy rules from firestore.rules file, (5) Publish rules. After deployment, verify rules are active by checking the Rules tab in Firestore console. Test that the rules work by: (1) authenticating as a user, (2) attempting to read vault secret (should succeed), (3) attempting to update vault secret (should fail with permission denied), (4) attempting to delete vault secret (should fail with permission denied).

    **Restrictions:** Must deploy to correct Firebase project (scribevault). Must verify rules are active before marking complete. Must test that rules actually enforce security (try update/delete and verify they fail). Do not modify rules during deployment.

    **Success:** Firestore security rules deployed to Firebase project. Rules are visible and active in Firebase console Rules tab. Testing confirms: users can read their own vault secret, users cannot read other users' vault secrets, users cannot update or delete vault secrets after creation. Deployment documented in DEPLOYMENT.md.

    **After completing this task:** Mark task 15 as in-progress in tasks.md before starting. When complete, use the log-implementation tool to record deployment details (method used, verification results, rule testing outcomes), then mark task 15 as complete [x] in tasks.md.

## Additional Notes

**Important:** Each task should be implemented and tested before moving to the next. Use the log-implementation tool after each task to create a searchable knowledge base of what was implemented.

**prd2.md Reference:** Refer to `/Users/treyhuffine/hipaa-notetaker/prd2.md` throughout implementation for detailed code examples and specifications.

**Migration Warning:** This update is NOT backward compatible with existing PIN-based encrypted notes. Users will need to re-record notes after the update. Consider adding a warning message or migration tool if deploying to existing users.

**Testing Note:** For testing idle timeout, temporarily reduce SESSION_CONFIG.IDLE_TIMEOUT_MS to 1 minute in constants.ts during testing, then restore to 15 minutes before deploying.
