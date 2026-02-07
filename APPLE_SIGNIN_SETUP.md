# Apple Sign In Setup Guide

This guide provides detailed step-by-step instructions for configuring Sign in with Apple for the Tic Tac Toe Multiplayer iOS app.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Apple Developer Console Setup](#apple-developer-console-setup)
3. [Server Configuration](#server-configuration)
4. [iOS App Configuration](#ios-app-configuration)
5. [Testing](#testing)
6. [Troubleshooting](#troubleshooting)

## Prerequisites

- Active Apple Developer Program membership
- Access to Apple Developer Console
- Server domain configured (e.g., Railway deployment URL)
- Xcode 14.0 or later

## Apple Developer Console Setup

### Step 1: Access Apple Developer Console

1. Go to [https://developer.apple.com/account](https://developer.apple.com/account)
2. Sign in with your Apple Developer account
3. Navigate to **Certificates, Identifiers & Profiles**

### Step 2: Configure Your App Identifier

1. Click **Identifiers** in the left sidebar
2. Find your existing app identifier (e.g., `com.yourcompany.tictactoe`)
3. Click on it to edit
4. Scroll down and enable **Sign in with Apple**
5. Click **Save**

### Step 3: Create a Services ID

The Services ID is used for server-side authentication.

1. Click the **+** button (top left) to add a new identifier
2. Select **Services IDs** → Click **Continue**
3. Fill in the details:
   - **Description**: "Tic Tac Toe Sign In" (user-friendly name)
   - **Identifier**: Use your app's bundle ID (e.g., `com.yourcompany.tictactoe`)
   - Check **Sign in with Apple**
4. Click **Continue** → **Register**

### Step 4: Configure the Services ID

1. Click on your newly created Services ID to configure it
2. Check **Sign in with Apple** → Click **Configure**
3. In the configuration dialog:
   - **Primary App ID**: Select your iOS app identifier
   - **Domains and Subdomains**: Add your server domain
     - Example: `tic-tac-toe-multiplayer-production.up.railway.app`
   - **Return URLs**: Add your callback URL
     - Example: `https://tic-tac-toe-multiplayer-production.up.railway.app/callbacks/apple`
4. Click **Save** → **Continue** → **Save**

### Step 5: Create a Key for Sign in with Apple

This key is used for server-side token verification.

1. Click **Keys** in the left sidebar
2. Click the **+** button to add a new key
3. Fill in the details:
   - **Key Name**: "Tic Tac Toe Sign In Key"
   - Check **Sign in with Apple**
   - Click **Configure** next to "Sign in with Apple"
   - Select your Primary App ID
   - Click **Save**
4. Click **Continue** → **Register**
5. **IMPORTANT**: Click **Download** to download your `.p8` key file
   - ⚠️ This is your only chance to download this file!
   - Save it securely - you'll need it for the server
6. Note down the following information:
   - **Key ID**: Shown on the download page (e.g., `ABC123DEF4`)
   - **Team ID**: Found in the top-right of the page (e.g., `XYZ9876543`)

## Server Configuration

### Step 1: Upload Private Key

1. Upload your downloaded `.p8` key file to your server
2. Note the path where you stored it (e.g., `/app/keys/AuthKey_ABC123DEF4.p8`)
3. Make sure the file has appropriate permissions (readable by the Node.js process)

### Step 2: Configure Environment Variables

Add the following environment variables to your server (e.g., Railway):

```bash
APPLE_CLIENT_ID=com.yourcompany.tictactoe
APPLE_TEAM_ID=XYZ9876543
APPLE_KEY_ID=ABC123DEF4
APPLE_PRIVATE_KEY_PATH=/app/keys/AuthKey_ABC123DEF4.p8
```

Replace the values with your actual:
- **APPLE_CLIENT_ID**: Your Services ID identifier
- **APPLE_TEAM_ID**: Your Apple Developer Team ID
- **APPLE_KEY_ID**: Your Sign in with Apple Key ID
- **APPLE_PRIVATE_KEY_PATH**: Path to your `.p8` key file on the server

### Step 3: Deploy Server Changes

1. Commit and push the server changes to your repository
2. Ensure the environment variables are set in your deployment environment
3. Verify the server starts successfully and loads the Apple private key

## iOS App Configuration

### Step 1: Enable Sign in with Apple in Xcode

1. Open `TicTacToeMultiplayer.xcodeproj` in Xcode
2. Select the **TicTacToeMultiplayer** target
3. Go to **Signing & Capabilities** tab
4. Click **+ Capability**
5. Search for and add **Sign in with Apple**
6. Verify it appears in the capabilities list

### Step 2: Build and Test

1. Build the iOS app (Cmd+B)
2. Run on a simulator or device
3. Verify the "Sign in with Apple" button appears on the login screen

## Testing

### Test Cases

#### 1. New Apple User
- Tap "Sign in with Apple" button
- Authenticate with Face ID/Touch ID/Passcode
- Choose whether to share or hide email
- Enter username when prompted
- Verify game loads correctly

#### 2. Existing Auth0 User
- Login with existing Auth0 account
- Verify game loads and data persists
- Logout and login again - should work normally

#### 3. Apple User Returning
- Sign in with Apple (same account as before)
- Username should be remembered
- Game state should resume if applicable

#### 4. Account Switching
- Logout from Apple account
- Login with Auth0 (different account)
- Verify accounts are separate

#### 5. Privacy Features
- Sign in with Apple using "Hide My Email"
- Verify email relay address is handled correctly
- Check server logs for proper email storage

### Validation Checklist

- [ ] Both auth buttons visible on iOS login screen
- [ ] Apple Sign In works and stores credentials
- [ ] Server correctly verifies Apple tokens
- [ ] MongoDB stores Apple users with correct userId
- [ ] Existing Auth0 users can still login
- [ ] Username setup works for both providers
- [ ] Highscores work for both auth types
- [ ] Game state persists for both auth types
- [ ] Logout works for both providers
- [ ] "Hide My Email" works correctly

## Troubleshooting

### Common Issues

#### "Invalid Client" Error

**Cause**: Services ID not configured correctly or domain mismatch

**Solution**:
- Verify your Services ID configuration in Apple Developer Console
- Ensure the domain and return URL match your server exactly
- Check that APPLE_CLIENT_ID matches your Services ID

#### "Invalid Token" Error

**Cause**: Server cannot verify Apple token

**Solution**:
- Verify the private key file is uploaded and readable
- Check APPLE_KEY_ID and APPLE_TEAM_ID are correct
- Ensure apple-signin-auth npm package is installed
- Check server logs for detailed error messages

#### "Cannot Load Private Key" Error

**Cause**: Private key file not found or permissions issue

**Solution**:
- Verify APPLE_PRIVATE_KEY_PATH is correct
- Check file exists at the specified path
- Ensure the Node.js process has read permissions

#### Sign In Button Not Showing

**Cause**: Sign in with Apple capability not enabled in Xcode

**Solution**:
- Open Xcode project
- Go to Signing & Capabilities
- Add "Sign in with Apple" capability
- Clean build folder (Cmd+Shift+K) and rebuild

#### Email Always Shows as Private Relay

**Cause**: This is expected behavior when user chooses "Hide My Email"

**Solution**:
- This is a feature, not a bug
- Server must handle relay emails (e.g., `xyz@privaterelay.appleid.com`)
- Email is only provided on first sign-in
- Store email in database when first received

## Additional Resources

- [Apple Sign In Documentation](https://developer.apple.com/documentation/sign_in_with_apple)
- [apple-signin-auth npm package](https://www.npmjs.com/package/apple-signin-auth)
- [App Store Review Guidelines 4.8](https://developer.apple.com/app-store/review/guidelines/#sign-in-with-apple)

## Support

If you encounter issues not covered in this guide:

1. Check server logs for detailed error messages
2. Verify all environment variables are set correctly
3. Test on a physical device (some features may not work in simulator)
4. Review Apple's Sign in with Apple documentation
5. Check Railway/deployment logs for configuration issues
