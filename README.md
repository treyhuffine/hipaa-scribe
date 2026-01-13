# ScribeVault

**HIPAA-Compliant Voice Transcription for Clinical Notes**

ScribeVault is a zero-knowledge encrypted voice transcription application designed for healthcare professionals. Record clinical encounters, automatically transcribe them with AI, and generate professionally formatted SOAP notes—all while maintaining strict HIPAA compliance with client-side encryption.

## Features

- **Zero-Knowledge Encryption**: All PHI encrypted locally with AES-256-GCM before storage
- **Voice Transcription**: Groq Whisper Turbo for accurate speech-to-text
- **SOAP Note Generation**: AI-powered clinical note formatting with Groq Llama 3.3 70B
- **Session Security**: 15-minute idle timeout with automatic vault locking
- **Data Lifecycle**: Automatic 12-hour TTL for all notes
- **Brute Force Protection**: 5-attempt limit with automatic data purge
- **Mobile-Friendly**: Responsive design with numeric PIN pads
- **Offline-First**: IndexedDB storage for encrypted notes

## Architecture

### Security Design

- **Client-Side Encryption**: PBKDF2 key derivation (250k iterations) + AES-GCM
- **Firebase Authentication**: Google OAuth and email/password
- **Custom Claims**: Vault secret stored as Firebase custom claim
- **Stateless Server**: No PHI logging or server-side storage
- **Security Headers**: CSP, HSTS, X-Frame-Options, and more

### Tech Stack

- **Frontend**: Next.js 16 (Pages Router), React 19, TypeScript
- **Styling**: Tailwind CSS 4, shadcn/ui components
- **Storage**: IndexedDB via idb-keyval
- **Authentication**: Firebase Auth (client + admin SDK)
- **AI**: Groq SDK (Whisper Turbo + Llama 3.3 70B)
- **Recording**: MediaRecorder API + Wake Lock API

## Setup Instructions

### Prerequisites

- Node.js 24+ (LTS "Krypton")
- npm or yarn
- Firebase project with Authentication enabled
- Groq API key

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Copy the example environment file:

```bash
cp .env.example .env.local
```

Edit `.env.local` with your credentials:

#### Firebase Client Configuration (Public)

Get these from your Firebase project settings:

- `NEXT_PUBLIC_FIREBASE_API_KEY`: Firebase web API key
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`: Your project auth domain (e.g., `project-id.firebaseapp.com`)
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`: Your Firebase project ID
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`: Storage bucket URL
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`: Messaging sender ID
- `NEXT_PUBLIC_FIREBASE_APP_ID`: Firebase app ID

#### Firebase Admin (Server-side only)

- `FIREBASE_SERVICE_ACCOUNT_JSON`: Stringified JSON of your Firebase service account key

  **How to get it:**
  1. Go to Firebase Console → Project Settings → Service Accounts
  2. Click "Generate new private key"
  3. Download the JSON file
  4. Stringify it: `JSON.stringify(require('./path/to/serviceAccountKey.json'))`
  5. Paste the stringified JSON as the environment variable value

#### Groq API (Server-side only)

- `GROQ_API_KEY`: Your Groq API key

  **How to get it:**
  1. Sign up at [console.groq.com](https://console.groq.com)
  2. Navigate to API Keys section
  3. Create a new API key
  4. Copy and paste into `.env.local`

### 3. Enable Firebase Authentication

1. Go to Firebase Console → Authentication
2. Enable Google sign-in provider
3. Enable Email/Password sign-in provider
4. Add your domain to authorized domains (for production)

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Development

### Available Scripts

- `npm run dev` - Start development server on port 3000
- `npm run build` - Build production bundle
- `npm start` - Start production server (after build)
- `npm run lint` - Run ESLint

### Project Structure

```
src/
├── components/         # React UI components
│   ├── Layout.tsx     # Main layout wrapper
│   ├── PINSetup.tsx   # First-time PIN creation
│   ├── PINOverlay.tsx # Vault unlock overlay
│   ├── Recorder.tsx   # Audio recording interface
│   ├── NoteCard.tsx   # Individual note display
│   ├── NotesList.tsx  # Notes list with TTL notice
│   └── SessionTimer.tsx # Session countdown timer
├── context/           # React context providers
│   ├── AuthContext.tsx # Firebase authentication
│   └── VaultContext.tsx # Vault key management
├── hooks/             # Custom React hooks
│   ├── useRecorder.ts # MediaRecorder hook
│   └── useNotes.ts    # Notes management hook
├── lib/               # Core utilities
│   ├── firebase-client.ts # Firebase client SDK
│   ├── firebase-admin.ts  # Firebase admin SDK
│   ├── groq.ts       # Groq SDK initialization
│   ├── crypto.ts     # Encryption utilities
│   ├── storage.ts    # IndexedDB operations
│   └── constants.ts  # App configuration
├── pages/             # Next.js pages
│   ├── _app.tsx      # App wrapper with providers
│   ├── index.tsx     # Main app page
│   ├── login.tsx     # Authentication page
│   └── api/
│       ├── auth/init.ts # Vault secret initialization
│       └── scribe.ts    # Transcription endpoint
└── types/             # TypeScript definitions
    └── index.ts
```

## Deployment

### Docker Deployment

Build the Docker image:

```bash
docker build -t scribevault .
```

Run the container:

```bash
docker run -p 3000:3000 \
  -e NEXT_PUBLIC_FIREBASE_API_KEY="your-api-key" \
  -e NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="your-auth-domain" \
  -e NEXT_PUBLIC_FIREBASE_PROJECT_ID="your-project-id" \
  -e NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="your-storage-bucket" \
  -e NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="your-sender-id" \
  -e NEXT_PUBLIC_FIREBASE_APP_ID="your-app-id" \
  -e FIREBASE_SERVICE_ACCOUNT_JSON='{"type":"service_account",...}' \
  -e GROQ_API_KEY="your-groq-api-key" \
  scribevault
```

### Production Deployment

The application is configured for standalone output and includes:

- **Compression**: Gzip compression enabled
- **Security Headers**: CSP, HSTS, X-Frame-Options, etc.
- **Optimized Build**: Multi-stage Docker build
- **Non-root User**: Runs as `nextjs` user (UID 1001)

Deploy to your preferred platform (Vercel, AWS, Google Cloud, etc.) and ensure all environment variables are set.

## Security Features

### Encryption

- **Algorithm**: AES-256-GCM (FIPS 140-2 compliant)
- **Key Derivation**: PBKDF2 with 250,000 iterations
- **Salt**: User's Firebase UID + vault secret
- **IV**: Unique 12-byte initialization vector per note
- **Key Storage**: Never stored—derived from PIN + vault secret each session

### Session Management

- **Idle Timeout**: 15 minutes of inactivity auto-locks vault
- **Recording Protection**: Idle timer paused during recording
- **Visual Countdown**: Shows time remaining until lock
- **Brute Force Protection**: 5 failed PIN attempts triggers data purge

### Data Lifecycle

- **TTL**: All notes automatically deleted 12 hours after creation
- **Janitor**: Runs every 5 minutes to enforce TTL
- **Manual Deletion**: Secure delete with confirmation
- **Data Purge**: Complete wipe on max PIN attempts

### Server Security

- **Stateless Processing**: No PHI stored on server
- **No PHI Logging**: Transcripts and notes never logged
- **Token Verification**: Firebase Admin SDK validates all requests
- **Multipart Cleanup**: Temporary audio files deleted after processing

## HIPAA Compliance

### Safe Harbor Principle

ScribeVault follows the HIPAA Safe Harbor method:

- **Zero-Knowledge Architecture**: Server never sees unencrypted PHI
- **Local Encryption**: All PHI encrypted on device before storage
- **PII Redaction**: SOAP notes automatically redact non-clinical PII
- **No Server Storage**: PHI never persisted on server filesystem

### Requirements for Deployment

1. **Business Associate Agreement (BAA)**: Required with Firebase and Groq
   - Firebase: Enable HIPAA compliance in Google Cloud
   - Groq: Contact Groq for HIPAA BAA

2. **Access Controls**: Implement organizational policies for:
   - Device security (lock screens, encryption)
   - Employee training on PHI handling
   - Incident response procedures

3. **Audit Logging**: Consider adding audit trail for:
   - User authentication events
   - Data access patterns
   - System configuration changes

4. **Physical Safeguards**: Ensure:
   - Devices running application are secured
   - Network connections use TLS/HTTPS
   - Backups (if any) are encrypted

### Limitations

- **Device Loss**: Lost device = lost data (no recovery mechanism by design)
- **PIN Forgotten**: No PIN recovery (security over convenience)
- **12-Hour TTL**: Notes auto-delete (export/copy before expiration)
- **Browser-Based**: No mobile app (use mobile browser)

## Troubleshooting

### Common Issues

**"Failed to initialize vault"**
- Check Firebase service account JSON is valid
- Ensure Firebase Admin SDK is properly configured
- Verify custom claims are enabled

**"Microphone access denied"**
- Grant microphone permissions in browser
- Check browser settings for site permissions
- Try HTTPS (required for secure contexts)

**"Failed to process audio"**
- Verify Groq API key is correct
- Check Groq API quota/limits
- Ensure audio file is valid WebM format

**"Notes not loading"**
- Check browser console for errors
- Verify vault is unlocked
- Try refreshing the page

### Browser Compatibility

- **Chrome/Edge**: Full support
- **Safari**: Full support (iOS 15+)
- **Firefox**: Full support
- **Opera**: Full support

**Required browser features:**
- MediaRecorder API
- Web Crypto API
- IndexedDB
- Wake Lock API (optional, graceful degradation)

## Contributing

This is a private HIPAA-compliant application. For issues or questions, contact the development team.

## License

Proprietary - All Rights Reserved

## Acknowledgments

- **Next.js**: React framework
- **Firebase**: Authentication and custom claims
- **Groq**: AI transcription and SOAP formatting
- **shadcn/ui**: Beautiful UI components
- **Tailwind CSS**: Utility-first styling

---

**Built with care for healthcare professionals by healthcare technologists.**
