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

**IMPORTANT: Always follow this workflow when making changes:**

1. **Create a feature branch** for any new changes
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes** and commit them
   ```bash
   git add .
   git commit -m "Your commit message"
   ```

3. **Push the branch to GitHub** to make it available for testing on Railway
   ```bash
   git push -u origin feature/your-feature-name
   ```

4. **Test on Railway** by selecting the branch in Railway's deployment settings

5. **Merge to main** only after testing is successful
   ```bash
   git checkout main
   git merge feature/your-feature-name
   git push origin main
   ```

**Note:** Railway needs the branch to be pushed to GitHub before it can be selected for deployment. Always push branches before attempting to test them on Railway.

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