# Tic Tac Toe Multiplayer - iOS App

A native iOS app for the Tic Tac Toe multiplayer game, enabling cross-platform gameplay with the existing web application.

## Requirements

- iOS 15.0+
- Xcode 15.0+
- Swift 5.9+

## Setup

### 1. Open Project in Xcode

```bash
cd TicTacToeMultiplayer
open TicTacToeMultiplayer.xcodeproj
```

### 2. Configure Auth0

1. Log into your Auth0 Dashboard
2. Create a new **Native** application for iOS
3. Configure the following callback URLs:
   - **Allowed Callback URLs**: `com.tictactoe.multiplayer.ios://YOUR_AUTH0_DOMAIN/ios/com.tictactoe.multiplayer.ios/callback`
   - **Allowed Logout URLs**: `com.tictactoe.multiplayer.ios://YOUR_AUTH0_DOMAIN/ios/com.tictactoe.multiplayer.ios/logout`

4. Update `TicTacToeMultiplayer/Resources/Auth0.plist` with your credentials:
   ```xml
   <dict>
       <key>ClientId</key>
       <string>YOUR_AUTH0_CLIENT_ID</string>
       <key>Domain</key>
       <string>YOUR_AUTH0_DOMAIN</string>
   </dict>
   ```

### 3. Resolve Dependencies

Xcode will automatically resolve the Swift Package dependencies:
- SocketIO-Client-Swift (16.1.0+)
- Auth0.swift (2.5.0+)

If packages don't resolve automatically:
1. Go to **File > Packages > Resolve Package Versions**

### 4. Build and Run

1. Select your target device or simulator
2. Press **Cmd + R** to build and run

## Architecture

### Project Structure

```
TicTacToeMultiplayer/
├── TicTacToeMultiplayerApp.swift   # App entry point
├── ContentView.swift                # Root view with navigation
├── Models/
│   ├── GameState.swift             # Game state models
│   └── Player.swift                # Player model
├── ViewModels/
│   ├── AuthViewModel.swift         # Authentication state
│   └── GameViewModel.swift         # Game state management
├── Views/
│   ├── Authentication/             # Login and username setup
│   ├── RoomSelection/              # Room selection UI
│   ├── Game/                       # Game board UI
│   ├── Settings/                   # Settings UI
│   └── Highscores/                 # Leaderboard UI
├── Services/
│   ├── SocketService.swift         # Socket.IO communication
│   └── AuthService.swift           # Auth0 authentication
└── Resources/
    ├── Assets.xcassets             # App icons and colors
    └── Auth0.plist                 # Auth0 configuration
```

### Key Components

- **SocketService**: Singleton managing Socket.IO connection to Railway backend
- **AuthService**: Handles Auth0 authentication, token storage, and user session
- **AuthViewModel**: SwiftUI observable for authentication state
- **GameViewModel**: SwiftUI observable for game state and actions

## Features

- Cross-platform multiplayer with web users
- Real-time gameplay via Socket.IO
- Auth0 authentication
- Room creation and joining
- Quick Play matchmaking
- Active games list with rejoin support
- Customizable piece colors
- Leaderboard and personal statistics
- Haptic feedback

## Socket.IO Events

### Emitted Events
| Event | Description |
|-------|-------------|
| `joinRoom` | Join or create a room |
| `login` | Authenticate with JWT |
| `makeMove` | Place or move a piece |
| `resetGame` | Start new game |
| `resetScore` | Reset score to 0-0 |
| `changeColor` | Update piece color |
| `changeUsername` | Change display name |
| `getHighscores` | Fetch leaderboard |
| `getMyGames` | Fetch active games |

### Listened Events
| Event | Description |
|-------|-------------|
| `roomJoined` | Room join confirmation |
| `loginResponse` | Auth result |
| `gameStateUpdate` | Full game state sync |
| `gameOver` | Game end result |
| `colorChanged` | Color sync |
| `playerDisconnected` | Opponent disconnected |

## Backend

The app connects to the Railway-deployed backend:
```
https://tic-tac-toe-multiplayer-production.up.railway.app
```

All game logic is server-authoritative - the iOS app is a view layer only.

## Testing

### Cross-Platform Testing
1. Run the iOS app on a device/simulator
2. Open the web app in a browser
3. Create a room on one platform
4. Join with the room code on the other platform
5. Play a full game to verify sync

### Test Scenarios
- [ ] Login with Auth0
- [ ] Set username for new user
- [ ] Quick Play matchmaking
- [ ] Create room with code
- [ ] Join room with code
- [ ] Placement phase gameplay
- [ ] Movement phase gameplay
- [ ] Win detection and score update
- [ ] Change piece colors
- [ ] View leaderboard
- [ ] Reconnect after disconnect

## Troubleshooting

### Socket Connection Issues
- Verify Railway backend is running
- Check network connectivity
- Ensure WebSocket is not blocked by firewall

### Auth0 Issues
- Verify Auth0.plist configuration
- Check callback URL matches exactly
- Ensure bundle identifier is `com.tictactoe.multiplayer.ios`

### Build Issues
- Clean build folder: **Product > Clean Build Folder**
- Reset packages: **File > Packages > Reset Package Caches**
