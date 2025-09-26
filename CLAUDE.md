# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a multiplayer Tic Tac Toe game built with Node.js, Express, Socket.IO, and MongoDB. The application features real-time multiplayer gameplay with Auth0 authentication, user management, and a MongoDB-powered highscore system. The game includes both traditional tic-tac-toe and an advanced "move pieces" variant where players can move their pieces after placing them.

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
- Auth0 JWT token validation and user management
- MongoDB integration for user data and highscores
- Azure-optimized Socket.IO configuration with fallback transports
- RESTful API endpoints for authentication config and user management

**Client Architecture (`script.js`)**:
- Single-page application with class-based structure (`TicTacToeMultiplayer`)
- Real-time Socket.IO communication with the server
- Auth0 SPA SDK integration for authentication
- Two game modes: traditional placement and piece movement phases
- Settings overlay for UI customization (piece colors, themes)

**Database Layer**:
- `database.js`: MongoDB Atlas connection management with connection pooling
- `highscore.js`: User statistics and leaderboard functionality
- Collections: `users` (user profiles), `highscores` (game statistics)

### Authentication Flow

1. Auth0 authentication via SPA SDK
2. JWT token validation on server-side
3. Username setup modal for new users
4. User data persistence in MongoDB
5. Socket authentication with validated tokens

### Game Architecture

- **Game States**: Placement phase → Movement phase (for 3-piece variant)
- **Real-time Sync**: All game state changes broadcast via Socket.IO
- **User Management**: Persistent usernames, statistics, and preferences
- **Customization**: Theme selection, piece colors, and UI preferences

## Environment Configuration

Required environment variables (see `.env.example`):
- `AUTH0_DOMAIN`: Auth0 tenant domain
- `AUTH0_CLIENT_ID`: Auth0 application client ID
- `AUTH0_CLIENT_SECRET`: Auth0 application client secret
- `AUTH0_AUDIENCE`: Auth0 API identifier
- `NODE_ENV`: Environment (development/production)
- `PORT`: Server port (default: 3000)
- `SESSION_SECRET`: Secret key for session management

MongoDB connection string is currently hardcoded in `database.js` and should be moved to environment variables.

## Deployment

The application is configured for Azure App Service deployment:
- GitHub Actions workflow: `.github/workflows/azure-deploy.yml`
- Node.js 18.x runtime requirement
- WebSocket support enabled for Socket.IO
- Static file serving from root directory

## Key Files

- `server.js`: Main server application with Express, Socket.IO, and Auth0 integration
- `script.js`: Client-side game logic and Socket.IO communication
- `index.html`: Single-page application structure with modals
- `style.css`: Complete UI styling including game board, modals, and themes
- `database.js`: MongoDB connection and management
- `highscore.js`: User statistics and leaderboard service
- `AUTH0_SETUP.md`: Detailed Auth0 configuration instructions
- `DEPLOYMENT.md`: Azure deployment guide with multiple deployment options

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
- `userId`: Reference to user
- `username`: Display name
- `wins/losses/draws`: Game statistics
- `lastPlayed`: Last activity timestamp