# Firestore Security Rules Deployment

This document explains how to deploy the Firestore security rules for the ScribeVault application.

## Security Rules Overview

The `firestore.rules` file contains security rules that:
- **Allow read** access to vault secrets only by the authenticated user who owns them
- **Allow create** of vault secrets only once (first-time user initialization)
- **Deny all updates and deletes** to vault secrets (immutable after creation)
- **Deny all other collections** by default (vault secrets only)

## Deployment Methods

### Method 1: Firebase CLI (Recommended)

If you have Firebase CLI installed:

```bash
# Login to Firebase (if not already logged in)
firebase login

# Deploy only the Firestore rules
firebase deploy --only firestore:rules
```

### Method 2: Firebase Console (Manual)

If you don't have Firebase CLI or prefer manual deployment:

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project: **scribevault**
3. Navigate to **Firestore Database** in the left sidebar
4. Click on the **Rules** tab at the top
5. Copy the entire contents of `firestore.rules` file
6. Paste into the rules editor
7. Click **Publish** button

## Verification

After deployment, verify the rules are active:

1. Check the **Rules** tab in Firebase Console shows the updated rules
2. Look for the timestamp "Last published" to confirm deployment
3. Test the rules:
   - Authenticate as a user
   - Try to read vault secret (should succeed)
   - Try to update vault secret (should fail with permission denied)
   - Try to delete vault secret (should fail with permission denied)

## Testing Rules (Optional)

You can test rules in the Firebase Console using the Rules Playground:

1. Go to Firestore Database → Rules tab
2. Click **Rules Playground** button
3. Test read operation:
   - Location: `/users/YOUR_UID/vault/secret`
   - Authenticated: Yes
   - Auth UID: `YOUR_UID`
   - Expected: **Allow**

4. Test update operation:
   - Location: `/users/YOUR_UID/vault/secret`
   - Authenticated: Yes
   - Auth UID: `YOUR_UID`
   - Expected: **Deny**

## Important Notes

- **These rules enforce immutability**: Once a vault secret is created, it cannot be modified or deleted
- **Per-user isolation**: Users can only access their own vault secret
- **First-time creation only**: The `!exists()` check ensures vault secret can only be created once
- **All other data is denied**: Only the vault secret collection is accessible

## Troubleshooting

### Rules won't deploy
- Ensure you're logged into the correct Firebase project
- Check for syntax errors in firestore.rules file
- Verify you have Owner or Editor permissions on the Firebase project

### Permission denied errors
- Verify user is authenticated
- Check that user UID matches the document path
- Confirm rules have been published (check timestamp in console)

### Can't create vault secret
- Check if document already exists (try reading it first)
- Verify authentication is working
- Check Firebase Console logs for detailed error messages
