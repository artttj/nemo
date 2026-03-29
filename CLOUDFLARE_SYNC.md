# Cloudflare D1 Sync Setup Guide

> **For Chrome Extension Users**

Sync your Nemo password vault across all your devices using Cloudflare's free D1 database. Your data stays encrypted end-to-end.

---

## What You Need

- A free [Cloudflare](https://dash.cloudflare.com/sign-up) account
- The Nemo extension installed on Chrome
- About 5 minutes to set up

---

## Step 1: Create a D1 Database

1. Go to [dash.cloudflare.com](https://dash.cloudflare.com) and sign in
2. Click **Workers & Pages** in the left sidebar
3. Click **D1**
4. Click **Create Database**
5. Name it `nemo_vault` (or any name you prefer)
6. Click **Create**

**After creation, copy the Database ID** shown on the page. It looks like:
```
52147a7c-8711-466c-9328-a3caac206d13
```

---

## Step 2: Get Your Account ID

1. In the Cloudflare dashboard, look at the right sidebar
2. Find **Account ID** - it looks like:
```
1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p
```
3. Copy this value

---

## Step 3: Create an API Token

1. Click your profile icon (top right) → **My Profile**
2. Go to the **API Tokens** tab
3. Click **Create Token**
4. Click **Get Started** next to "Create Custom Token"
5. Configure the token:
   - **Token name**: `Nemo Password Manager`
   - **Permissions**: Click **Add more**
     - Select: **Account** → **D1** → **Edit**
6. Click **Continue to summary**
7. Click **Create Token**

**Important**: Copy the token immediately - you won't see it again!

---

## Step 4: Configure Nemo Extension

1. Click the Nemo icon in Chrome toolbar
2. Unlock your vault
3. Click the **Settings** (gear) icon
4. Click the **Sync** tab
5. Enter your credentials:
   - **Account ID**: Your Cloudflare account ID
   - **Database ID**: Your D1 database ID (e.g., `52147a7c-8711-466c-9328-a3caac206d13`)
   - **API Token**: The token you just created
6. Check **Auto-sync on changes** (recommended)
7. Click **Test connection** to verify
8. If successful, click **Enable sync**

---

## Step 5: Sync Other Devices

Repeat Step 4 on each device using the **same three values**. Your vault will sync automatically between all devices.

---

## How Sync Works

| Feature | Behavior |
|---------|----------|
| **Encryption** | Data is encrypted on your device before syncing. Cloudflare only sees ciphertext. |
| **Conflict resolution** | The most recent change wins based on timestamps |
| **Auto-sync** | Syncs automatically when you add, edit, or delete entries (if enabled) |
| **Manual sync** | Click "Sync now" in settings at any time |

---

## Security

- **End-to-end encryption**: Your vault key never leaves your device. Cloudflare stores only encrypted data.
- **Limited token scope**: The API token can only access D1 databases, nothing else in your Cloudflare account.
- **Local storage**: Your credentials are stored in Chrome's encrypted local storage.
- **No plaintext**: Passwords are never transmitted or stored in plaintext.

---

## Troubleshooting

### "Connection failed" error
- Double-check all three values are entered correctly
- Ensure your API token has the D1:Edit permission
- Make sure the database exists in your Cloudflare account

### "Permission denied" error
- Your API token may be missing the Account → D1 → Edit permission
- Create a new token with the correct permissions

### Sync not happening
- Check your internet connection
- Click "Sync now" manually to test
- Verify "Last sync" time updates

### Data not appearing on another device
- Ensure both devices show "Cloudflare sync enabled"
- Click "Sync now" on the target device
- Check that both devices use the same database ID

---

## Disabling Sync

To stop syncing:

1. Go to Nemo Settings → Sync
2. Click **Disable**

Your local vault remains intact. The data in Cloudflare D1 is not deleted.

To completely remove cloud data:

1. Go to Cloudflare Dashboard → Workers & Pages → D1
2. Delete your `nemo_vault` database

---

## Pricing

Cloudflare D1 has a generous [free tier](https://developers.cloudflare.com/d1/platform/pricing/):

- **5 million rows** stored
- **100,000 rows read** per day
- **50,000 rows written** per day

This is more than enough for personal password vault syncing.

---

## Privacy

- Cloudflare cannot decrypt your vault (they don't have the key)
- Only you can access your passwords
- Sync data is tied to your Cloudflare account

---

## Need Help?

Open an issue: https://github.com/artyomxyz/nemo/issues
