const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');

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

// Health check endpoint for Azure
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        players: gameState.players.length
    });
});

// Game state
const gameState = {
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
    maxPieces: 3
};

// User credentials
const users = {
    'player1': 'password1',
    'player2': 'password2',
    'alice': 'alice123',
    'bob': 'bob456',
    'admin': 'admin789'
};

// Helper functions
function resetGame() {
    gameState.board = ['', '', '', '', '', '', '', '', ''];
    gameState.currentPlayer = 'X';
    gameState.gameActive = true;
    gameState.piecesPlaced = { X: 0, O: 0 };
    gameState.gamePhase = 'placement';
    gameState.selectedPiece = null;
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
function isValidMove(fromIndex, toIndex, player) {
    // Check if fromIndex has the player's piece
    if (gameState.board[fromIndex] !== player) {
        return false;
    }

    // Check if toIndex is empty
    if (gameState.board[toIndex] !== '') {
        return false;
    }

    // In movement phase, pieces can only move to adjacent cells
    const adjacentCells = getAdjacentCells(fromIndex);
    return adjacentCells.includes(toIndex);
}

function getAdjacentCells(index) {
    const row = Math.floor(index / 3);
    const col = index % 3;
    const adjacent = [];

    // Check all 8 directions (including diagonals)
    for (let r = -1; r <= 1; r++) {
        for (let c = -1; c <= 1; c++) {
            if (r === 0 && c === 0) continue; // Skip the current cell

            const newRow = row + r;
            const newCol = col + c;

            if (newRow >= 0 && newRow < 3 && newCol >= 0 && newCol < 3) {
                adjacent.push(newRow * 3 + newCol);
            }
        }
    }

    return adjacent;
}

function switchToMovementPhase() {
    if (gameState.piecesPlaced.X >= gameState.maxPieces &&
        gameState.piecesPlaced.O >= gameState.maxPieces) {
        gameState.gamePhase = 'movement';
        return true;
    }
    return false;
}

// Serve the main HTML file
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    // Handle login
    socket.on('login', (data) => {
        const { username, password } = data;

        // Validate credentials
        if (!users[username] || users[username] !== password) {
            socket.emit('loginResponse', {
                success: false,
                message: 'Invalid username or password.'
            });
            return;
        }

        // Check if user is already logged in
        const existingPlayer = gameState.players.find(p => p.username === username);
        if (existingPlayer) {
            socket.emit('loginResponse', {
                success: false,
                message: 'User is already logged in.'
            });
            return;
        }

        // Check if game is full
        if (gameState.players.length >= gameState.maxPlayers) {
            socket.emit('loginResponse', {
                success: false,
                message: 'Maximum number of players (2) already logged in.'
            });
            return;
        }

        // Add player
        const player = {
            id: socket.id,
            username: username,
            symbol: gameState.players.length === 0 ? 'X' : 'O',
            loginTime: new Date()
        };

        gameState.players.push(player);
        socket.player = player;

        // Send success response
        socket.emit('loginResponse', {
            success: true,
            message: `Welcome, ${username}!`,
            player: player
        });

        // Broadcast updated game state to all clients
        io.emit('gameStateUpdate', {
            players: gameState.players,
            board: gameState.board,
            currentPlayer: gameState.currentPlayer,
            gameActive: gameState.gameActive,
            scores: gameState.scores,
            piecesPlaced: gameState.piecesPlaced,
            gamePhase: gameState.gamePhase,
            maxPieces: gameState.maxPieces
        });

        console.log(`${username} logged in as ${player.symbol}`);
    });

    // Handle game moves (both placement and movement)
    socket.on('makeMove', (data) => {
        const { cellIndex, fromIndex } = data; // fromIndex is provided for movement phase

        if (!socket.player) {
            socket.emit('error', { message: 'You must be logged in to play.' });
            return;
        }

        // Check if it's the player's turn
        if (socket.player.symbol !== gameState.currentPlayer) {
            socket.emit('error', { message: 'It\'s not your turn!' });
            return;
        }

        // Check if game is active
        if (!gameState.gameActive) {
            return;
        }

        // Check if we have enough players
        if (gameState.players.length < 2) {
            socket.emit('error', { message: 'Waiting for another player.' });
            return;
        }

        const currentSymbol = gameState.currentPlayer;
        let moveSuccessful = false;

        if (gameState.gamePhase === 'placement') {
            // PLACEMENT PHASE: Place a new piece
            if (gameState.board[cellIndex] !== '') {
                socket.emit('error', { message: 'Cell is already occupied!' });
                return;
            }

            if (gameState.piecesPlaced[currentSymbol] >= gameState.maxPieces) {
                socket.emit('error', { message: 'You have already placed all your pieces!' });
                return;
            }

            // Place the piece
            gameState.board[cellIndex] = currentSymbol;
            gameState.piecesPlaced[currentSymbol]++;
            moveSuccessful = true;

            // Check if we should switch to movement phase
            switchToMovementPhase();

        } else if (gameState.gamePhase === 'movement') {
            // MOVEMENT PHASE: Move an existing piece
            if (fromIndex === undefined || fromIndex === null) {
                socket.emit('error', { message: 'You must select a piece to move!' });
                return;
            }

            if (!isValidMove(fromIndex, cellIndex, currentSymbol)) {
                socket.emit('error', { message: 'Invalid move! You can only move your pieces to adjacent empty cells.' });
                return;
            }

            // Move the piece
            gameState.board[fromIndex] = '';
            gameState.board[cellIndex] = currentSymbol;
            moveSuccessful = true;
        }

        if (moveSuccessful) {
            // Check for win after any successful move
            const winResult = checkWin(gameState.board);
            if (winResult) {
                gameState.gameActive = false;
                gameState.scores[winResult.winner]++;

                io.emit('gameOver', {
                    winner: winResult.winner,
                    winnerName: gameState.players.find(p => p.symbol === winResult.winner)?.username,
                    pattern: winResult.pattern,
                    board: gameState.board,
                    scores: gameState.scores,
                    gamePhase: gameState.gamePhase
                });
            } else if (gameState.gamePhase === 'placement' && checkDraw(gameState.board)) {
                // Only check for draw in placement phase
                gameState.gameActive = false;
                gameState.scores.draw++;

                io.emit('gameOver', {
                    winner: null,
                    draw: true,
                    board: gameState.board,
                    scores: gameState.scores,
                    gamePhase: gameState.gamePhase
                });
            } else {
                // Switch player
                gameState.currentPlayer = gameState.currentPlayer === 'X' ? 'O' : 'X';

                // Broadcast updated game state
                io.emit('gameStateUpdate', {
                    players: gameState.players,
                    board: gameState.board,
                    currentPlayer: gameState.currentPlayer,
                    gameActive: gameState.gameActive,
                    scores: gameState.scores,
                    piecesPlaced: gameState.piecesPlaced,
                    gamePhase: gameState.gamePhase,
                    maxPieces: gameState.maxPieces
                });
            }
        }
    });

    // Handle reset game
    socket.on('resetGame', () => {
        if (!socket.player) return;

        resetGame();
        io.emit('gameStateUpdate', {
            players: gameState.players,
            board: gameState.board,
            currentPlayer: gameState.currentPlayer,
            gameActive: gameState.gameActive,
            scores: gameState.scores,
            piecesPlaced: gameState.piecesPlaced,
            gamePhase: gameState.gamePhase,
            maxPieces: gameState.maxPieces
        });
    });

    // Handle reset score
    socket.on('resetScore', () => {
        if (!socket.player) return;

        gameState.scores = { X: 0, O: 0, draw: 0 };
        io.emit('gameStateUpdate', {
            players: gameState.players,
            board: gameState.board,
            currentPlayer: gameState.currentPlayer,
            gameActive: gameState.gameActive,
            scores: gameState.scores,
            piecesPlaced: gameState.piecesPlaced,
            gamePhase: gameState.gamePhase,
            maxPieces: gameState.maxPieces
        });
    });

    // Handle disconnect
    socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.id}`);

        if (socket.player) {
            // Remove player from game
            gameState.players = gameState.players.filter(p => p.id !== socket.id);

            // Reset game state
            resetGame();
            gameState.scores = { X: 0, O: 0, draw: 0 };

            // Reassign symbols if needed
            gameState.players.forEach((player, index) => {
                player.symbol = index === 0 ? 'X' : 'O';
            });

            // Broadcast updated state
            io.emit('playerDisconnected', {
                username: socket.player.username
            });

            io.emit('gameStateUpdate', {
                players: gameState.players,
                board: gameState.board,
                currentPlayer: gameState.currentPlayer,
                gameActive: gameState.gameActive,
                scores: gameState.scores,
                piecesPlaced: gameState.piecesPlaced,
                gamePhase: gameState.gamePhase,
                maxPieces: gameState.maxPieces
            });

            console.log(`${socket.player.username} disconnected and removed from game`);
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
    console.log(`🎮 Game ready for ${gameState.maxPlayers} players`);
    console.log('👥 Available users:');
    Object.keys(users).forEach(username => {
        console.log(`   ${username} : ${users[username]}`);
    });
    console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
});