const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Game state
const gameState = {
    players: [],
    maxPlayers: 2,
    board: ['', '', '', '', '', '', '', '', ''],
    currentPlayer: 'X',
    gameActive: true,
    scores: { X: 0, O: 0, draw: 0 }
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
            scores: gameState.scores
        });

        console.log(`${username} logged in as ${player.symbol}`);
    });

    // Handle game moves
    socket.on('makeMove', (data) => {
        const { cellIndex } = data;

        if (!socket.player) {
            socket.emit('error', { message: 'You must be logged in to play.' });
            return;
        }

        // Check if it's the player's turn
        if (socket.player.symbol !== gameState.currentPlayer) {
            socket.emit('error', { message: 'It\'s not your turn!' });
            return;
        }

        // Check if game is active and cell is empty
        if (!gameState.gameActive || gameState.board[cellIndex] !== '') {
            return;
        }

        // Check if we have enough players
        if (gameState.players.length < 2) {
            socket.emit('error', { message: 'Waiting for another player.' });
            return;
        }

        // Make the move
        gameState.board[cellIndex] = gameState.currentPlayer;

        // Check for win
        const winResult = checkWin(gameState.board);
        if (winResult) {
            gameState.gameActive = false;
            gameState.scores[winResult.winner]++;

            io.emit('gameOver', {
                winner: winResult.winner,
                winnerName: gameState.players.find(p => p.symbol === winResult.winner)?.username,
                pattern: winResult.pattern,
                board: gameState.board,
                scores: gameState.scores
            });
        } else if (checkDraw(gameState.board)) {
            gameState.gameActive = false;
            gameState.scores.draw++;

            io.emit('gameOver', {
                winner: null,
                draw: true,
                board: gameState.board,
                scores: gameState.scores
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
                scores: gameState.scores
            });
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
            scores: gameState.scores
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
            scores: gameState.scores
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
                scores: gameState.scores
            });

            console.log(`${socket.player.username} disconnected and removed from game`);
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log('Available users:');
    Object.keys(users).forEach(username => {
        console.log(`  ${username} : ${users[username]}`);
    });
});