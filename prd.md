# Product Requirements Document: ScribeVault

## HIPAA-Compliant Zero-Knowledge Clinical Transcription Application

---

## 1. Executive Summary

### 1.1 Product Vision

ScribeVault is a stateless, zero-knowledge web application enabling clinical staff to record patient encounters and generate professionally formatted SOAP notes. The application prioritizes HIPAA compliance through client-side encryption, stateless cloud processing, and aggressive session management.

### 1.2 Core Principle: Safe Harbor Compliance

If the device is stolen or cloud accounts are compromised, all PHI (Protected Health Information) remains encrypted and inaccessible without a user-defined PIN that is **never stored anywhere**.

### 1.3 Architecture Philosophy

- **Stateless Cloud**: The server acts purely as a transit pipe to Groq APIs
- **Zero-Knowledge Client**: All data at rest is encrypted with keys derived from user secrets
- **No Database**: No PHI is ever persisted on servers or in cloud storage

---

## 2. Human-Managed Infrastructure

> **⚠️ AI AGENT INSTRUCTION**: The following items are handled by the human developer. Do NOT attempt to implement these. Assume these services are fully configured and credentials will be provided via environment variables.

| Item                     | Human Responsibility                                                                                 |
| ------------------------ | ---------------------------------------------------------------------------------------------------- |
| Google Cloud Platform    | Project created, HIPAA BAA signed in IAM > Compliance                                                |
| Google Identity Platform | Firebase Auth enabled with Google Sign-in provider configured                                        |
| Groq Cloud               | Account created, HIPAA BAA signed in Settings > Compliance                                           |
| Environment Variables    | `GROQ_API_KEY`, `FIREBASE_SERVICE_ACCOUNT_JSON`, and Firebase client config provided in `.env.local` |
| Domain & SSL             | Production domain configured with HTTPS                                                              |
| Google Cloud Run         | Deployment target configured (human will deploy)                                                     |

---

## 3. Technology Stack

### 3.1 Core Technologies

| Category       | Technology          | Version/Notes                   |
| -------------- | ------------------- | ------------------------------- |
| Framework      | Next.js             | Latest stable, **Pages Router** |
| Language       | TypeScript          | Strict mode enabled             |
| Styling        | Tailwind CSS        | Latest stable                   |
| UI Components  | shadcn/ui           | Latest stable                   |
| Authentication | Firebase Client SDK | `firebase` package              |
| Server Auth    | Firebase Admin SDK  | `firebase-admin` package        |
| AI/ML API      | Groq SDK            | `groq-sdk` package              |
| Local Storage  | idb-keyval          | Lightweight IndexedDB wrapper   |
| Icons          | Lucide React        | Via shadcn/ui                   |

### 3.2 Project Initialization Commands

```bash
# Create Next.js project with Pages Router
npx create-next-app@latest scribevault --typescript --tailwind --eslint --src-dir --no-app

# Navigate to project
cd scribevault

# Initialize shadcn/ui
npx shadcn@latest init

# Install required dependencies
npm install firebase firebase-admin groq-sdk idb-keyval uuid

# Install shadcn/ui components needed
npx shadcn@latest add button card input dialog alert toast sonner
```

### 3.3 TypeScript Configuration

Ensure `tsconfig.json` has strict mode:

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true
  }
}
```

---

## 4. Folder Structure

```
scribevault/
├── src/
│   ├── pages/
│   │   ├── _app.tsx              # App wrapper with providers
│   │   ├── _document.tsx         # Custom document
│   │   ├── index.tsx             # Main application page
│   │   ├── login.tsx             # Login page
│   │   └── api/
│   │       ├── auth/
│   │       │   └── init.ts       # Vault secret initialization
│   │       └── scribe.ts         # Groq proxy endpoint
│   ├── components/
│   │   ├── PINOverlay.tsx        # Full-screen PIN entry lock
│   │   ├── PINSetup.tsx          # First-time PIN creation
│   │   ├── Recorder.tsx          # Audio recording interface
│   │   ├── NoteCard.tsx          # Individual note display
│   │   ├── NotesList.tsx         # List of saved notes
│   │   ├── SessionTimer.tsx      # Visual idle/recording timer
│   │   └── Layout.tsx            # Main layout wrapper
│   ├── context/
│   │   ├── AuthContext.tsx       # Firebase auth state
│   │   └── VaultContext.tsx      # Encryption key state & session management
│   ├── hooks/
│   │   ├── useRecorder.ts        # MediaRecorder logic
│   │   ├── useVault.ts           # Web Crypto API operations
│   │   ├── useIdleTimer.ts       # Idle detection logic
│   │   └── useNotes.ts           # IndexedDB CRUD operations
│   ├── lib/
│   │   ├── firebase-client.ts    # Firebase client initialization
│   │   ├── firebase-admin.ts     # Firebase admin initialization
│   │   ├── groq.ts               # Groq client initialization
│   │   ├── crypto.ts             # Web Crypto API utilities
│   │   ├── storage.ts            # IndexedDB encryption wrappers
│   │   └── constants.ts          # App-wide constants
│   ├── types/
│   │   └── index.ts              # TypeScript type definitions
│   └── styles/
│       └── globals.css           # Global styles (Tailwind)
├── public/
├── .env.local                    # Environment variables (human provides)
├── .env.example                  # Template for env vars
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

## 5. Environment Variables

### 5.1 Template (`.env.example`)

```env
# Firebase Client Configuration (Public)
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# Firebase Admin (Server-side only)
FIREBASE_SERVICE_ACCOUNT_JSON=

# Groq API (Server-side only)
GROQ_API_KEY=
```

---

## 6. Authentication System

### 6.1 Firebase Client Initialization (`src/lib/firebase-client.ts`)

NOTE: This only shows google, but we should enable email/password as well

```typescript
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
```

### 6.2 Firebase Admin Initialization (`src/lib/firebase-admin.ts`)

```typescript
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON || '{}');

const app =
  getApps().length === 0 ? initializeApp({ credential: cert(serviceAccount) }) : getApps()[0];

export const adminAuth = getAuth(app);
```

### 6.3 Auth Context (`src/context/AuthContext.tsx`)

**State to Manage:**

- `user: User | null` - Firebase user object
- `loading: boolean` - Auth state loading
- `idToken: string | null` - Current JWT
- `vaultSecret: string | null` - Extracted from JWT custom claims

**Behaviors:**

- Listen to `onAuthStateChanged`
- On auth change, call `getIdToken()` and decode to extract `vault_secret` claim
- Provide `signInWithGoogle()` function using `signInWithPopup`
- Provide `signOut()` function
- Set auth persistence to `browserSessionPersistence` (key evaporates on browser close)

### 6.4 Vault Secret Initialization API (`src/pages/api/auth/init.ts`)

**Endpoint**: `POST /api/auth/init`

**Request**:

```typescript
{
  idToken: string;
}
```

**Logic**:

1. Verify the `idToken` using `firebase-admin`
2. Get the user's current custom claims
3. If `vault_secret` claim exists, return `{ status: 'ready' }`
4. If `vault_secret` does NOT exist:
   - Generate 32-byte cryptographically secure random hex string using `crypto.randomBytes(32).toString('hex')`
   - Set custom claim using `adminAuth.setCustomUserClaims(uid, { vault_secret })`
   - Return `{ status: 'created' }`

**Response**:

```typescript
{
  status: 'ready' | 'created';
}
```

**Error Handling**:

- 401 for invalid token
- 500 for server errors

### 6.5 Post-Init Token Refresh

After calling `/api/auth/init`, the client **MUST** call:

```typescript
await auth.currentUser?.getIdToken(true);
```

This forces a token refresh to include the new `vault_secret` claim.

---

## 7. Zero-Knowledge Encryption System

### 7.1 Constants (`src/lib/constants.ts`)

```typescript
export const CRYPTO_CONFIG = {
  PBKDF2_ITERATIONS: 250000,
  KEY_LENGTH: 256,
  IV_LENGTH: 12,
  SALT_ALGORITHM: 'SHA-256',
} as const;

export const SESSION_CONFIG = {
  IDLE_TIMEOUT_MS: 15 * 60 * 1000, // 15 minutes
  MAX_RECORDING_MS: 60 * 60 * 1000, // 60 minutes
  DATA_TTL_MS: 12 * 60 * 60 * 1000, // 12 hours
  JANITOR_INTERVAL_MS: 5 * 60 * 1000, // 5 minutes
  MAX_PIN_ATTEMPTS: 5,
} as const;

export const PIN_CONFIG = {
  MIN_LENGTH: 4,
  MAX_LENGTH: 6,
} as const;
```

### 7.2 Type Definitions (`src/types/index.ts`)

```typescript
export interface EncryptedNote {
  id: string;
  timestamp: number;
  iv: string; // Base64 encoded 12-byte IV
  data: string; // Base64 encoded ciphertext
}

export interface DecryptedNote {
  id: string;
  timestamp: number;
  transcript: string;
  soapNote: string;
  duration: number; // Recording duration in seconds
}

export interface VaultState {
  isUnlocked: boolean;
  isFirstTime: boolean;
  pinAttemptsRemaining: number;
}

export type RecordingStatus = 'idle' | 'recording' | 'processing' | 'complete' | 'error';
```

### 7.3 Crypto Utilities (`src/lib/crypto.ts`)

#### 7.3.1 Key Derivation Function

```typescript
export async function deriveVaultKey(pin: string, vaultSecret: string): Promise<CryptoKey>;
```

**Implementation Requirements:**

1. Encode PIN as UTF-8 using `TextEncoder`
2. Import PIN as raw key material for PBKDF2
3. Encode `vaultSecret` as UTF-8 for salt
4. Call `crypto.subtle.deriveKey` with:
   - Algorithm: `PBKDF2`
   - Salt: encoded vault secret
   - Iterations: `250000`
   - Hash: `SHA-256`
5. Derive an `AES-GCM` key with length `256`
6. Set `extractable: false` (CRITICAL for security)
7. Return the `CryptoKey`

#### 7.3.2 Encryption Function

```typescript
export async function encryptData(
  key: CryptoKey,
  data: string
): Promise<{ iv: string; ciphertext: string }>;
```

**Implementation Requirements:**

1. Generate 12-byte random IV using `crypto.getRandomValues(new Uint8Array(12))`
2. Encode data as UTF-8
3. Call `crypto.subtle.encrypt` with AES-GCM and the IV
4. Return IV and ciphertext as Base64 strings

#### 7.3.3 Decryption Function

```typescript
export async function decryptData(key: CryptoKey, iv: string, ciphertext: string): Promise<string>;
```

**Implementation Requirements:**

1. Decode IV and ciphertext from Base64
2. Call `crypto.subtle.decrypt` with AES-GCM
3. Decode result as UTF-8 string
4. Return plaintext

#### 7.3.4 PIN Validation

```typescript
export function isValidPIN(pin: string): boolean;
```

- Must be 6-8 digits only
- Use regex: `/^\d{6,8}$/`

### 7.4 Storage Utilities (`src/lib/storage.ts`)

Use `idb-keyval` for IndexedDB operations.

#### 7.4.1 Save Encrypted Note

```typescript
export async function saveEncryptedNote(key: CryptoKey, note: DecryptedNote): Promise<void>;
```

1. Serialize note data (transcript, soapNote, duration) to JSON
2. Call `encryptData`
3. Create `EncryptedNote` object with id, timestamp, iv, data
4. Get existing notes array from IndexedDB (key: `'clinical_notes'`)
5. Append new note
6. Save back to IndexedDB

#### 7.4.2 Load All Notes

```typescript
export async function loadAllNotes(key: CryptoKey): Promise<DecryptedNote[]>;
```

1. Get encrypted notes array from IndexedDB
2. For each note, call `decryptData`
3. Parse JSON and reconstruct `DecryptedNote`
4. Return array sorted by timestamp descending

#### 7.4.3 Delete Note

```typescript
export async function deleteNote(noteId: string): Promise<void>;
```

1. Get notes array
2. Filter out note with matching id
3. Save filtered array back

#### 7.4.4 Purge All Data

```typescript
export async function purgeAllData(): Promise<void>;
```

1. Call `indexedDB.deleteDatabase('keyval-store')`
2. Clear any localStorage items related to the app

#### 7.4.5 Janitor Function

```typescript
export async function runJanitor(): Promise<number>;
```

1. Get notes array (raw, without decryption)
2. Filter to keep only notes where `(Date.now() - timestamp) < DATA_TTL_MS`
3. Save filtered array
4. Return count of deleted notes

---

## 8. Vault Context (`src/context/VaultContext.tsx`)

### 8.1 State

```typescript
interface VaultContextValue {
  // State
  vaultKey: CryptoKey | null;
  isLocked: boolean;
  isFirstTimeSetup: boolean;
  pinAttemptsRemaining: number;
  recordingStatus: RecordingStatus;

  // Actions
  unlock: (pin: string) => Promise<boolean>;
  lock: () => void;
  setupPIN: (pin: string) => Promise<void>;
  setRecordingStatus: (status: RecordingStatus) => void;
  resetBruteForce: () => void;
}
```

### 8.2 Logic Requirements

#### On Mount:

1. Check if user has notes in IndexedDB
   - If no notes exist and vault_secret exists → `isFirstTimeSetup = true`
   - If notes exist → `isFirstTimeSetup = false`, `isLocked = true`

#### `unlock(pin)`:

1. Get `vaultSecret` from AuthContext
2. Attempt `deriveVaultKey(pin, vaultSecret)`
3. Try to decrypt first note in storage (if any exist)
   - Success → Set `vaultKey`, return `true`
   - Failure → Decrement `pinAttemptsRemaining`
     - If attempts reach 0 → Call `purgeAllData()` and `signOut()`
     - Return `false`

#### `lock()`:

1. Set `vaultKey = null`
2. Set `isLocked = true`

#### `setupPIN(pin)`:

1. Derive key from PIN
2. Set `vaultKey`
3. Set `isFirstTimeSetup = false`

### 8.3 Idle Timer Integration

The VaultContext must include idle timer logic:

1. Track `lastActivityTimestamp`
2. Listen for events: `mousedown`, `keydown`, `scroll`, `touchstart`
3. On any event, reset `lastActivityTimestamp = Date.now()`
4. Run interval check every 30 seconds:
   - If `recordingStatus !== 'recording' && recordingStatus !== 'processing'`
   - AND `Date.now() - lastActivityTimestamp > IDLE_TIMEOUT_MS`
   - THEN call `lock()`

### 8.4 Janitor Integration

Run janitor on mount and every `JANITOR_INTERVAL_MS`:

```typescript
useEffect(() => {
  runJanitor();
  const interval = setInterval(runJanitor, SESSION_CONFIG.JANITOR_INTERVAL_MS);
  return () => clearInterval(interval);
}, []);
```

---

## 9. Recording System

### 9.1 useRecorder Hook (`src/hooks/useRecorder.ts`)

```typescript
interface UseRecorderReturn {
  status: RecordingStatus;
  duration: number; // Current recording duration in seconds
  remainingTime: number; // Time until hard stop
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<Blob>;
  error: string | null;
}
```

### 9.2 Implementation Requirements

#### MediaRecorder Setup:

1. Request microphone access: `navigator.mediaDevices.getUserMedia({ audio: true })`
2. Create MediaRecorder with `audio/webm;codecs=opus` (or fallback to `audio/webm`)
3. Collect chunks in array via `ondataavailable`

#### Duration Tracking:

1. Start interval on recording start
2. Increment duration every second
3. Display remaining time: `MAX_RECORDING_MS / 1000 - duration`

#### Hard Stop at 60 Minutes:

```typescript
useEffect(() => {
  if (status === 'recording') {
    const timeout = setTimeout(() => {
      stopRecording();
      // Show toast: "Recording reached 60-minute limit"
    }, SESSION_CONFIG.MAX_RECORDING_MS);
    return () => clearTimeout(timeout);
  }
}, [status]);
```

#### Wake Lock (Prevent Sleep):

```typescript
useEffect(() => {
  let wakeLock: WakeLockSentinel | null = null;

  if (status === 'recording' && 'wakeLock' in navigator) {
    navigator.wakeLock
      .request('screen')
      .then((wl) => {
        wakeLock = wl;
      })
      .catch(() => {
        // Wake lock not supported or denied - continue anyway
      });
  }

  return () => {
    wakeLock?.release();
  };
}, [status]);
```

---

## 10. Scribe API Proxy

### 10.1 Endpoint (`src/pages/api/scribe.ts`)

**Method**: `POST`

**Request**: `multipart/form-data`

- `audio`: Audio file blob
- `idToken`: Firebase ID token for verification

**Response**:

```typescript
{
  transcript: string;
  soapNote: string;
}
```

### 10.2 Implementation Requirements

#### Security:

1. Verify Firebase `idToken` using `firebase-admin`
2. If invalid, return 401
3. **DO NOT** use `console.log` on any transcript/audio data
4. **DO NOT** write to filesystem

#### Groq Client Setup (`src/lib/groq.ts`):

```typescript
import Groq from 'groq-sdk';

export const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});
```

#### Processing Pipeline:

**Step 1: Transcription**

```typescript
const transcription = await groq.audio.transcriptions.create({
  file: audioFile,
  model: '...', // whisper turbo
  response_format: 'text',
});
```

**Step 2: SOAP Note Generation**

```typescript
const completion = await groq.chat.completions.create({
  model: 'llama-3.3-70b-versatile',
  messages: [
    { role: 'system', content: SOAP_SYSTEM_PROMPT },
    { role: 'user', content: transcription },
  ],
  temperature: 0.3,
  max_tokens: 2000,
});
```

### 10.3 SOAP System Prompt

```typescript
export const SOAP_SYSTEM_PROMPT = `You are a Senior Medical Scribe with 15 years of experience in clinical documentation.

## YOUR TASK
Transform the following transcript of a clinical encounter into a professionally formatted SOAP note.

## OUTPUT FORMAT
Use these exact headers in this order:

### SUBJECTIVE
- Chief complaint in patient's own words
- History of present illness (HPI)
- Relevant medical history mentioned
- Current medications discussed
- Allergies mentioned
- Review of systems mentioned

### OBJECTIVE
- Vital signs if mentioned
- Physical examination findings if performed
- Any lab results or imaging discussed
- Observable patient presentation

### ASSESSMENT
- Primary diagnosis or differential diagnoses discussed
- Clinical reasoning summary

### PLAN
- Ordered tests or referrals
- Prescribed medications with dosages if mentioned
- Patient education provided
- Follow-up instructions
- Return precautions

## RULES
1. Use professional medical terminology (convert "stomach hurts" to "abdominal pain")
2. Write in third person, past tense ("Patient reported..." not "I have...")
3. Use bullet points for clarity within each section
4. If a section has no relevant information from the transcript, write "Not documented in this encounter"
5. REDACT any non-clinical personally identifiable information:
   - Social Security Numbers → [SSN REDACTED]
   - Home addresses → [ADDRESS REDACTED]
   - Phone numbers (unless for pharmacy/provider) → [PHONE REDACTED]
6. Preserve clinically relevant identifiers (patient name, DOB, MRN if mentioned)
7. Be concise but complete

## OUTPUT
Respond with ONLY the SOAP note. No introductions, explanations, or sign-offs.`;
```

---

## 11. UI Components

### 11.1 Layout Component (`src/components/Layout.tsx`)

- Wrap entire app
- Show header with app name and user info
- Show sign out button when authenticated
- Apply consistent padding/max-width

### 11.2 PIN Overlay (`src/components/PINOverlay.tsx`)

**When to Show**: `isLocked === true && !isFirstTimeSetup`

**Features**:

- Full-screen overlay with blur/dark background
- Centered card with PIN input
- Show remaining attempts: "X attempts remaining"
- Numeric keypad (mobile-friendly)
- "Unlock" button
- Warning message when attempts < 3

**Behavior**:

- On submit, call `unlock(pin)`
- If failed, shake animation + show error
- Clear input on failure

### 11.3 PIN Setup (`src/components/PINSetup.tsx`)

**When to Show**: `isFirstTimeSetup === true`

**Features**:

- Welcome message explaining PIN purpose
- PIN input (6-8 digits)
- Confirm PIN input
- Validation:
  - PINs must match
  - Must be 6-8 digits
- "Create PIN" button
- Disclaimer: "This PIN is never stored. If forgotten, all local data will be lost."

### 11.4 Recorder Component (`src/components/Recorder.tsx`)

**Visual States**:

| Status       | Display                                                                                   |
| ------------ | ----------------------------------------------------------------------------------------- |
| `idle`       | Large microphone button, "Tap to Record"                                                  |
| `recording`  | Pulsing red indicator, waveform animation, timer showing elapsed/remaining, "Stop" button |
| `processing` | Spinner, "Transcribing..." then "Generating SOAP note..."                                 |
| `complete`   | Success checkmark, "Note saved"                                                           |
| `error`      | Error icon, error message, "Try Again" button                                             |

**Buttons**:

- Start/Stop recording toggle
- Cancel button (during processing)

### 11.5 Note Card (`src/components/NoteCard.tsx`)

**Display**:

- Timestamp formatted as "Jan 8, 2026 at 3:45 PM"
- Duration: "12 min 34 sec"
- Preview of SOAP note (first 150 chars)
- Expand/collapse toggle

**Expanded View**:

- Full SOAP note with proper formatting
- Original transcript (collapsed by default)
- "Copy SOAP Note" button
- "Copy Transcript" button
- "Secure Delete" button (with confirmation dialog)

Once copied, open a modal that asks them if they are ready to delete the message.

### 11.6 Notes List (`src/components/NotesList.tsx`)

- List of NoteCard components
- Empty state: "No notes yet. Record your first encounter."
- Sort by timestamp (newest first)

### 11.7 Session Timer (`src/components/SessionTimer.tsx`)

**When Recording**:

- Show elapsed time: "05:32 / 60:00"
- Show visual progress bar

**When Idle**:

- Show time until auto-lock: "Session locks in 12:45"
- Warning color when < 2 minutes

---

## 12. Page Components

### 12.1 Login Page (`src/pages/login.tsx`)

- Centered card with app logo/name
- Email/password inputs
- "Sign in with Google" button
- Brief description of the app
- Privacy notice: "All data is encrypted locally"

**Logic**:

- If already authenticated, redirect to index
- On successful login, call `/api/auth/init`, force token refresh, redirect to index

### 12.2 Main Page (`src/pages/index.tsx`)

**Auth Guard**:

- If not authenticated, redirect to `/login`
- If authenticated but locked, show PINOverlay
- If first time, show PINSetup

**Layout**:

```
┌─────────────────────────────────────┐
│  Header (Logo, User, Sign Out)      │
├─────────────────────────────────────┤
│                                     │
│  ┌─────────────────────────────┐   │
│  │      Recorder Component      │   │
│  └─────────────────────────────┘   │
│                                     │
│  ──────── Your Notes ────────      │
│                                     │
│  ┌─────────────────────────────┐   │
│  │        NoteCard 1            │   │
│  └─────────────────────────────┘   │
│  ┌─────────────────────────────┐   │
│  │        NoteCard 2            │   │
│  └─────────────────────────────┘   │
│                                     │
└─────────────────────────────────────┘
```

---

Thoughts:

1. Make sure it says something about all notes are delete 12 hours after being created
2. Put the start time so it's easier to figure out which patient it might be
3. Make sure only the current user's notes show up

## 13. Security Implementation Checklist

### 13.1 Client-Side Security

| Requirement              | Implementation                                          |
| ------------------------ | ------------------------------------------------------- |
| PIN never stored         | Only exists as function parameter during key derivation |
| Key never persisted      | Only in React state; lost on refresh                    |
| Non-extractable key      | `extractable: false` in deriveKey call                  |
| Unique IV per encryption | `crypto.getRandomValues(new Uint8Array(12))`            |
| Brute force protection   | 5 attempts, then purge all data                         |
| Idle timeout             | 15 minutes, lock vault                                  |
| Max recording            | 60 minutes hard stop                                    |
| Data TTL                 | 12 hours, auto-delete                                   |

### 13.2 Server-Side Security

| Requirement          | Implementation                                     |
| -------------------- | -------------------------------------------------- |
| Token verification   | All API routes verify Firebase JWT                 |
| No logging of PHI    | No console.log of audio/transcripts                |
| No persistence       | No file writes, no database                        |
| HTTPS only           | Enforced by hosting (human responsibility)         |
| Stateless processing | Data exists only in function memory during request |

### 13.3 localStorage Usage

**Allowed**:

- `scribevault_pin_attempts` - Number of failed PIN attempts (integer)

**NOT Allowed**:

- PIN
- Vault key
- Vault secret
- Any PHI
- Transcripts
- Notes

---

## 14. Error Handling

### 14.1 User-Facing Errors

| Scenario                  | Message                                                                         | Action                              |
| ------------------------- | ------------------------------------------------------------------------------- | ----------------------------------- |
| Microphone denied         | "Microphone access required. Please allow in browser settings."                 | Show retry button                   |
| Network error (recording) | "Upload failed. Your recording is saved locally."                               | Auto-retry with exponential backoff |
| Groq API error            | "AI processing failed. Please try again."                                       | Show retry with saved audio         |
| Decryption failed         | "Could not decrypt note. Data may be corrupted."                                | Offer to delete note                |
| Max attempts exceeded     | "Too many incorrect PIN attempts. All local data has been erased for security." | Redirect to login                   |

### 14.2 Logging Guidelines

**Allowed to log**:

- User ID (UID)
- Timestamps
- Error types (without PHI details)
- Performance metrics

**NEVER log**:

- Transcripts
- Audio data
- SOAP notes
- Patient information
- PIN values

---

## 15. Testing Considerations

### 15.1 Critical Test Scenarios

1. **PIN Flow**

   - Correct PIN unlocks vault
   - Incorrect PIN decrements attempts
   - 5 failed attempts triggers data purge
   - New session requires PIN re-entry

2. **Encryption/Decryption**

   - Encrypted data is not readable without key
   - Decryption produces original data
   - Different IVs produce different ciphertext
   - Wrong key fails to decrypt (throws error)

3. **Session Management**

   - Idle timeout triggers lock after 15 min
   - Active recording prevents idle lock
   - Processing prevents idle lock
   - Page refresh requires PIN

4. **Recording**

   - 60-minute hard stop works
   - Audio uploads successfully
   - Transcript returns correctly
   - SOAP note is formatted properly

5. **Data Lifecycle**
   - Notes older than 12 hours are deleted
   - Janitor runs on schedule
   - Purge deletes all IndexedDB data

---

## 16. Deployment Notes

> **AI AGENT NOTE**: The human will handle deployment. Create a `Dockerfile` for reference.

### 16.1 Dockerfile

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]
```

### 16.2 next.config.js

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
};

module.exports = nextConfig;
```

---

## 17. Development Workflow

### 17.1 Initial Setup Commands

```bash
# Install dependencies
npm install

# Create env file from template
cp .env.example .env.local
# (Human fills in values)

# Run development server
npm run dev
```

### 17.2 Build Commands

```bash
# Type check
npm run type-check

# Lint
npm run lint

# Build for production
npm run build

# Start production server locally
npm run start
```

---

## 18. Implementation Order

For the AI coding agent, implement in this order:

1. **Foundation**

   - Project initialization with CLI commands
   - Environment variables setup
   - Type definitions
   - Constants

2. **Authentication Layer**

   - Firebase client/admin initialization
   - AuthContext
   - Login page
   - `/api/auth/init` endpoint

3. **Encryption Layer**

   - Crypto utilities (derive, encrypt, decrypt)
   - Storage utilities (save, load, delete, purge, janitor)
   - VaultContext

4. **UI Shell**

   - Layout component
   - PINOverlay component
   - PINSetup component
   - Main page structure

5. **Recording System**

   - useRecorder hook
   - Recorder component
   - `/api/scribe` endpoint

6. **Notes Display**

   - NoteCard component
   - NotesList component
   - useNotes hook

7. **Session Management**

   - useIdleTimer hook
   - SessionTimer component
   - Integration with VaultContext

8. **Polish**
   - Error handling
   - Loading states
   - Toasts/notifications
   - Mobile responsiveness

---

## 19. Success Criteria

The MVP is complete when:

- [ ] User can sign in with Google and email/password
- [ ] User can create a 6-8 digit PIN on first use
- [ ] User must enter PIN to unlock on subsequent visits
- [ ] User can record audio up to 60 minutes
- [ ] Recording auto-stops at 60 minutes with notification
- [ ] Audio is transcribed via Groq Whisper Turbo
- [ ] Transcript is formatted into SOAP note via Groq Llama
- [ ] Note is encrypted and saved to IndexedDB
- [ ] User can view list of saved notes
- [ ] User can copy SOAP note to clipboard
- [ ] User can delete individual notes
- [ ] Session auto-locks after 15 minutes of inactivity
- [ ] Notes older than 12 hours are auto-deleted
- [ ] 5 failed PIN attempts purges all data
- [ ] No PHI is ever sent to server logs
- [ ] No PHI is stored unencrypted anywhere

## 20. UX Fast follow?

Use WebAuthn as an optional for users so they don't have to use pins? Make sure it's done in a HIPAA compliant way

---

**END OF PRD**
