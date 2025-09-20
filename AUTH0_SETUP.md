# Auth0 Setup Guide for Tic Tac Toe Game

This guide will help you set up Auth0 authentication for your Tic Tac Toe game.

## Step 1: Create Auth0 Account

1. Go to [auth0.com](https://auth0.com)
2. Click "Sign Up" and create a free account
3. Choose "Personal" for account type
4. Complete the registration and verify your email

## Step 2: Create Auth0 Application

1. In your Auth0 Dashboard, go to **Applications** > **Applications**
2. Click **"+ Create Application"**
3. Name it: `Tic Tac Toe Game`
4. Choose: **Single Page Web Applications**
5. Click **Create**

## Step 3: Configure Application Settings

In your newly created application, go to the **Settings** tab and configure:

### Allowed Callback URLs
```
http://localhost:3000, https://your-deployed-url.com
```

### Allowed Logout URLs
```
http://localhost:3000, https://your-deployed-url.com
```

### Allowed Web Origins
```
http://localhost:3000, https://your-deployed-url.com
```

### Allowed Origins (CORS)
```
http://localhost:3000, https://your-deployed-url.com
```

**Important:** Replace `https://your-deployed-url.com` with your actual deployed URL when you deploy to production.

## Step 4: Get Your Credentials

From the **Settings** tab of your application, copy these values:

- **Domain** (e.g., `dev-abc123.us.auth0.com`)
- **Client ID** (a long string like `abc123xyz789...`)

## Step 5: Update Environment Variables

1. Open the `.env` file in your project root
2. Replace the placeholder values with your actual Auth0 credentials:

```env
# Auth0 Configuration
AUTH0_DOMAIN=dev-oi0kyicuguit0u6y.eu.auth0.com
AUTH0_CLIENT_ID=3bVJoo8MQs6iTztvw02Ci0H2Qrroq0Hg
AUTH0_CLIENT_SECRET=your-client-secret-here
AUTH0_AUDIENCE=https://dev-oi0kyicuguit0u6y.eu.auth0.com/api/v2/

# Application Configuration
NODE_ENV=development
PORT=3000

# Session Secret
SESSION_SECRET=tic-tac-toe-super-secret-key-change-in-production-2024
```

**Note:** You still need to get your `AUTH0_CLIENT_SECRET` from the Auth0 Dashboard. Go to your application's Settings tab and copy the "Client Secret" value.

## Step 6: Configure User Management Features

### Enable User Registration
1. Go to **Authentication** > **Database** > **Username-Password-Authentication**
2. In the **Settings** tab, enable:
   - ✅ **Disable Sign Ups** (UNCHECKED - to allow registrations)
   - ✅ **Username** (if you want username-based login)

### Enable Password Reset
1. In the same database connection settings
2. Go to **Password Policy** tab
3. Configure your password requirements
4. Go to **Custom Database** > **Templates** if you want custom reset emails

## Step 7: Test Your Setup

1. Start your server: `npm start` or `node server.js`
2. Open `http://localhost:3000`
3. Try logging in with Auth0:
   - Click "Login with Auth0"
   - You should be redirected to Auth0's login page
   - Create a test account or login
   - You should be redirected back to your game

## Features Now Available

### ✅ **User Registration**
- Users can create accounts via Auth0
- Secure password management
- Email verification

### ✅ **Login Options**
- Auth0 authentication (recommended)
- Legacy username/password (for backward compatibility)
- Local account registration (for testing)

### ✅ **Password Management**
- Reset forgotten passwords via Auth0
- Change password in Auth0 dashboard
- Secure authentication tokens

### ✅ **User Profiles**
- User information stored in Auth0
- Profile management via Auth0 dashboard

## Production Deployment

When deploying to production:

1. Update your Auth0 application settings with production URLs
2. Set environment variables in your hosting platform
3. Use HTTPS for all URLs
4. Consider enabling additional Auth0 features like:
   - Multi-factor authentication
   - Social login providers (Google, Facebook, etc.)
   - Custom branding

## Troubleshooting

### Common Issues:

**1. "Invalid state parameter"**
- Check that your callback URLs are correctly configured in Auth0

**2. CORS errors**
- Ensure all your URLs are added to "Allowed Origins (CORS)" in Auth0

**3. "Callback URL mismatch"**
- Verify the callback URLs match exactly (no trailing slashes, correct protocol)

**4. Token verification fails**
- Check that your Auth0 domain and client ID are correct in `.env`

### Testing Locally:
```bash
# Start the server
npm start

# Server should show:
# 🚀 Server running on http://localhost:3000
# 📊 Health check: /health
# 🎮 Game ready for 2 players
# 👥 Available users: (legacy users listed)
# 🌐 Environment: development
```

## Support

If you encounter issues:
1. Check the browser console for errors
2. Check the server logs
3. Verify your Auth0 configuration matches this guide
4. Test with Auth0's debugger extension

Your Auth0 setup is now complete! Users can register, login, and manage their passwords securely through Auth0.