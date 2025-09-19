class TicTacToeMultiplayer {
    constructor() {
        this.socket = io();
        this.currentUser = null;
        this.gameState = {
            players: [],
            board: ['', '', '', '', '', '', '', '', ''],
            currentPlayer: 'X',
            gameActive: true,
            scores: { X: 0, O: 0, draw: 0 },
            // New properties for move pieces feature
            piecesPlaced: { X: 0, O: 0 },
            gamePhase: 'placement',
            maxPieces: 3
        };

        // State for move pieces functionality
        this.selectedCell = null;
        this.isMoving = false;

        this.initializeElements();
        this.setupSocketListeners();
        this.addEventListeners();
    }

    initializeElements() {
        // Login elements
        this.loginModal = document.getElementById('loginModal');
        this.loginForm = document.getElementById('loginForm');
        this.loginStatus = document.getElementById('loginStatus');
        this.gameContainer = document.getElementById('gameContainer');
        this.logoutBtn = document.getElementById('logoutBtn');

        // Player info elements
        this.player1Slot = document.getElementById('player1Slot');
        this.player2Slot = document.getElementById('player2Slot');
        this.player1Name = document.getElementById('player1Name');
        this.player2Name = document.getElementById('player2Name');

        // Game elements
        this.cells = document.querySelectorAll('.cell');
        this.gameStatus = document.getElementById('gameStatus');
        this.playerDisplay = document.getElementById('player');
        this.resetBtn = document.getElementById('resetBtn');
        this.resetScoreBtn = document.getElementById('resetScoreBtn');

        // Score elements
        this.scoreXDisplay = document.getElementById('scoreX');
        this.scoreODisplay = document.getElementById('scoreO');
        this.scoreDrawDisplay = document.getElementById('scoreDraw');

        // Game mode elements
        this.modeRadios = document.querySelectorAll('input[name="mode"]');
    }

    setupSocketListeners() {
        // Login response
        this.socket.on('loginResponse', (data) => {
            if (data.success) {
                this.currentUser = data.player;
                this.showLoginStatus(data.message, 'success');

                setTimeout(() => {
                    this.showGameInterface();
                }, 1000);
            } else {
                this.showLoginStatus(data.message, 'error');
            }
        });

        // Game state updates
        this.socket.on('gameStateUpdate', (state) => {
            this.gameState = state;
            this.updateDisplay();
            this.updatePlayerDisplay();
            this.updateScoreDisplay();
            this.checkGameReadiness();
        });

        // Game over
        this.socket.on('gameOver', (data) => {
            this.gameState.board = data.board;
            this.gameState.scores = data.scores;
            this.gameState.gameActive = false;

            this.updateBoard();
            this.updateScoreDisplay();

            if (data.winner) {
                this.highlightWinningCells(data.pattern);
                this.gameStatus.textContent = `${data.winnerName} wins!`;
                this.gameStatus.className = 'game-status winner';
            } else if (data.draw) {
                this.gameStatus.textContent = "It's a draw!";
                this.gameStatus.className = 'game-status draw';
            }
        });

        // Player disconnected
        this.socket.on('playerDisconnected', (data) => {
            this.showLoginStatus(`${data.username} disconnected`, 'info');
            setTimeout(() => {
                this.showLoginStatus('', '');
            }, 3000);
        });

        // Error messages
        this.socket.on('error', (data) => {
            this.showGameMessage(data.message, 'error');
        });

        // Connection status
        this.socket.on('connect', () => {
            console.log('Connected to server');
        });

        this.socket.on('disconnect', () => {
            console.log('Disconnected from server');
            this.showLoginStatus('Connection lost. Please refresh the page.', 'error');
        });
    }

    addEventListeners() {
        // Login form
        this.loginForm.addEventListener('submit', (e) => this.handleLogin(e));

        // Logout button
        this.logoutBtn.addEventListener('click', () => this.handleLogout());

        // Game cells
        this.cells.forEach((cell, index) => {
            cell.addEventListener('click', () => this.handleCellClick(index));
        });

        // Game controls
        this.resetBtn.addEventListener('click', () => this.resetGame());
        this.resetScoreBtn.addEventListener('click', () => this.resetScore());

        // Game mode (disable for multiplayer)
        this.modeRadios.forEach(radio => {
            radio.disabled = true; // Disable computer mode for multiplayer
        });
    }

    handleLogin(e) {
        e.preventDefault();
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;

        if (!username || !password) {
            this.showLoginStatus('Please enter both username and password.', 'error');
            return;
        }

        this.socket.emit('login', { username, password });
        this.loginForm.reset();
    }

    handleLogout() {
        this.socket.disconnect();
        this.currentUser = null;
        this.resetToLoginScreen();

        // Reconnect after a short delay
        setTimeout(() => {
            this.socket.connect();
            this.showLoginStatus('Logged out successfully', 'info');
        }, 500);
    }

    handleCellClick(index) {
        if (!this.gameState.gameActive) {
            return;
        }

        if (!this.currentUser) {
            this.showGameMessage('You must be logged in to play', 'error');
            return;
        }

        if (this.currentUser.symbol !== this.gameState.currentPlayer) {
            this.showGameMessage('It\'s not your turn!', 'error');
            return;
        }

        if (this.gameState.gamePhase === 'placement') {
            // PLACEMENT PHASE: Place a new piece
            if (this.gameState.board[index] !== '') {
                this.showGameMessage('Cell is already occupied!', 'error');
                return;
            }

            if (this.gameState.piecesPlaced[this.currentUser.symbol] >= this.gameState.maxPieces) {
                this.showGameMessage('You have already placed all your pieces!', 'error');
                return;
            }

            this.socket.emit('makeMove', { cellIndex: index });

        } else if (this.gameState.gamePhase === 'movement') {
            // MOVEMENT PHASE: Select and move pieces
            const cellContent = this.gameState.board[index];

            if (!this.isMoving) {
                // First click: Select a piece to move
                if (cellContent !== this.currentUser.symbol) {
                    this.showGameMessage('You can only select your own pieces!', 'error');
                    return;
                }

                this.selectedCell = index;
                this.isMoving = true;
                this.highlightSelectedPiece(index);
                this.showGameMessage(`Selected ${this.currentUser.symbol} piece. Click an adjacent empty cell to move it.`, 'info');

            } else {
                // Second click: Move the selected piece
                if (index === this.selectedCell) {
                    // Clicking the same cell cancels the move
                    this.cancelMove();
                    return;
                }

                if (cellContent !== '') {
                    this.showGameMessage('Target cell must be empty!', 'error');
                    return;
                }

                // Check if the move is to an adjacent cell
                if (!this.isAdjacentCell(this.selectedCell, index)) {
                    this.showGameMessage('You can only move to adjacent cells!', 'error');
                    return;
                }

                // Make the move
                this.socket.emit('makeMove', {
                    cellIndex: index,
                    fromIndex: this.selectedCell
                });

                this.cancelMove(); // Reset move state
            }
        }
    }

    isAdjacentCell(fromIndex, toIndex) {
        const fromRow = Math.floor(fromIndex / 3);
        const fromCol = fromIndex % 3;
        const toRow = Math.floor(toIndex / 3);
        const toCol = toIndex % 3;

        const rowDiff = Math.abs(fromRow - toRow);
        const colDiff = Math.abs(fromCol - toCol);

        // Adjacent includes diagonals (8 directions)
        return (rowDiff <= 1 && colDiff <= 1) && !(rowDiff === 0 && colDiff === 0);
    }

    highlightSelectedPiece(index) {
        // Remove previous highlights
        this.cells.forEach(cell => cell.classList.remove('selected'));

        // Highlight the selected piece
        this.cells[index].classList.add('selected');
    }

    cancelMove() {
        this.selectedCell = null;
        this.isMoving = false;
        this.cells.forEach(cell => cell.classList.remove('selected'));
        this.showGameMessage('', '');
    }

    resetGame() {
        this.socket.emit('resetGame');
    }

    resetScore() {
        this.socket.emit('resetScore');
    }

    updateDisplay() {
        this.updateBoard();

        // Update current player display
        let currentPlayerName = this.gameState.currentPlayer;
        if (this.gameState.players.length === 2) {
            const currentUser = this.gameState.players.find(p => p.symbol === this.gameState.currentPlayer);
            currentPlayerName = currentUser ? currentUser.username : this.gameState.currentPlayer;
        }
        this.playerDisplay.textContent = currentPlayerName;

        // Update game phase display
        this.updateGamePhaseDisplay();

        // Clear game status if game is active
        if (this.gameState.gameActive) {
            this.gameStatus.textContent = '';
            this.gameStatus.className = 'game-status';
        }
    }

    updateGamePhaseDisplay() {
        // Remove the phase display entirely for cleaner UI
        let phaseDisplay = document.getElementById('gamePhaseDisplay');
        if (phaseDisplay) {
            phaseDisplay.remove();
        }
    }

    updateBoard() {
        this.cells.forEach((cell, index) => {
            const cellValue = this.gameState.board[index];
            cell.textContent = cellValue;
            cell.className = 'cell';
            if (cellValue) {
                cell.classList.add(cellValue.toLowerCase());
            }
        });
    }

    updatePlayerDisplay() {
        // Update player 1
        if (this.gameState.players.length > 0) {
            this.player1Name.textContent = this.gameState.players[0].username;
            this.player1Slot.classList.add('active');
        } else {
            this.player1Name.textContent = 'Waiting...';
            this.player1Slot.classList.remove('active');
        }

        // Update player 2
        if (this.gameState.players.length > 1) {
            this.player2Name.textContent = this.gameState.players[1].username;
            this.player2Slot.classList.add('active');
        } else {
            this.player2Name.textContent = 'Waiting...';
            this.player2Slot.classList.remove('active');
        }
    }

    updateScoreDisplay() {
        // Update score labels with player names
        if (this.gameState.players.length === 2) {
            this.scoreXDisplay.parentNode.firstChild.textContent = `${this.gameState.players[0].username}: `;
            this.scoreODisplay.parentNode.firstChild.textContent = `${this.gameState.players[1].username}: `;
        } else {
            this.scoreXDisplay.parentNode.firstChild.textContent = 'Player X: ';
            this.scoreODisplay.parentNode.firstChild.textContent = 'Player O: ';
        }

        this.scoreXDisplay.textContent = this.gameState.scores.X;
        this.scoreODisplay.textContent = this.gameState.scores.O;
        this.scoreDrawDisplay.textContent = this.gameState.scores.draw;
    }

    checkGameReadiness() {
        const gameBoard = document.getElementById('gameBoard');
        const gameModeSection = document.querySelector('.game-mode');
        const waitingMsg = document.querySelector('.waiting-message');

        // Remove existing waiting message
        if (waitingMsg) {
            waitingMsg.remove();
        }

        if (this.gameState.players.length < 2) {
            gameBoard.classList.add('game-disabled');
            if (gameModeSection) {
                gameModeSection.style.display = 'none';
            }

            if (this.currentUser) {
                const waitingMessage = document.createElement('div');
                waitingMessage.className = 'waiting-message';
                waitingMessage.textContent = `Waiting for ${2 - this.gameState.players.length} more player(s) to join...`;
                gameBoard.parentNode.insertBefore(waitingMessage, gameBoard);
            }
        } else {
            gameBoard.classList.remove('game-disabled');
            if (gameModeSection) {
                gameModeSection.style.display = 'none'; // Keep hidden for multiplayer
            }
        }
    }

    highlightWinningCells(pattern) {
        if (pattern) {
            pattern.forEach(index => {
                this.cells[index].classList.add('winning');
            });
        }
    }

    showGameInterface() {
        this.loginModal.style.display = 'none';
        this.gameContainer.style.display = 'block';
    }

    resetToLoginScreen() {
        this.loginModal.style.display = 'block';
        this.gameContainer.style.display = 'none';
        this.showLoginStatus('', '');
    }

    showLoginStatus(message, type) {
        this.loginStatus.textContent = message;
        this.loginStatus.className = `login-status ${type}`;
    }

    showGameMessage(message, type) {
        const tempMessage = document.createElement('div');
        tempMessage.className = `game-message ${type}`;
        tempMessage.textContent = message;
        tempMessage.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 10px 20px;
            border-radius: 5px;
            color: white;
            font-weight: bold;
            z-index: 1000;
            background: ${type === 'error' ? '#dc3545' : type === 'success' ? '#28a745' : '#17a2b8'};
        `;

        document.body.appendChild(tempMessage);

        setTimeout(() => {
            if (tempMessage.parentNode) {
                tempMessage.parentNode.removeChild(tempMessage);
            }
        }, 3000);
    }
}

// Initialize the game when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new TicTacToeMultiplayer();
});