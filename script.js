class TicTacToeMultiplayer {
    constructor() {
        this.socket = io();
        this.currentUser = null;
        this.auth0 = null;
        this.isAuthenticated = false;
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
        this.initializeAuth0();
        this.setupSocketListeners();
        this.addEventListeners();
    }

    initializeElements() {
        // Login elements
        this.loginModal = document.getElementById('loginModal');
        this.loginStatus = document.getElementById('loginStatus');
        this.gameContainer = document.getElementById('gameContainer');
        this.logoutBtn = document.getElementById('logoutBtn');

        // Auth0 and registration elements
        this.auth0LoginBtn = document.getElementById('auth0LoginBtn');
        this.registerBtn = document.getElementById('registerBtn');
        this.registrationModal = document.getElementById('registrationModal');
        this.registrationStatus = document.getElementById('registrationStatus');
        this.auth0RegisterBtn = document.getElementById('auth0RegisterBtn');
        this.localRegistrationForm = document.getElementById('localRegistrationForm');
        this.backToLoginBtn = document.getElementById('backToLoginBtn');

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

        // Settings modal elements
        this.settingsBtn = document.getElementById('settingsBtn');
        this.settingsModal = document.getElementById('settingsModal');
        this.closeSettingsBtn = document.getElementById('closeSettingsBtn');

        // Color picker elements
        this.xColorPicker = document.getElementById('xColorPicker');
        this.oColorPicker = document.getElementById('oColorPicker');
        this.xColorPreview = document.getElementById('xColorPreview');
        this.oColorPreview = document.getElementById('oColorPreview');
        this.xColorLabel = document.getElementById('xColorLabel');
        this.oColorLabel = document.getElementById('oColorLabel');

        // Initialize color customization
        this.initializeColorCustomization();
    }

    async initializeAuth0() {
        try {
            // Check if Auth0 SDK is available
            if (typeof createAuth0Client === 'undefined') {
                throw new Error('Auth0 SDK not loaded. createAuth0Client is undefined.');
            }


            // Get Auth0 configuration from server
            const response = await fetch('/auth/config');
            if (!response.ok) {
                throw new Error(`Failed to fetch Auth0 config: ${response.status}`);
            }

            const config = await response.json();

            this.auth0 = await createAuth0Client({
                domain: config.domain,
                clientId: config.clientId,
                authorizationParams: {
                    redirect_uri: window.location.origin,
                    audience: config.audience
                }
            });


            // Check if user is authenticated (returning from Auth0)
            const isAuthenticated = await this.auth0.isAuthenticated();
            if (isAuthenticated) {
                await this.handleAuth0Login();
            }

            // Handle Auth0 callback
            if (window.location.search.includes('code=')) {
                await this.auth0.handleRedirectCallback();
                await this.handleAuth0Login();
                // Clean up URL
                window.history.replaceState({}, document.title, window.location.pathname);
            }
        } catch (error) {
            console.error('Auth0 initialization error:', error);
            console.error('Error details:', error.message);
            this.showLoginStatus('Auth0 setup required.', 'error');
        }
    }

    setupSocketListeners() {
        // Login response
        this.socket.on('loginResponse', (data) => {
            if (data.success) {
                this.currentUser = data.player;
                this.showLoginStatus(data.message, 'success');

                setTimeout(() => {
                    this.showGameInterface();
                    // Update color picker access after login
                    this.updateColorPickerAccess();
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

            // Update colors from server state
            if (state.pieceColors) {
                this.syncColorsFromServer(state.pieceColors);
            }
        });

        // Listen for color changes from other players
        this.socket.on('colorChanged', (data) => {
            const { piece, color } = data;
            this.applyColorChange(piece, color, false); // false = don't emit to server
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
        });

        this.socket.on('disconnect', () => {
            this.showLoginStatus('Connection lost. Please refresh the page.', 'error');
        });
    }

    addEventListeners() {
        // Settings modal
        this.settingsBtn.addEventListener('click', () => this.showSettings());
        this.closeSettingsBtn.addEventListener('click', () => this.hideSettings());

        // Close settings modal when clicking outside
        this.settingsModal.addEventListener('click', (e) => {
            if (e.target === this.settingsModal) {
                this.hideSettings();
            }
        });

        // Auth0 login
        this.auth0LoginBtn.addEventListener('click', () => this.handleAuth0LoginClick());

        // Registration
        this.registerBtn.addEventListener('click', () => this.showRegistrationModal());
        this.auth0RegisterBtn.addEventListener('click', () => this.handleAuth0RegisterClick());
        this.localRegistrationForm.addEventListener('submit', (e) => this.handleLocalRegistration(e));
        this.backToLoginBtn.addEventListener('click', () => this.showLoginModal());

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


    async handleLogout() {
        this.socket.disconnect();
        this.currentUser = null;
        this.isAuthenticated = false;

        // Logout from Auth0 if authenticated there
        if (this.auth0 && await this.auth0.isAuthenticated()) {
            await this.auth0.logout({
                logoutParams: {
                    returnTo: window.location.origin
                }
            });
        } else {
            this.resetToLoginScreen();
            // Reconnect after a short delay
            setTimeout(() => {
                this.socket.connect();
                this.showLoginStatus('Logged out successfully', 'info');
            }, 500);
        }
    }

    async handleAuth0LoginClick() {
        if (!this.auth0) {
            this.showLoginStatus('Auth0 not configured.', 'error');
            return;
        }

        try {
            await this.auth0.loginWithRedirect({
                authorizationParams: {
                    prompt: 'login'
                }
            });
        } catch (error) {
            console.error('Auth0 login error:', error);
            this.showLoginStatus('Auth0 login failed. Please try again.', 'error');
        }
    }

    async handleAuth0RegisterClick() {
        if (!this.auth0) {
            this.showLoginStatus('Auth0 not configured. Please use local registration.', 'error');
            return;
        }

        try {
            await this.auth0.loginWithRedirect({
                authorizationParams: {
                    screen_hint: 'signup'
                }
            });
        } catch (error) {
            console.error('Auth0 registration error:', error);
            this.showRegistrationStatus('Auth0 registration failed. Please try again.', 'error');
        }
    }

    async handleAuth0Login() {
        if (!this.auth0) return;

        try {
            const user = await this.auth0.getUser();
            const token = await this.auth0.getTokenSilently();

            if (user && token) {
                this.isAuthenticated = true;
                this.socket.emit('login', { token });
            }
        } catch (error) {
            console.error('Auth0 token error:', error);
            this.showLoginStatus('Authentication failed. Please try logging in again.', 'error');
        }
    }

    async handleLocalRegistration(e) {
        e.preventDefault();
        const username = document.getElementById('regUsername').value.trim();
        const email = document.getElementById('regEmail').value.trim();
        const password = document.getElementById('regPassword').value;

        if (!username || !email || !password) {
            this.showRegistrationStatus('Please fill in all fields.', 'error');
            return;
        }

        try {
            const response = await fetch('/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, email, password })
            });

            const data = await response.json();

            if (response.ok) {
                this.showRegistrationStatus(`Account created successfully! Welcome, ${data.username}!`, 'success');
                this.localRegistrationForm.reset();
                setTimeout(() => {
                    this.showLoginModal();
                }, 2000);
            } else {
                this.showRegistrationStatus(data.error || 'Registration failed', 'error');
            }
        } catch (error) {
            console.error('Registration error:', error);
            this.showRegistrationStatus('Registration failed. Please try again.', 'error');
        }
    }

    showRegistrationModal() {
        this.loginModal.style.display = 'none';
        this.registrationModal.style.display = 'block';
    }

    showLoginModal() {
        this.registrationModal.style.display = 'none';
        this.loginModal.style.display = 'block';
        this.showRegistrationStatus('', '');
    }

    showRegistrationStatus(message, type) {
        this.registrationStatus.textContent = message;
        this.registrationStatus.className = `login-status ${type}`;
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
                this.showGameMessage(`Selected ${this.currentUser.symbol} piece. Click any empty cell to move it.`, 'info');

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

                // Pieces can move to any empty cell on the board

                // Make the move
                this.socket.emit('makeMove', {
                    cellIndex: index,
                    fromIndex: this.selectedCell
                });

                this.cancelMove(); // Reset move state
            }
        }
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

        // Update current player color
        this.updateCurrentPlayerColor();

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
        this.registrationModal.style.display = 'none';
        this.settingsModal.style.display = 'none';
        this.showLoginStatus('', '');
    }

    // Settings modal methods
    showSettings() {
        this.settingsModal.style.display = 'block';
        // Update color picker access when opening settings
        this.updateColorPickerAccess();
    }

    hideSettings() {
        this.settingsModal.style.display = 'none';
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

    // Color customization methods
    initializeColorCustomization() {
        // Load saved colors from localStorage
        const savedXColor = localStorage.getItem('ticTacToe_xColor') || '#e74c3c';
        const savedOColor = localStorage.getItem('ticTacToe_oColor') || '#3498db';

        // Set initial values
        this.xColorPicker.value = savedXColor;
        this.oColorPicker.value = savedOColor;

        // Update preview colors
        this.updateColorPreview('X', savedXColor);
        this.updateColorPreview('O', savedOColor);

        // Apply colors to the game board
        this.applyColorsToBoard();

        // Add event listeners with player restriction
        this.xColorPicker.addEventListener('input', (e) => {
            if (this.canChangeColor('X')) {
                const color = e.target.value;
                this.applyColorChange('X', color, true); // true = emit to server
            } else {
                // Reset to previous value if not allowed
                e.target.value = this.xColorPicker.value;
                this.showGameMessage("You can only change your own piece color!", 'error');
            }
        });

        this.oColorPicker.addEventListener('input', (e) => {
            if (this.canChangeColor('O')) {
                const color = e.target.value;
                this.applyColorChange('O', color, true); // true = emit to server
            } else {
                // Reset to previous value if not allowed
                e.target.value = this.oColorPicker.value;
                this.showGameMessage("You can only change your own piece color!", 'error');
            }
        });

        // Initial UI state update
        this.updateColorPickerAccess();
    }

    canChangeColor(piece) {
        // Allow color changes if not logged in (local play)
        if (!this.currentUser) {
            return true;
        }

        // Allow only if the piece belongs to the current player
        return this.currentUser.symbol === piece;
    }

    updateColorPickerAccess() {
        if (!this.currentUser) {
            // Local play - enable both
            this.xColorPicker.disabled = false;
            this.oColorPicker.disabled = false;
            this.xColorPicker.style.opacity = '1';
            this.oColorPicker.style.opacity = '1';
            this.xColorLabel.textContent = 'Player X Color:';
            this.oColorLabel.textContent = 'Player O Color:';
            return;
        }

        // Get player names for labels
        const xPlayerName = this.gameState.players.find(p => p.symbol === 'X')?.username || 'Player X';
        const oPlayerName = this.gameState.players.find(p => p.symbol === 'O')?.username || 'Player O';

        // Multiplayer - disable opponent's color picker
        if (this.currentUser.symbol === 'X') {
            this.xColorPicker.disabled = false;
            this.oColorPicker.disabled = true;
            this.xColorPicker.style.opacity = '1';
            this.oColorPicker.style.opacity = '0.5';
            this.xColorLabel.textContent = `Your Color (${xPlayerName}):`;
            this.oColorLabel.textContent = `${oPlayerName}'s Color:`;
        } else {
            this.xColorPicker.disabled = true;
            this.oColorPicker.disabled = false;
            this.xColorPicker.style.opacity = '0.5';
            this.oColorPicker.style.opacity = '1';
            this.xColorLabel.textContent = `${xPlayerName}'s Color:`;
            this.oColorLabel.textContent = `Your Color (${oPlayerName}):`;
        }
    }

    updateColorPreview(piece, color) {
        if (piece === 'X') {
            this.xColorPreview.style.color = color;
        } else {
            this.oColorPreview.style.color = color;
        }
    }

    applyColorsToBoard() {
        const xColor = this.xColorPicker.value;
        const oColor = this.oColorPicker.value;

        // Create/update custom CSS styles
        let styleSheet = document.getElementById('customPieceColors');
        if (!styleSheet) {
            styleSheet = document.createElement('style');
            styleSheet.id = 'customPieceColors';
            document.head.appendChild(styleSheet);
        }

        styleSheet.innerHTML = `
            .cell.x {
                color: ${xColor} !important;
            }
            .cell.o {
                color: ${oColor} !important;
            }
        `;

        // Update current player color
        this.updateCurrentPlayerColor();
    }

    updateCurrentPlayerColor() {
        if (this.playerDisplay && this.xColorPicker && this.oColorPicker) {
            const xColor = this.xColorPicker.value;
            const oColor = this.oColorPicker.value;
            const currentColor = this.gameState.currentPlayer === 'X' ? xColor : oColor;
            this.playerDisplay.style.color = currentColor;
        }
    }

    // Unified color change method
    applyColorChange(piece, color, emitToServer = false) {
        // Update color picker
        if (piece === 'X') {
            this.xColorPicker.value = color;
        } else {
            this.oColorPicker.value = color;
        }

        // Update preview
        this.updateColorPreview(piece, color);

        // Apply to board
        this.applyColorsToBoard();

        // Save locally for persistence
        localStorage.setItem(`ticTacToe_${piece.toLowerCase()}Color`, color);

        // Emit to server if this is a local change
        if (emitToServer && this.socket) {
            this.socket.emit('changeColor', {
                piece: piece,
                color: color
            });
        }
    }

    // Sync colors from server state
    syncColorsFromServer(pieceColors) {
        if (pieceColors.X) {
            this.applyColorChange('X', pieceColors.X, false);
        }
        if (pieceColors.O) {
            this.applyColorChange('O', pieceColors.O, false);
        }
    }
}

// Initialize the game when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.game = new TicTacToeMultiplayer();
});