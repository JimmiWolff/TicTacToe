const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
const jwt = require('jsonwebtoken');
const { connectToDatabase, getDatabase } = require('./database');
const highscoreService = require('./highscore');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

// Azure-friendly Socket.IO configuration
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
        credentials: true
    },
    transports: ['websocket', 'polling'],
    allowEIO3: true,
    pingTimeout: 60000,
    pingInterval: 25000
});

// Middleware
app.use(cors({
    origin: "*",
    credentials: true
}));
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Azure-specific middleware
app.use((req, res, next) => {
    // Add Azure-friendly headers
    res.setHeader('X-Powered-By', 'Express on Azure');
    next();
});

// Auth0 configuration endpoint
app.get('/auth/config', (req, res) => {
    res.json({
        domain: AUTH0_DOMAIN,
        clientId: AUTH0_CLIENT_ID,
        audience: AUTH0_AUDIENCE
    });
});

// JWT verification middleware
function verifyToken(token) {
    try {
        // In a real application, you would verify with Auth0's public key
        // For now, we'll do basic JWT parsing
        const decoded = jwt.decode(token);
        return decoded;
    } catch (error) {
        return null;
    }
}

// User registration endpoint (for custom users)
app.post('/auth/register', (req, res) => {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
        return res.status(400).json({ error: 'Username, email, and password are required' });
    }

    // Check if user already exists
    if (registeredUsers.has(email)) {
        return res.status(409).json({ error: 'User already exists' });
    }

    // Store user (in production, hash the password!)
    registeredUsers.set(email, {
        username,
        email,
        password, // In production: bcrypt.hash(password, 10)
        createdAt: new Date(),
        lastLogin: null
    });

    res.json({
        success: true,
        message: 'User registered successfully',
        username
    });
});

// Get user profile
app.get('/auth/profile', (req, res) => {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({ error: 'No authorization header' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);

    if (!decoded) {
        return res.status(401).json({ error: 'Invalid token' });
    }

    res.json({
        user: {
            sub: decoded.sub,
            email: decoded.email,
            username: decoded.nickname || decoded.name
        }
    });
});

// Health check endpoint for Azure
app.get('/health', (req, res) => {
    const totalPlayers = Array.from(rooms.values()).reduce((sum, room) => sum + room.players.length, 0);
    res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        totalPlayers: totalPlayers,
        activeRooms: rooms.size
    });
});

// Room management endpoints
app.post('/api/rooms/create', (req, res) => {
    let roomCode;
    do {
        roomCode = generateRoomCode();
    } while (rooms.has(roomCode));

    const room = createGameRoom(roomCode);
    rooms.set(roomCode, room);

    res.json({
        success: true,
        roomCode: roomCode,
        message: 'Room created successfully'
    });
});

app.get('/api/rooms/:roomCode', (req, res) => {
    const roomCode = req.params.roomCode.toUpperCase();
    const room = rooms.get(roomCode);

    if (!room) {
        return res.status(404).json({
            success: false,
            message: 'Room not found'
        });
    }

    res.json({
        success: true,
        room: {
            id: room.id,
            playerCount: room.players.length,
            maxPlayers: room.maxPlayers,
            gameActive: room.gameActive,
            createdAt: room.createdAt
        }
    });
});

// Room management system
const rooms = new Map();

// Game room structure
function createGameRoom(roomId) {
    return {
        id: roomId,
        players: [],
        maxPlayers: 2,
        board: ['', '', '', '', '', '', '', '', ''],
        currentPlayer: 'X',
        gameActive: true,
        scores: { X: 0, O: 0, draw: 0 },
        // New properties for move pieces feature
        piecesPlaced: { X: 0, O: 0 },
        gamePhase: 'placement', // 'placement' or 'movement'
        selectedPiece: null,
        maxPieces: 3,
        // Piece colors for synchronization
        pieceColors: {
            X: '#e74c3c',
            O: '#3498db'
        },
        createdAt: new Date(),
        lastActivity: new Date()
    };
}

// Generate unique room code
function generateRoomCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

// Get or create room
function getOrCreateRoom(roomId) {
    if (!rooms.has(roomId)) {
        rooms.set(roomId, createGameRoom(roomId));
    }
    return rooms.get(roomId);
}

// Clean up empty rooms (called periodically)
function cleanupEmptyRooms() {
    const now = new Date();
    for (const [roomId, room] of rooms.entries()) {
        if (room.players.length === 0 && now - room.lastActivity > 300000) { // 5 minutes
            rooms.delete(roomId);
            console.log(`Cleaned up empty room: ${roomId}`);
        }
    }
}

// Legacy support - default room for backward compatibility
const DEFAULT_ROOM = 'default';
getOrCreateRoom(DEFAULT_ROOM);

// Auth0 Configuration
const AUTH0_DOMAIN = process.env.AUTH0_DOMAIN;
const AUTH0_CLIENT_ID = process.env.AUTH0_CLIENT_ID;
const AUTH0_CLIENT_SECRET = process.env.AUTH0_CLIENT_SECRET;
const AUTH0_AUDIENCE = process.env.AUTH0_AUDIENCE;


// In-memory user storage (in production, use a proper database)
const registeredUsers = new Map();

// Helper function to get stored username from database
async function getStoredUsername(userId) {
    try {
        const db = getDatabase();
        const collection = db.collection('highscores');
        const user = await collection.findOne({ userId: userId });
        return user ? user.username : null;
    } catch (error) {
        console.error('Error getting stored username:', error);
        return null;
    }
}

// Helper functions
function resetGame(room) {
    room.board = ['', '', '', '', '', '', '', '', ''];
    room.currentPlayer = 'X';
    room.gameActive = true;
    room.piecesPlaced = { X: 0, O: 0 };
    room.gamePhase = 'placement';
    room.selectedPiece = null;
    room.lastActivity = new Date();
}

async function updateHighscoresAfterGame(room, winner) {
    try {
        // Update scores for both players
        for (const player of room.players) {
            if (player.userId) {
                let gameResult;
                if (winner === null) {
                    gameResult = 'draw';
                } else if (player.symbol === winner) {
                    gameResult = 'win';
                } else {
                    gameResult = 'loss';
                }

                await highscoreService.updatePlayerScore(player.userId, player.username, gameResult);
            }
        }
    } catch (error) {
        console.error('Error updating highscores:', error);
    }
}

function checkWin(board) {
    const winPatterns = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8],
        [0, 3, 6], [1, 4, 7], [2, 5, 8],
        [0, 4, 8], [2, 4, 6]
    ];

    for (let pattern of winPatterns) {
        const [a, b, c] = pattern;
        if (board[a] && board[a] === board[b] && board[a] === board[c]) {
            return { winner: board[a], pattern };
        }
    }
    return null;
}

function checkDraw(board) {
    return board.every(cell => cell !== '');
}

// New helper functions for move pieces feature
function isValidMove(fromIndex, toIndex, player, room) {
    // Check if fromIndex has the player's piece
    if (room.board[fromIndex] !== player) {
        return false;
    }

    // Check if toIndex is empty
    if (room.board[toIndex] !== '') {
        return false;
    }

    // Pieces can move to any empty cell on the board
    return true;
}


function switchToMovementPhase(room) {
    if (room.piecesPlaced.X >= room.maxPieces &&
        room.piecesPlaced.O >= room.maxPieces) {
        room.gamePhase = 'movement';
        return true;
    }
    return false;
}

// Serve the main HTML file
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Initialize database connection
connectToDatabase().catch(console.error);

// Cleanup empty rooms every 5 minutes
setInterval(cleanupEmptyRooms, 300000);

// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    // Handle room joining
    socket.on('joinRoom', (data) => {
        const { roomCode } = data;
        const normalizedRoomCode = roomCode ? roomCode.toUpperCase() : DEFAULT_ROOM;


        // Leave current room if any
        if (socket.currentRoom) {
            socket.leave(socket.currentRoom);
        }

        // Join new room
        socket.join(normalizedRoomCode);
        socket.currentRoom = normalizedRoomCode;

        // Get or create room
        const room = getOrCreateRoom(normalizedRoomCode);
        room.lastActivity = new Date();

        socket.emit('roomJoined', {
            success: true,
            roomCode: normalizedRoomCode,
            message: `Joined room ${normalizedRoomCode}`
        });

    });

    // Handle login
    socket.on('login', async (data) => {
        const { username, password, token, customUsername } = data;

        let actualUsername = null;
        let userInfo = null;

        // Try Auth0 token first
        if (token) {
            const decoded = verifyToken(token);
            if (decoded) {
                // First try to get stored username from database
                const storedUsername = await getStoredUsername(decoded.sub);

                // Use priority: customUsername > stored username from DB > Auth0 profile fields > userId
                actualUsername = customUsername ||
                               storedUsername ||
                               decoded.nickname ||
                               decoded.name ||
                               decoded.preferred_username ||
                               decoded.email ||
                               decoded.sub ||
                               'Unknown User';

                userInfo = {
                    id: decoded.sub,
                    email: decoded.email,
                    username: actualUsername,
                    authType: 'auth0',
                    customUsername: customUsername ? true : false
                };
            } else {
                socket.emit('loginResponse', {
                    success: false,
                    message: 'Invalid authentication token.'
                });
                return;
            }
        } else {
            socket.emit('loginResponse', {
                success: false,
                message: 'Please provide authentication token.'
            });
            return;
        }

        // Allow login without immediately joining a room
        // The user will join a room later via room selection
        if (!socket.currentRoom) {
            // Don't force into default room - let user choose room after login
            // Create a temporary player object for the client
            const tempPlayer = {
                id: socket.id,
                username: actualUsername,
                symbol: null, // Will be assigned when joining a room
                isReady: false
            };

            socket.emit('loginResponse', {
                success: true,
                message: `Welcome, ${actualUsername}! Please select a room to join.`,
                needsRoom: true,
                username: actualUsername,
                player: tempPlayer
            });
            socket.userInfo = userInfo;
            socket.actualUsername = actualUsername;
            socket.player = tempPlayer;
            return;
        }

        const roomCode = socket.currentRoom;

        const room = getOrCreateRoom(roomCode);
        room.lastActivity = new Date();


        // Check if user is already logged in this room (case-insensitive)
        const existingPlayer = actualUsername ? room.players.find(p => p.username.toLowerCase() === actualUsername.toLowerCase()) : null;
        if (existingPlayer) {
            console.log(`User ${actualUsername} already exists in room ${roomCode}`);
            socket.emit('loginResponse', {
                success: false,
                message: 'User is already logged in this room.'
            });
            return;
        }

        // Check if room is full
        if (room.players.length >= room.maxPlayers) {
            socket.emit('loginResponse', {
                success: false,
                message: 'This room is full (maximum 2 players).'
            });
            return;
        }

        // Add player to room
        const player = {
            id: socket.id,
            username: actualUsername,
            symbol: room.players.length === 0 ? 'X' : 'O',
            loginTime: new Date(),
            authType: userInfo.authType,
            email: userInfo.email || null,
            userId: userInfo.id || null
        };

        room.players.push(player);
        socket.player = player;
        socket.playerRoom = roomCode;

        // Send success response
        socket.emit('loginResponse', {
            success: true,
            message: `Welcome, ${actualUsername}! Room: ${roomCode}`,
            player: player,
            roomCode: roomCode
        });

        // Broadcast updated game state to all clients in the room
        io.to(roomCode).emit('gameStateUpdate', {
            players: room.players,
            board: room.board,
            currentPlayer: room.currentPlayer,
            gameActive: room.gameActive,
            scores: room.scores,
            piecesPlaced: room.piecesPlaced,
            gamePhase: room.gamePhase,
            maxPieces: room.maxPieces,
            pieceColors: room.pieceColors
        });

    });

    // Handle game moves (both placement and movement)
    socket.on('makeMove', (data) => {
        const { cellIndex, fromIndex } = data; // fromIndex is provided for movement phase

        if (!socket.player || !socket.playerRoom) {
            socket.emit('error', { message: 'You must be logged in to play.' });
            return;
        }

        const room = rooms.get(socket.playerRoom);
        if (!room) {
            socket.emit('error', { message: 'Room not found.' });
            return;
        }

        // Check if it's the player's turn
        if (socket.player.symbol !== room.currentPlayer) {
            socket.emit('error', { message: 'It\'s not your turn!' });
            return;
        }

        // Check if game is active
        if (!room.gameActive) {
            return;
        }

        // Check if we have enough players
        if (room.players.length < 2) {
            socket.emit('error', { message: 'Waiting for another player.' });
            return;
        }

        const currentSymbol = room.currentPlayer;
        let moveSuccessful = false;

        if (room.gamePhase === 'placement') {
            // PLACEMENT PHASE: Place a new piece
            if (room.board[cellIndex] !== '') {
                socket.emit('error', { message: 'Cell is already occupied!' });
                return;
            }

            if (room.piecesPlaced[currentSymbol] >= room.maxPieces) {
                socket.emit('error', { message: 'You have already placed all your pieces!' });
                return;
            }

            // Place the piece
            room.board[cellIndex] = currentSymbol;
            room.piecesPlaced[currentSymbol]++;
            moveSuccessful = true;

            // Check if we should switch to movement phase
            switchToMovementPhase(room);

        } else if (room.gamePhase === 'movement') {
            // MOVEMENT PHASE: Move an existing piece
            if (fromIndex === undefined || fromIndex === null) {
                socket.emit('error', { message: 'You must select a piece to move!' });
                return;
            }

            if (!isValidMove(fromIndex, cellIndex, currentSymbol, room)) {
                socket.emit('error', { message: 'Invalid move! You can only move your pieces to empty cells.' });
                return;
            }

            // Move the piece
            room.board[fromIndex] = '';
            room.board[cellIndex] = currentSymbol;
            moveSuccessful = true;
        }

        if (moveSuccessful) {
            room.lastActivity = new Date();

            // Check for win after any successful move
            const winResult = checkWin(room.board);
            if (winResult) {
                room.gameActive = false;
                room.scores[winResult.winner]++;

                // Update highscores
                updateHighscoresAfterGame(room, winResult.winner);

                io.to(socket.playerRoom).emit('gameOver', {
                    winner: winResult.winner,
                    winnerName: room.players.find(p => p.symbol === winResult.winner)?.username,
                    pattern: winResult.pattern,
                    board: room.board,
                    scores: room.scores,
                    gamePhase: room.gamePhase
                });
            } else if (room.gamePhase === 'placement' && checkDraw(room.board)) {
                // Only check for draw in placement phase
                room.gameActive = false;
                room.scores.draw++;

                // Update highscores for draw
                updateHighscoresAfterGame(room, null);

                io.to(socket.playerRoom).emit('gameOver', {
                    winner: null,
                    draw: true,
                    board: room.board,
                    scores: room.scores,
                    gamePhase: room.gamePhase
                });
            } else {
                // Switch player
                room.currentPlayer = room.currentPlayer === 'X' ? 'O' : 'X';

                // Broadcast updated game state to room
                io.to(socket.playerRoom).emit('gameStateUpdate', {
                    players: room.players,
                    board: room.board,
                    currentPlayer: room.currentPlayer,
                    gameActive: room.gameActive,
                    scores: room.scores,
                    piecesPlaced: room.piecesPlaced,
                    gamePhase: room.gamePhase,
                    maxPieces: room.maxPieces
                });
            }
        }
    });

    // Handle reset game
    socket.on('resetGame', () => {
        if (!socket.player || !socket.playerRoom) return;

        const room = rooms.get(socket.playerRoom);
        if (!room) return;

        resetGame(room);
        io.to(socket.playerRoom).emit('gameStateUpdate', {
            players: room.players,
            board: room.board,
            currentPlayer: room.currentPlayer,
            gameActive: room.gameActive,
            scores: room.scores,
            piecesPlaced: room.piecesPlaced,
            gamePhase: room.gamePhase,
            maxPieces: room.maxPieces,
            pieceColors: room.pieceColors
        });
    });

    // Handle reset score
    socket.on('resetScore', () => {
        if (!socket.player || !socket.playerRoom) return;

        const room = rooms.get(socket.playerRoom);
        if (!room) return;

        room.scores = { X: 0, O: 0, draw: 0 };
        io.to(socket.playerRoom).emit('gameStateUpdate', {
            players: room.players,
            board: room.board,
            currentPlayer: room.currentPlayer,
            gameActive: room.gameActive,
            scores: room.scores,
            piecesPlaced: room.piecesPlaced,
            gamePhase: room.gamePhase,
            maxPieces: room.maxPieces,
            pieceColors: room.pieceColors
        });
    });

    // Handle piece color changes
    socket.on('changeColor', (data) => {
        const { piece, color } = data;

        if (!socket.player) {
            socket.emit('error', { message: 'You must be logged in to change colors.' });
            return;
        }

        // Check if player can change this piece's color
        if (socket.player.symbol !== piece) {
            socket.emit('error', { message: 'You can only change your own piece color.' });
            return;
        }

        // Validate color format (basic hex color validation)
        if (!/^#[0-9A-F]{6}$/i.test(color)) {
            socket.emit('error', { message: 'Invalid color format.' });
            return;
        }

        if (!socket.playerRoom) return;

        const room = rooms.get(socket.playerRoom);
        if (!room) return;

        // Update server-side color
        room.pieceColors[piece] = color;

        // Broadcast color change to all players in room
        io.to(socket.playerRoom).emit('colorChanged', {
            piece: piece,
            color: color
        });

        console.log(`${socket.player.username} changed ${piece} color to ${color}`);
    });

    // Handle username changes
    socket.on('changeUsername', (data) => {
        const { newUsername } = data;

        if (!socket.player) {
            socket.emit('usernameChanged', {
                success: false,
                message: 'You must be logged in to change your username.'
            });
            return;
        }

        // Validate new username
        if (!newUsername || typeof newUsername !== 'string') {
            socket.emit('usernameChanged', {
                success: false,
                message: 'Invalid username provided.'
            });
            return;
        }

        const trimmedUsername = newUsername.trim();

        if (trimmedUsername.length < 2 || trimmedUsername.length > 20) {
            socket.emit('usernameChanged', {
                success: false,
                message: 'Username must be between 2 and 20 characters.'
            });
            return;
        }

        if (!/^[a-zA-Z0-9\s_-]+$/.test(trimmedUsername)) {
            socket.emit('usernameChanged', {
                success: false,
                message: 'Username can only contain letters, numbers, spaces, hyphens, and underscores.'
            });
            return;
        }

        if (!socket.playerRoom) return;

        const room = rooms.get(socket.playerRoom);
        if (!room) return;

        // Check if username is already taken in this room (case-insensitive, excluding current user)
        const existingPlayer = room.players.find(p =>
            p.id !== socket.id && p.username && p.username.toLowerCase() === trimmedUsername.toLowerCase()
        );

        if (existingPlayer) {
            socket.emit('usernameChanged', {
                success: false,
                message: 'This username is already taken by another player.'
            });
            return;
        }

        // Update the player's username
        const oldUsername = socket.player.username;
        socket.player.username = trimmedUsername;

        // Send success response to the requesting player
        socket.emit('usernameChanged', {
            success: true,
            newUsername: trimmedUsername,
            message: 'Username updated successfully!'
        });

        // Broadcast updated game state to all players in room
        io.to(socket.playerRoom).emit('gameStateUpdate', {
            players: room.players,
            board: room.board,
            currentPlayer: room.currentPlayer,
            gameActive: room.gameActive,
            scores: room.scores,
            piecesPlaced: room.piecesPlaced,
            gamePhase: room.gamePhase,
            maxPieces: room.maxPieces,
            pieceColors: room.pieceColors
        });

        console.log(`${oldUsername} changed username to ${trimmedUsername}`);
    });

    // Handle highscore requests
    socket.on('getHighscores', async () => {
        try {
            const topPlayers = await highscoreService.getTopPlayers(10);
            socket.emit('highscoresUpdate', { topPlayers });
        } catch (error) {
            console.error('Error fetching highscores:', error);
            socket.emit('error', { message: 'Failed to fetch highscores' });
        }
    });

    socket.on('getPlayerStats', async (data) => {
        const { userId } = data;

        if (!userId) {
            socket.emit('error', { message: 'User ID required' });
            return;
        }

        try {
            const stats = await highscoreService.getPlayerStats(userId);
            socket.emit('playerStatsUpdate', { stats });
        } catch (error) {
            console.error('Error fetching player stats:', error);
            socket.emit('error', { message: 'Failed to fetch player stats' });
        }
    });

    // Handle disconnect
    socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.id}`);

        if (socket.player && socket.playerRoom) {
            const room = rooms.get(socket.playerRoom);
            if (room) {
                // Remove player from room
                room.players = room.players.filter(p => p.id !== socket.id);

                // Reset room state
                resetGame(room);
                room.scores = { X: 0, O: 0, draw: 0 };
                room.lastActivity = new Date();

                // Reassign symbols if needed
                room.players.forEach((player, index) => {
                    player.symbol = index === 0 ? 'X' : 'O';
                });

                // Broadcast updated state to room
                io.to(socket.playerRoom).emit('playerDisconnected', {
                    username: socket.player.username
                });

                io.to(socket.playerRoom).emit('gameStateUpdate', {
                    players: room.players,
                    board: room.board,
                    currentPlayer: room.currentPlayer,
                    gameActive: room.gameActive,
                    scores: room.scores,
                    piecesPlaced: room.piecesPlaced,
                    gamePhase: room.gamePhase,
                    maxPieces: room.maxPieces
                });

                console.log(`${socket.player.username} disconnected and removed from room ${socket.playerRoom}`);
            }
        }
    });
});

// Railway and Azure-friendly port configuration
const PORT = process.env.PORT || process.env.WEBSITES_PORT || 3000;
const HOST = process.env.RAILWAY_STATIC_URL ? '0.0.0.0' : (process.env.WEBSITE_HOSTNAME || '0.0.0.0');

// Enhanced error handling for Azure
server.on('error', (error) => {
    console.error('Server error:', error);
    if (error.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} is already in use`);
        process.exit(1);
    }
});

// Graceful shutdown handling
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    server.close(() => {
        console.log('Process terminated');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully');
    server.close(() => {
        console.log('Process terminated');
        process.exit(0);
    });
});

server.listen(PORT, HOST, () => {
    console.log(`🚀 Server running on ${process.env.WEBSITE_HOSTNAME ? 'https://' + process.env.WEBSITE_HOSTNAME : `http://localhost:${PORT}`}`);
    console.log(`📊 Health check: /health`);
    console.log(`🎮 Multi-room game system ready - create or join rooms with game codes`);
    console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
});