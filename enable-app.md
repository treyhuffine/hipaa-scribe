# ScribeVault: Human Setup Guide

This is everything you need to do — from zero to deployed.

---

## Phase 1: Google Cloud Setup

### 1.1 Create Google Cloud Project

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Click the project dropdown (top-left, next to "Google Cloud")
3. Click **New Project**
4. Enter:
   - Project name: `scribevault`
   - Organization: Leave as-is or select yours
5. Click **Create**
6. Wait ~30 seconds, then select the new project from the dropdown

### 1.2 Enable Billing

1. Go to **Billing** in the left sidebar (or search for it)
2. Link a billing account (or create one if you don't have one)
3. This is required even though you'll stay in free tier

### 1.3 Sign the HIPAA BAA

1. Go to **IAM & Admin** → **Compliance** (or search "Compliance" in the search bar)
2. Find **HIPAA Business Associate Amendment**
3. Click **Review and Accept**
4. Check the boxes confirming you're a covered entity or business associate
5. Click **Accept**

### 1.4 Enable Required APIs

Open Cloud Shell (terminal icon in top-right) or run locally if you have `gcloud` CLI installed:

```bash
# Set your project
gcloud config set project scribevault

# Enable required APIs
gcloud services enable run.googleapis.com
gcloud services enable identitytoolkit.googleapis.com
gcloud services enable cloudresourcemanager.googleapis.com
gcloud services enable artifactregistry.googleapis.com
gcloud services enable cloudbuild.googleapis.com
```

---

## Phase 2: Firebase / Identity Platform Setup

### 2.1 Enable Identity Platform

1. In Google Cloud Console, search for **Identity Platform**
2. Click **Enable Identity Platform**
3. This is the "enterprise" Firebase Auth that falls under your GCP BAA

### 2.2 Add Google Sign-In Provider

1. In Identity Platform, click **Add a Provider**
2. Select **Google**
3. Toggle **Enable** to on
4. For **Web Client ID** — if it auto-populates, leave it. If not:
   - Click **Configure OAuth Consent Screen** (opens in new tab)
   - Choose **External** (unless you have Google Workspace)
   - Fill in required fields:
     - App name: `ScribeVault`
     - User support email: your email
     - Developer contact: your email
   - Click **Save and Continue** through the scopes (no changes needed)
   - Add your email as a test user
   - Click **Back to Dashboard**
5. Back in Identity Platform, the Web Client should now be available
6. Click **Save**

### 2.3 Get Firebase Client Config

1. Go to [console.firebase.google.com](https://console.firebase.google.com)
2. Click **Add project** → Select your existing `scribevault` GCP project
3. Disable Google Analytics (not needed, simpler)
4. Click **Create project** → **Continue**
5. In Firebase Console, click the **Web** icon (`</>`) to add a web app
6. Register app name: `scribevault-web`
7. Copy the `firebaseConfig` object — you'll need these values:

```javascript
const firebaseConfig = {
  apiKey: 'AIza...',
  authDomain: 'scribevault.firebaseapp.com',
  projectId: 'scribevault',
  storageBucket: 'scribevault.appspot.com',
  messagingSenderId: '123456789',
  appId: '1:123456789:web:abc123',
};
```

### 2.4 Create Firebase Admin Service Account

1. Go back to **Google Cloud Console**
2. Navigate to **IAM & Admin** → **Service Accounts**
3. Click **+ Create Service Account**
4. Name: `firebase-admin`
5. Click **Create and Continue**
6. Grant role: **Firebase Admin SDK Administrator Service Agent**
   - If you can't find it, use **Firebase Admin** or just skip (we'll use a key)
7. Click **Done**
8. Click on the newly created service account email
9. Go to **Keys** tab
10. Click **Add Key** → **Create new key**
11. Select **JSON**
12. Click **Create** — this downloads a JSON file
13. **Keep this file safe** — you'll need it for deployment

---

## Phase 3: Groq Setup

### 3.1 Create Groq Account

1. Go to [console.groq.com](https://console.groq.com)
2. Sign up / Sign in

### 3.2 Sign the Groq BAA

1. Go to **Settings** (gear icon or your profile)
2. Look for **Compliance** or **Legal** section
3. Find the **HIPAA Business Associate Agreement**
4. Review and accept it

> Note: If you can't find the BAA option, you may need to upgrade to a paid/developer tier or contact Groq support. Their free tier may not include BAA coverage.

### 3.3 Get API Key

1. Go to **API Keys** section
2. Click **Create API Key**
3. Name it: `scribevault-prod`
4. Copy and save the key (you won't see it again)

---

## Phase 4: Local Environment Setup

### 4.1 Create Environment File

In your project root, create `.env.local`:

```env
# Firebase Client (Public - these go to the browser)
NEXT_PUBLIC_FIREBASE_API_KEY=AIza...your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=scribevault.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=scribevault
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=scribevault.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123

# Firebase Admin (Server-side only)
# Paste the ENTIRE JSON file contents as a single line
FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"scribevault",...}

# Groq API
GROQ_API_KEY=gsk_...your-groq-key
```

**Important**: The `FIREBASE_SERVICE_ACCOUNT_JSON` should be the entire contents of the JSON key file you downloaded, minified to a single line. You can do this:

```bash
# On Mac/Linux, minify the JSON:
cat ~/Downloads/scribevault-firebase-admin.json | jq -c .
```

Or just manually remove all newlines from the JSON.

### 4.2 Add Authorized Domains (for local dev)

1. Go to Firebase Console → **Authentication** → **Settings**
2. Click **Authorized domains**
3. Add: `localhost`
4. This allows Google Sign-in to work on localhost

### 4.3 Run Locally

```bash
# Install dependencies (if not done)
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 4.4 Test the Flow

1. Click "Sign in with Google"
2. Complete Google OAuth
3. You should be prompted to create a PIN
4. Try recording (allow microphone access)
5. Verify transcription works

---

## Phase 5: Deploy to Google Cloud Run

### 5.1 Install Google Cloud CLI (if not installed)

```bash
# Mac
brew install google-cloud-sdk

# Or download from: https://cloud.google.com/sdk/docs/install
```

Then authenticate:

```bash
gcloud auth login
gcloud config set project scribevault
```

### 5.2 Create a Production Environment File

Create `.env.production` (or you'll pass these as secrets):

```env
NEXT_PUBLIC_FIREBASE_API_KEY=AIza...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=scribevault.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=scribevault
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=scribevault.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123
```

### 5.3 Store Secrets in Google Secret Manager

For sensitive values, use Secret Manager:

```bash
# Create secrets
echo -n '{"type":"service_account",...your-full-json...}' | \
  gcloud secrets create firebase-admin-key --data-file=-

echo -n 'gsk_your_groq_api_key' | \
  gcloud secrets create groq-api-key --data-file=-
```

Grant Cloud Run access to secrets:

```bash
# Get your project number
PROJECT_NUMBER=$(gcloud projects describe scribevault --format='value(projectNumber)')

# Grant access
gcloud secrets add-iam-policy-binding firebase-admin-key \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

gcloud secrets add-iam-policy-binding groq-api-key \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

### 5.4 Deploy to Cloud Run

```bash
gcloud run deploy scribevault \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars="NEXT_PUBLIC_FIREBASE_API_KEY=AIza...,NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=scribevault.firebaseapp.com,NEXT_PUBLIC_FIREBASE_PROJECT_ID=scribevault,NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=scribevault.appspot.com,NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789,NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc123" \
  --set-secrets="FIREBASE_SERVICE_ACCOUNT_JSON=firebase-admin-key:latest,GROQ_API_KEY=groq-api-key:latest" \
  --memory=1Gi \
  --timeout=300
```

**Flags explained:**

- `--source .` — Build from current directory
- `--allow-unauthenticated` — Public website (Firebase handles auth)
- `--set-env-vars` — Public config
- `--set-secrets` — Pulls from Secret Manager
- `--memory=1Gi` — Enough for audio processing
- `--timeout=300` — 5 minutes for long transcriptions

### 5.5 Note Your Service URL

After deployment completes, you'll see:

```
Service URL: https://scribevault-xxxxx-uc.a.run.app
```

Copy this URL.

---

## Phase 6: Post-Deployment Configuration

### 6.1 Add Production Domain to Authorized Domains

1. Go to Firebase Console → **Authentication** → **Settings** → **Authorized domains**
2. Add your Cloud Run URL: `scribevault-xxxxx-uc.a.run.app`

### 6.2 Update OAuth Consent Screen (if needed)

1. Go to Google Cloud Console → **APIs & Services** → **OAuth consent screen**
2. If still in "Testing" mode and you want others to use it:
   - Add your wife's email to **Test users**, OR
   - Click **Publish App** to make it available to anyone

### 6.3 Test Production

1. Open your Cloud Run URL
2. Sign in with Google
3. Create PIN
4. Test recording and transcription

---

## Phase 7: Optional — Custom Domain

If you want `scribe.yourdomain.com` instead of the Cloud Run URL:

### 7.1 Map Custom Domain

```bash
gcloud run domain-mappings create \
  --service=scribevault \
  --domain=scribe.yourdomain.com \
  --region=us-central1
```

### 7.2 Update DNS

Add the DNS records shown in the output (usually A and AAAA records) to your domain registrar.

### 7.3 Update Firebase Authorized Domains

Add `scribe.yourdomain.com` to the authorized domains list.

---

## Quick Reference: All Your Credentials

Keep this somewhere safe:

| Item                 | Location                                           |
| -------------------- | -------------------------------------------------- |
| Google Cloud Project | `scribevault`                                      |
| Firebase Config      | Firebase Console → Project Settings → Your apps    |
| Firebase Admin Key   | Downloaded JSON + stored in Secret Manager         |
| Groq API Key         | Groq Console → API Keys + stored in Secret Manager |
| Cloud Run URL        | `https://scribevault-xxxxx-uc.a.run.app`           |
| BAA Status           | GCP: IAM & Admin → Compliance / Groq: Settings     |

---

## Troubleshooting

| Issue                                   | Solution                                         |
| --------------------------------------- | ------------------------------------------------ |
| "Unauthorized domain" on Google Sign-in | Add domain to Firebase Auth → Authorized domains |
| "Permission denied" on deploy           | Run `gcloud auth login` again                    |
| Secrets not loading                     | Check IAM binding for secret access              |
| Timeout during transcription            | Increase `--timeout` value in deploy command     |
| "Invalid API key" from Groq             | Verify key in Secret Manager, redeploy           |

---

You're ready! Once deployed, your wife can bookmark the URL and start using it immediately. The first time she logs in, she'll create her PIN, and she's off to the races.
