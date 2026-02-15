# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a multiplayer Tic Tac Toe game built with Node.js, Express, Socket.IO, and MongoDB. The application features real-time multiplayer gameplay with dual authentication (Auth0 and Sign in with Apple), user management, and a MongoDB-powered highscore system. The game includes both traditional tic-tac-toe and an advanced "move pieces" variant where players can move their pieces after placing them.

Available on:
- **iOS App**: Native Swift app (App Store)
- **Web App**: Browser-based version (play.tictactoe.dk)

## Development Commands

```bash
# Start the server (development and production)
npm start
npm run dev

# No build step required - static files served directly
npm run build  # outputs: "No build step required"

# No tests currently configured
npm test      # outputs: "No tests specified"
```

## 🚨 CRITICAL: Development Workflow Rules 🚨

**NEVER make changes directly on the main branch. ALWAYS follow this workflow:**

1. **Create a Feature Branch**
   ```bash
   git checkout -b feature/descriptive-name
   ```

2. **Make and Test Changes**
   - Implement your changes on the feature branch
   - Test locally with `npm start`
   - Verify syntax: `node --check server.js`
   - Test all affected functionality thoroughly

3. **Commit to Feature Branch**
   ```bash
   git add .
   git commit -m "Descriptive commit message"
   ```

4. **Push Feature Branch to GitHub**
   ```bash
   git push -u origin feature/descriptive-name
   ```
   **IMPORTANT:** Railway needs the branch on GitHub to deploy it for testing

5. **Test on Railway**
   - Go to Railway dashboard
   - Select the feature branch for deployment
   - Verify the deployment works correctly
   - Test all functionality in the live environment
   - Check both web app and iOS app integration

6. **Request Claude Security Review Before Merging**

   **IMPORTANT: Ask Claude to perform a security review using this exact prompt:**

   ```
   Please perform a security review of this branch before I merge to main.
   Follow the instructions in security-review-prompt.md.
   ```

   **Claude will:**
   - Analyze all code changes in your branch
   - Check for security vulnerabilities using AI-powered analysis
   - Validate syntax with `node --check`
   - Run `npm audit` for dependency vulnerabilities
   - Check for hardcoded secrets, injection risks, auth issues
   - Provide a comprehensive security report with PASS/FAIL recommendation

   **Only merge to main if Claude gives ✅ PASS**

**Why This Matters:**
- Main branch deploys directly to production (play.tictactoe.dk)
- Broken code on main breaks the live app for all users
- Syntax errors prevent Railway deployment entirely
- Feature branches allow safe testing before affecting production
- Multiple fix commits on main indicate improper workflow

**Red Flags to Avoid:**
- ❌ Making changes directly on main
- ❌ Pushing untested code
- ❌ Multiple "fix" commits in a row on main
- ❌ Skipping syntax validation (`node --check`)
- ❌ Not testing on Railway before merging
- ❌ Merging without running security review

## Security Review Agent (Claude AI)

**A mandatory AI-powered security review must be performed before merging to main.**

Claude acts as your security review agent, using AI to intelligently analyze code changes for vulnerabilities.

### How to Request Security Review

Simply ask Claude in the conversation:

```
Please perform a security review of this branch before I merge to main.
Follow the instructions in security-review-prompt.md.
```

**Claude will automatically:**
1. Get the list of changed files (`git diff main...HEAD`)
2. Read and analyze each modified file
3. Run syntax checks (`node --check`)
4. Check for hardcoded secrets and vulnerabilities
5. Run `npm audit` for dependency issues
6. Verify authentication and authorization
7. Provide a detailed security report with PASS/FAIL

### Why Claude Instead of a Script?

- **AI-Powered Analysis**: Understands context, not just pattern matching
- **Fewer False Positives**: Distinguishes real risks from safe code
- **Detailed Explanations**: Explains WHY something is a security issue
- **Actionable Fixes**: Suggests specific solutions for each problem
- **Adaptive**: Learns from code patterns and best practices
- **Comprehensive**: Checks syntax, secrets, injection, auth, dependencies in one review

### Security Checks Claude Performs

1. **Syntax Validation** ✓
   - Runs `node --check` on all JavaScript files
   - Prevents deployment-breaking syntax errors

2. **Secret Detection** 🔐
   - Scans for hardcoded passwords, API keys, secrets
   - Checks for MongoDB connection strings with credentials
   - Verifies .env is not committed to git

3. **Vulnerability Scanning** 💉
   - Detects use of `eval()` and `Function()` constructor
   - Checks for SQL/NoSQL injection patterns
   - Identifies code injection in socket handlers
   - Analyzes authentication and authorization logic

4. **Dependency Audit** 📦
   - Runs `npm audit` to check for vulnerable packages
   - Flags critical and high severity issues
   - Reports vulnerability counts

5. **Authentication Security** 🔑
   - Verifies endpoints have token verification
   - Checks socket handlers authenticate users
   - Ensures users can only access their own data

6. **CORS & Headers** 🛡️
   - Reviews CORS configuration
   - Warns about overly permissive settings

### Understanding Claude's Review Results

**✅ PASS - Safe to Merge**
```
### 🎯 Final Recommendation
**RESULT:** ✅ PASS - Safe to merge
```
→ You can proceed with merging to main

**❌ FAIL - Do NOT Merge**
```
### 🎯 Final Recommendation
**RESULT:** ❌ FAIL - Do NOT merge
```
→ Fix all critical issues before merging

**⚠️ PASS with Warnings**
```
### ⚠️ Warnings
- CORS allows all origins (acceptable for public API)
```
→ Review warnings, then merge if acceptable

### When Claude Fails the Review

1. Read the **Critical Issues** section carefully
2. Fix each issue (Claude provides file:line references)
3. Commit the fixes to your feature branch
4. Request another security review from Claude
5. Only merge once you get ✅ PASS

## Architecture Overview

### Core Components

**Server Architecture (`server.js`)**:
- Express.js HTTP server with Socket.IO for real-time communication
- Dual authentication: Auth0 and Sign in with Apple (Apple ID token verification)
- MongoDB Atlas integration for user data and highscores
- Railway-optimized Socket.IO configuration with fallback transports
- RESTful API endpoints for authentication config and user management
- Auto-detects token type (Auth0 vs Apple) and verifies accordingly

**Web Client Architecture (`script.js`)**:
- Single-page application with class-based structure (`TicTacToeMultiplayer`)
- Real-time Socket.IO communication with the server
- Auth0 SPA SDK integration for authentication
- Two game modes: traditional placement and piece movement phases
- Settings overlay for UI customization (piece colors, themes)

**iOS Client Architecture (Swift)**:
- Native SwiftUI app with MVVM architecture
- Auth0 Swift SDK and Sign in with Apple support
- Guest Mode for accessing app without account
- Socket.IO client for real-time multiplayer
- Persistent username storage in UserDefaults

**Database Layer**:
- `database.js`: MongoDB Atlas connection management with connection pooling
- `highscore.js`: User statistics and leaderboard functionality
- Collections: `users` (user profiles), `highscores` (game statistics)

### Authentication Flow

**iOS App:**
1. User chooses: Sign in with Apple, Auth0 (email), or Continue as Guest
2. Sign in with Apple: Native iOS authentication → Apple ID token
3. Auth0: Web-based login → Auth0 JWT token
4. Guest Mode: Local username, no server connection (limited features)
5. Token sent to server via Socket.IO for verification
6. Server auto-detects and verifies token type
7. Username setup for new users
8. User data persistence in MongoDB (except guests)

**Web App:**
1. Auth0 authentication via SPA SDK
2. JWT token validation on server-side
3. Username setup modal for new users
4. User data persistence in MongoDB
5. Socket authentication with validated tokens

**Server-Side Token Handling:**
- Detects token issuer (Auth0: auth0.com, Apple: appleid.apple.com)
- Verifies with appropriate provider
- Extracts userId and email
- Auto-generates username (max 12 characters, cleans email addresses)
- Stores authProvider field ('auth0' or 'apple')

### Game Architecture

- **Game States**: Placement phase → Movement phase (for 3-piece variant)
- **Real-time Sync**: All game state changes broadcast via Socket.IO
- **User Management**: Persistent usernames, statistics, and preferences
- **Customization**: Theme selection, piece colors, and UI preferences

## Environment Configuration

Required environment variables (see `.env.example`):

**Auth0 Configuration:**
- `AUTH0_DOMAIN`: Auth0 tenant domain
- `AUTH0_CLIENT_ID`: Auth0 application client ID
- `AUTH0_CLIENT_SECRET`: Auth0 application client secret
- `AUTH0_AUDIENCE`: Auth0 API identifier

**Sign in with Apple Configuration:**
- `APPLE_CLIENT_ID`: Apple Services ID (e.g., com.tictactoe.multiplayer.ios)
- `APPLE_TEAM_ID`: Apple Developer Team ID
- `APPLE_KEY_ID`: Sign in with Apple Key ID
- `APPLE_PRIVATE_KEY`: Apple private key content (recommended for Railway)
- `APPLE_PRIVATE_KEY_PATH`: Path to .p8 key file (alternative to APPLE_PRIVATE_KEY)

**Database Configuration:**
- `MONGODB_URI`: MongoDB Atlas connection string with credentials

**Application Configuration:**
- `NODE_ENV`: Environment (development/production)
- `PORT`: Server port (default: 3000)
- `SESSION_SECRET`: Secret key for session management
- `SENTRY_DSN`: Sentry error tracking DSN (optional)

## Deployment

The application is deployed on Railway with automatic deployments from GitHub:
- Primary deployment: Railway (connected to GitHub repository)
- Node.js 18.x runtime requirement
- WebSocket support enabled for Socket.IO
- Static file serving from root directory

### Development Workflow

**🚨 CRITICAL: See "Development Workflow Rules" section at the top of this document.**

**Summary:**
- ❌ **NEVER commit directly to main**
- ✅ Always use feature branches
- ✅ Test on Railway before merging
- ✅ Verify syntax with `node --check server.js`
- ✅ Test both web and iOS apps

Main branch = Production. Broken code on main = broken app for all users.

## Key Files

**Server (Node.js):**
- `server.js`: Main server with Express, Socket.IO, Auth0, and Apple Sign In
- `database.js`: MongoDB Atlas connection management (uses MONGODB_URI env var)
- `highscore.js`: User statistics and leaderboard service
- `gameState.js`: Game state persistence and management

**Web Client:**
- `script.js`: Client-side game logic and Socket.IO communication
- `index.html`: Single-page application structure with modals
- `style.css`: Complete UI styling including game board, modals, and themes

**iOS Client (Swift):**
- `TicTacToeMultiplayerApp.swift`: Main app entry point
- `ContentView.swift`: Root view with navigation logic
- `LoginView.swift`: Login screen with Sign in with Apple and Auth0 options
- `AuthService.swift`: Authentication service for both Auth0 and Apple
- `AuthViewModel.swift`: Authentication state management and guest mode
- `SocketService.swift`: Socket.IO client for real-time multiplayer
- `GameViewModel.swift`: Game state management

**Documentation:**
- `AUTH0_SETUP.md`: Detailed Auth0 configuration instructions
- `APPLE_SIGNIN_SETUP.md`: Sign in with Apple setup guide (Apple Developer Console)
- `DEPLOYMENT.md`: Railway deployment guide
- `CLAUDE.md`: This file - project documentation for AI assistants

## Socket.IO Events

**Client → Server**: `join-game`, `make-move`, `move-piece`, `restart-game`, `save-username`, `get-leaderboard`
**Server → Client**: `player-joined`, `game-state`, `move-made`, `piece-moved`, `game-over`, `player-left`, `leaderboard-data`

## Database Schema

**Users Collection**:
- `userId`: Auth0 user ID
- `username`: Display name
- `email`: User email
- `createdAt`: Registration timestamp

**Highscores Collection**:
- `userId`: Reference to user (Auth0 sub or Apple user ID)
- `username`: Display name (auto-truncated to 12 characters)
- `wins/losses/draws`: Game statistics
- `lastPlayed`: Last activity timestamp
- `authProvider`: 'auth0' or 'apple' (identifies login method)

## Features

### Authentication
- **Sign in with Apple**: Native iOS authentication with privacy features
- **Auth0**: Email/password authentication for web and iOS
- **Guest Mode**: iOS app allows browsing without account (App Store Guideline 5.1.1 compliance)
- **Dual Provider Support**: Server handles both Auth0 and Apple tokens seamlessly
- **Username Management**: Auto-generated usernames limited to 12 characters, cleaned from email addresses

### Gameplay
- **Real-time Multiplayer**: Socket.IO for instant game updates
- **Room System**: Public matchmaking or private room codes
- **Two Game Modes**: Traditional tic-tac-toe and piece movement variant
- **Persistent Game State**: MongoDB storage for resuming games
- **Leaderboards**: Player statistics and rankings

### iOS App Specific Features
- **Guest Mode**: Browse app without creating account
  - Shows interface and available features
  - Online features disabled with "Login Required" indicators
  - One-tap upgrade to full account
- **Sign in with Apple**: Compliant with App Store Guideline 4.8
- **Native iOS UI**: SwiftUI-based modern interface
- **Offline Support**: Guest mode works without server connection

## App Store Compliance

The iOS app complies with Apple's App Store guidelines:
- **Guideline 4.8**: Sign in with Apple implemented alongside Auth0
- **Guideline 5.1.1**: Guest mode allows access without account registration
- **Privacy**: Sign in with Apple supports "Hide My Email" feature

## Important Notes

### Username Handling
- Auto-generated usernames are limited to **12 characters maximum**
- Email addresses are cleaned (extracts part before @)
- Example: `jimmi.wolff@gmail.com` → `jimmi.wolff`
- Custom usernames set by users are validated (2-20 characters)

### Guest Mode (iOS Only)
- Guests can explore the app interface
- Cannot access online multiplayer (requires login)
- Cannot access leaderboards (requires login)
- Clear "Login Required" indicators on disabled features
- Guest data is not persisted to server

### Apple Sign In
- Apple ID tokens verified server-side using `apple-signin-auth`
- Email may be private relay address (`privaterelay@icloud.com`)
- User ID format: `000123.abc456def.1234` (different from Auth0)
- Supports "Hide My Email" privacy feature