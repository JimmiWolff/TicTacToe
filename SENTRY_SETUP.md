# Sentry Monitoring Setup

This guide explains how to set up Sentry for production monitoring of the Tic Tac Toe multiplayer game.

## Overview

Sentry has been integrated for:
- **Server-side error tracking** (Node.js/Express)
- **Client-side error tracking** (Browser)
- **Performance monitoring** (APM)
- **Session replay** (Browser)
- **Profiling** (Node.js)

## Quick Start

### 1. Create Sentry Account

1. Go to [https://sentry.io](https://sentry.io)
2. Sign up for a free account
3. Create a new project:
   - Platform: **Node.js + JavaScript**
   - Project name: `tic-tac-toe` (or your preferred name)

### 2. Get Your DSN

After creating the project:

1. Navigate to **Settings → Projects → [Your Project] → Client Keys (DSN)**
2. Copy the **DSN** URL (looks like: `https://abc123@o123.ingest.sentry.io/456`)

### 3. Configure Environment Variables

Add to your `.env` file:

```bash
# Sentry Configuration
SENTRY_DSN=https://your-actual-dsn@sentry.io/your-project-id
NODE_ENV=production  # Sentry is only active in production by default
```

**Optional variables:**

```bash
# Use separate DSN for client-side (recommended for security)
SENTRY_DSN_PUBLIC=https://your-public-dsn@sentry.io/your-project-id

# Enable Sentry in development (default: false)
SENTRY_ENABLED=true
```

### 4. Deploy

Deploy your application with the new environment variables. Sentry will automatically start capturing errors in production.

## What Gets Tracked

### Server-Side (Node.js)
- Express request/response errors
- Socket.IO connection errors
- Game logic errors
- Database errors
- User context (userId, username)
- Game context (roomCode)

### Client-Side (Browser)
- JavaScript runtime errors
- Socket connection errors
- Auth0 errors
- User interactions (breadcrumbs)
- Session replays (10% of sessions, 100% on errors)

## Testing Sentry Integration

### Test Server-Side Errors

Add a test endpoint to `server.js`:

```javascript
app.get('/debug-sentry', (req, res) => {
    throw new Error('Test Sentry server error');
});
```

Then visit: `http://localhost:3000/debug-sentry`

### Test Client-Side Errors

Open browser console and run:

```javascript
throw new Error('Test Sentry client error');
```

Or add a test button in your HTML:

```javascript
Sentry.captureException(new Error('Test error from button'));
```

## Monitoring in Production

### View Errors

1. Log into [Sentry.io](https://sentry.io)
2. Select your project
3. View **Issues** to see all captured errors
4. Click on any issue to see:
   - Stack traces
   - User context
   - Breadcrumbs (user actions leading to error)
   - Environment details

### Performance Monitoring

1. Go to **Performance** tab
2. View transaction times for:
   - HTTP requests
   - Database queries
   - Socket.IO operations

### Session Replay

1. Go to **Replays** tab
2. Watch video replays of user sessions where errors occurred
3. See exactly what the user did before the error

## Configuration Details

### Sampling Rates

Current configuration:

- **Traces (Performance):** 10% in production, 100% in development
- **Profiles (CPU):** 10% in production, 100% in development
- **Session Replays:** 10% of all sessions, 100% on errors

Adjust in `server.js` and `script.js` if needed.

### User Privacy

Sentry automatically scrubs:
- Passwords
- Credit card numbers
- Authorization headers

Configure additional scrubbing in Sentry dashboard: **Settings → Security & Privacy**

### Data Retention

Free tier includes:
- 5,000 errors per month
- 10,000 transactions per month
- 50 replays per month
- 90-day retention

## Disabling Sentry

### Temporarily Disable
Set in `.env`:
```bash
NODE_ENV=development  # Disables Sentry by default
```

### Completely Remove
```bash
npm uninstall @sentry/node @sentry/browser @sentry/profiling-node
```

Then remove Sentry code from:
- `server.js`
- `script.js`
- `index.html` (remove Sentry CDN script)

## Support

- **Sentry Docs:** [https://docs.sentry.io](https://docs.sentry.io)
- **Node.js Guide:** [https://docs.sentry.io/platforms/node/](https://docs.sentry.io/platforms/node/)
- **Browser Guide:** [https://docs.sentry.io/platforms/javascript/](https://docs.sentry.io/platforms/javascript/)

## Security Notes

1. **Never commit your DSN to public repositories** - Keep `.env` in `.gitignore`
2. **Use separate DSNs** for client and server if possible
3. **Configure rate limits** in Sentry dashboard to prevent abuse
4. **Review data scrubbing rules** to ensure sensitive data isn't captured

## Troubleshooting

### Sentry not capturing errors

1. Check that `NODE_ENV=production` or `SENTRY_ENABLED=true`
2. Verify DSN is correct in `.env`
3. Check server logs for Sentry initialization
4. Test with manual error: `Sentry.captureException(new Error('test'))`

### Too many events captured

1. Adjust sample rates in `server.js` and `script.js`
2. Add filters in Sentry dashboard
3. Use `beforeSend` hook to filter events

### Session replays not working

1. Verify browser supports session replay
2. Check that Sentry SDK loaded (check Network tab)
3. Ensure replay integration is enabled
4. Check privacy settings aren't blocking replays
