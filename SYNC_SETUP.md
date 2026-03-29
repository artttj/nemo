# Cloudflare Sync Setup for Nemo (Chrome Extension)

Sync your encrypted vault across all your devices using Cloudflare's free D1 database.

## What You Need

- A free Cloudflare account
- About 5 minutes
- The Nemo extension installed on each device you want to sync

## Quick Setup

### Step 1: Create a Database

1. Go to [dash.cloudflare.com](https://dash.cloudflare.com) and sign in
2. Click **Workers & Pages** in the left menu
3. Click **D1**
4. Click **Create Database**
5. Name it `nemo_vault` (or any name you like)
6. Click **Create**

**Copy the Database ID** shown on the next page. It looks like:
```
52147a7c-8711-466c-9328-a3caac206d13
```

### Step 2: Get Your Account ID

1. While still in the Cloudflare dashboard, look at the right sidebar
2. You'll see **Account ID** with a string like:
```
1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p
```
3. Copy this value

### Step 3: Create an API Token

1. Click your profile icon (top right) → **My Profile**
2. Go to **API Tokens** tab
3. Click **Create Token**
4. Scroll down and click **Get Started** next to "Create Custom Token"
5. Fill in:
   - **Token name**: Nemo Password Manager
   - Under **Permissions**, click **Add more**, then select:
     - **Account** → **D1** → **Edit**
6. Click **Continue to summary**
7. Click **Create Token**
8. **Copy the token immediately** - you won't see it again

### Step 4: Enable Sync in Nemo

1. Click the Nemo icon in Chrome
2. Unlock your vault
3. Click the **gear icon** (Settings)
4. Click **Sync** tab
5. Paste your credentials:
   - **Account ID**: Your Cloudflare account ID
   - **Database ID**: The D1 database ID you copied
   - **API Token**: The token you just created
6. Check **Auto-sync on changes** (recommended)
7. Click **Test connection**
8. If successful, click **Enable sync**

### Step 5: Sync Other Devices

Repeat Step 4 on each device using the **same credentials**. Your vault will sync automatically.

## How It Works

- Your vault data is **encrypted before leaving your device**
- Cloudflare only stores the encrypted ciphertext
- They cannot see your passwords
- Sync happens directly between your devices and Cloudflare

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "Connection failed" | Double-check all three values (Account ID, Database ID, API Token) |
| "Permission denied" | Make sure your API token has D1:Edit permission for the Account |
| Sync not working | Check internet connection, try clicking "Sync now" |
| Data not appearing | Ensure both devices completed sync, check "Last sync" time |

## Security Notes

- Your API token is stored locally in Chrome's encrypted storage
- The token only has access to D1 databases, nothing else
- If you lose access to your token, create a new one in Cloudflare
- To stop syncing, click **Disable** in Nemo settings - your local vault remains

## Pricing

Cloudflare D1 has a generous free tier:
- 5 million rows stored
- 100,000 rows read per day
- 50,000 rows written per day

This is more than enough for personal password vault syncing.

## Need Help?

Open an issue at: https://github.com/artyomxyz/nemo/issues
