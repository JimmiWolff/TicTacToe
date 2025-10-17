class TicTacToeMultiplayer {
    constructor() {
        this.socket = io();
        this.currentUser = null;
        this.auth0 = null;
        this.isAuthenticated = false;
        this.currentRoom = null;
        this.roomCode = null;
        this.storedAuthToken = null;
        this.storedCustomUsername = null;
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

        // Username setup elements
        this.usernameModal = document.getElementById('usernameModal');
        this.usernameStatus = document.getElementById('usernameStatus');
        this.usernameForm = document.getElementById('usernameForm');
        this.displayUsernameInput = document.getElementById('displayUsername');
        this.backToAuthBtn = document.getElementById('backToAuth');

        // Room selection elements
        this.roomModal = document.getElementById('roomModal');
        this.roomStatus = document.getElementById('roomStatus');
        this.joinRoomForm = document.getElementById('joinRoomForm');
        this.roomCodeInput = document.getElementById('roomCodeInput');
        this.createRoomBtn = document.getElementById('createRoomBtn');
        this.quickPlayBtn = document.getElementById('quickPlayBtn');

        // My Games elements
        this.myGamesSection = document.getElementById('myGamesSection');
        this.myGamesList = document.getElementById('myGamesList');
        this.myGamesLoading = document.getElementById('myGamesLoading');


        // Room info display elements
        this.roomInfo = document.getElementById('roomInfo');
        this.roomCodeDisplay = document.getElementById('roomCodeDisplay');
        this.shareRoomBtn = document.getElementById('shareRoomBtn');

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

        // Username change elements
        this.usernameChangeForm = document.getElementById('usernameChangeForm');
        this.newUsernameInput = document.getElementById('newUsernameInput');
        this.usernameChangeStatus = document.getElementById('usernameChangeStatus');

        // Highscores modal elements
        this.highscoresBtn = document.getElementById('highscoresBtn');
        this.highscoresModal = document.getElementById('highscoresModal');
        this.closeHighscoresBtn = document.getElementById('closeHighscoresBtn');
        this.topPlayersList = document.getElementById('topPlayersList');
        this.playerStatsDisplay = document.getElementById('playerStatsDisplay');
        this.highscoresLoading = document.getElementById('highscoresLoading');
        this.statsLoading = document.getElementById('statsLoading');

        // Initialize color customization
        this.initializeColorCustomization();
    }

    async initializeAuth0() {
        try {
            // Disable login buttons during initialization
            this.auth0LoginBtn.disabled = true;
            this.auth0RegisterBtn.disabled = true;
            this.auth0LoginBtn.textContent = 'Loading...';

            console.log('Starting Auth0 initialization...');

            // Check if Auth0 SDK is available
            if (typeof createAuth0Client === 'undefined') {
                throw new Error('Auth0 SDK not loaded. createAuth0Client is undefined.');
            }

            console.log('Auth0 SDK found');

            // Get Auth0 configuration from server
            const response = await fetch('/auth/config');
            if (!response.ok) {
                throw new Error(`Failed to fetch Auth0 config: ${response.status}`);
            }

            const config = await response.json();
            console.log('Auth0 config received:', { domain: config.domain, clientId: config.clientId });

            // Validate config
            if (!config.domain || !config.clientId) {
                throw new Error('Auth0 configuration is incomplete');
            }

            console.log('Creating Auth0 client...');
            this.auth0 = await createAuth0Client({
                domain: config.domain,
                clientId: config.clientId,
                authorizationParams: {
                    redirect_uri: window.location.origin,
                    audience: config.audience
                },
                cacheLocation: 'localstorage',
                useRefreshTokens: true
            });

            console.log('Auth0 client created successfully');

            // Handle Auth0 callback FIRST (before checking isAuthenticated)
            if (window.location.search.includes('code=') || window.location.search.includes('state=')) {
                console.log('Handling Auth0 callback...');
                try {
                    await this.auth0.handleRedirectCallback();
                    await this.handleAuth0Login();
                } catch (callbackError) {
                    console.error('Callback handling error:', callbackError);
                }
                // Clean up URL
                window.history.replaceState({}, document.title, window.location.pathname);
            } else {
                // Check if user is authenticated (only if not handling callback)
                console.log('Checking authentication status...');
                try {
                    const isAuthenticated = await Promise.race([
                        this.auth0.isAuthenticated(),
                        new Promise((_, reject) => setTimeout(() => reject(new Error('Auth check timeout')), 5000))
                    ]);
                    console.log('Authentication status:', isAuthenticated);

                    if (isAuthenticated) {
                        await this.handleAuth0Login();
                    }
                } catch (authCheckError) {
                    console.warn('Auth check failed or timed out:', authCheckError);
                    // Continue anyway - user can still log in
                }
            }

            // Re-enable buttons after successful initialization
            this.auth0LoginBtn.disabled = false;
            this.auth0RegisterBtn.disabled = false;
            this.auth0LoginBtn.textContent = 'Login';

            console.log('Auth0 initialization complete');

        } catch (error) {
            console.error('Auth0 initialization error:', error);
            console.error('Error details:', error.message);
            console.error('Error stack:', error.stack);

            // Re-enable buttons but show error state
            this.auth0LoginBtn.disabled = false;
            this.auth0RegisterBtn.disabled = false;
            this.auth0LoginBtn.textContent = 'Login';

            this.showLoginStatus('Auth0 setup required. Check console for details.', 'error');

            // Set auth0 to null so click handlers know it's not available
            this.auth0 = null;
        }
    }

    setupSocketListeners() {
        // Login response
        this.socket.on('loginResponse', (data) => {
            if (data.success) {
                this.currentUser = data.player;

                // If we have pending auth data, store the Auth0 userId for persistence
                if (this.pendingAuth && this.pendingAuth.user && this.pendingAuth.user.sub) {
                    this.currentUser.userId = this.pendingAuth.user.sub;
                }

                // If this is the initial authentication (no room selected yet)
                if (!this.currentRoom) {
                    // Store auth data and show room selection
                    this.storedAuthToken = this.pendingAuth?.token;
                    this.storedCustomUsername = this.pendingAuth?.customUsername;
                    this.pendingAuth = null;
                    this.showLoginStatus(data.message, 'success');

                    setTimeout(() => {
                        this.showRoomModal();
                    }, 1000);
                } else {
                    // Room already selected, show game interface
                    this.pendingAuth = null;
                    this.showLoginStatus(data.message, 'success');
                    setTimeout(() => {
                        this.showGameInterface();
                        this.updateColorPickerAccess();
                    }, 1000);
                }
            } else {
                this.showUsernameStatus(data.message, 'error');
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

        // Listen for username change responses
        this.socket.on('usernameChanged', (data) => {
            if (data.success) {
                this.currentUser.username = data.newUsername;

                // Save the updated username to localStorage
                if (this.currentUser && this.currentUser.userId) {
                    this.saveUsername(this.currentUser.userId, data.newUsername);
                }

                this.showUsernameChangeStatus('Username updated successfully!', 'success');
                // Clear the input
                this.newUsernameInput.value = '';
                // Close settings after a short delay
                setTimeout(() => {
                    this.hideSettings();
                }, 1500);
            } else {
                this.showUsernameChangeStatus(data.message, 'error');
            }
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

        // Highscore listeners
        this.socket.on('highscoresUpdate', (data) => {
            this.updateHighscoresDisplay(data.topPlayers);
        });

        this.socket.on('playerStatsUpdate', (data) => {
            this.updatePlayerStatsDisplay(data.stats);
        });

        // Room management listeners
        this.socket.on('roomJoined', (data) => {
            if (data.success) {
                this.currentRoom = data.roomCode;
                this.roomCode = data.roomCode;
                this.updateRoomDisplay(data.roomCode);
                this.showRoomStatus(`Joined room ${data.roomCode}`, 'success');

                // Now login to the game with the stored authentication
                if (this.currentUser && this.storedAuthToken) {
                    setTimeout(() => {
                        this.socket.emit('login', {
                            token: this.storedAuthToken,
                            customUsername: this.storedCustomUsername
                        });
                    }, 500);
                }
            } else {
                this.showRoomStatus(data.message, 'error');
            }
        });

        // My Games listeners
        this.socket.on('myGamesUpdate', (data) => {
            this.updateMyGamesDisplay(data.games);
        });

        this.socket.on('deleteGameResponse', (data) => {
            if (data.success) {
                this.showGameMessage(data.message, 'success');
                // Reload games list
                if (this.currentUser && this.currentUser.userId) {
                    this.loadMyGames();
                }
            } else {
                this.showGameMessage(data.message, 'error');
            }
        });

        this.socket.on('gameDeleted', (data) => {
            this.showGameMessage(data.message, 'info');
            // If user is in this game, redirect to room selection
            setTimeout(() => {
                this.resetToLoginScreen();
                this.showRoomModal();
            }, 2000);
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

        // Highscores modal
        this.highscoresBtn.addEventListener('click', () => this.showHighscores());
        this.closeHighscoresBtn.addEventListener('click', () => this.hideHighscores());

        // Close highscores modal when clicking outside
        this.highscoresModal.addEventListener('click', (e) => {
            if (e.target === this.highscoresModal) {
                this.hideHighscores();
            }
        });

        // Auth0 login
        this.auth0LoginBtn.addEventListener('click', () => this.handleAuth0LoginClick());

        // Registration
        this.registerBtn.addEventListener('click', () => this.showRegistrationModal());
        this.auth0RegisterBtn.addEventListener('click', () => this.handleAuth0RegisterClick());
        this.localRegistrationForm.addEventListener('submit', (e) => this.handleLocalRegistration(e));
        this.backToLoginBtn.addEventListener('click', () => this.showLoginModal());

        // Username setup
        this.usernameForm.addEventListener('submit', (e) => this.handleUsernameSubmit(e));
        this.backToAuthBtn.addEventListener('click', () => this.showLoginModal());

        // Room selection
        this.joinRoomForm.addEventListener('submit', (e) => this.handleJoinRoom(e));
        this.createRoomBtn.addEventListener('click', () => this.handleCreateRoom());
        this.quickPlayBtn.addEventListener('click', () => this.handleQuickPlay());

        // Room code input formatting
        this.roomCodeInput.addEventListener('input', (e) => {
            e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
        });

        // Share room code
        this.shareRoomBtn.addEventListener('click', () => this.shareRoomCode());

        // Username change in settings
        this.usernameChangeForm.addEventListener('submit', (e) => this.handleUsernameChange(e));

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
            this.showLoginStatus('Auth0 is still initializing. Please wait a moment and try again.', 'error');
            // Retry initialization
            console.log('Retrying Auth0 initialization...');
            await this.initializeAuth0();
            return;
        }

        try {
            this.showLoginStatus('Redirecting to login...', 'info');
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
            this.showRegistrationStatus('Auth0 is still initializing. Please wait a moment and try again.', 'error');
            // Retry initialization
            console.log('Retrying Auth0 initialization...');
            await this.initializeAuth0();
            return;
        }

        try {
            this.showRegistrationStatus('Redirecting to registration...', 'info');
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

                // Check for saved username in localStorage
                const savedUsername = this.getSavedUsername(user.sub);

                if (savedUsername) {
                    // Store user info for later use
                    this.pendingAuth = {
                        user: user,
                        token: token,
                        authType: 'auth0'
                    };

                    // Use saved username and login directly
                    this.socket.emit('login', {
                        token: token,
                        customUsername: savedUsername
                    });
                } else {
                    // Store Auth0 user info temporarily and show username modal
                    this.pendingAuth = {
                        user: user,
                        token: token,
                        authType: 'auth0'
                    };
                    this.showUsernameModal();
                }
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

    showUsernameModal() {
        this.loginModal.style.display = 'none';
        this.registrationModal.style.display = 'none';
        this.usernameModal.style.display = 'block';

        // Pre-populate with suggested username from Auth0
        if (this.pendingAuth && this.pendingAuth.user) {
            const suggestedUsername = this.pendingAuth.user.nickname ||
                                    this.pendingAuth.user.name ||
                                    this.pendingAuth.user.email?.split('@')[0] ||
                                    'Player';
            this.displayUsernameInput.value = suggestedUsername;
        }

        this.showUsernameStatus('', '');
        this.displayUsernameInput.focus();
    }

    showUsernameStatus(message, type) {
        this.usernameStatus.textContent = message;
        this.usernameStatus.className = `login-status ${type}`;
    }

    async handleUsernameSubmit(e) {
        e.preventDefault();

        const displayUsername = this.displayUsernameInput.value.trim();

        if (!this.validateUsername(displayUsername)) {
            return;
        }

        if (this.pendingAuth) {
            // Save the username for future logins
            this.saveUsername(this.pendingAuth.user.sub, displayUsername);

            // Complete the login with the custom username
            this.socket.emit('login', {
                token: this.pendingAuth.token,
                customUsername: displayUsername
            });
        }
    }

    validateUsername(username) {
        if (!username) {
            this.showUsernameStatus('Please enter a display name.', 'error');
            return false;
        }

        if (username.length < 2) {
            this.showUsernameStatus('Display name must be at least 2 characters.', 'error');
            return false;
        }

        if (username.length > 20) {
            this.showUsernameStatus('Display name must be 20 characters or less.', 'error');
            return false;
        }

        if (!/^[a-zA-Z0-9\s_-]+$/.test(username)) {
            this.showUsernameStatus('Display name can only contain letters, numbers, spaces, hyphens, and underscores.', 'error');
            return false;
        }

        return true;
    }

    handleUsernameChange(e) {
        e.preventDefault();

        const newUsername = this.newUsernameInput.value.trim();

        if (!this.validateUsernameForChange(newUsername)) {
            return;
        }

        // Check if it's the same as current username
        if (this.currentUser && newUsername === this.currentUser.username) {
            this.showUsernameChangeStatus('This is already your current username.', 'error');
            return;
        }

        // Send username change request to server
        this.socket.emit('changeUsername', { newUsername: newUsername });
        this.showUsernameChangeStatus('Updating username...', 'info');
    }

    validateUsernameForChange(username) {
        if (!username) {
            this.showUsernameChangeStatus('Please enter a new display name.', 'error');
            return false;
        }

        if (username.length < 2) {
            this.showUsernameChangeStatus('Display name must be at least 2 characters.', 'error');
            return false;
        }

        if (username.length > 20) {
            this.showUsernameChangeStatus('Display name must be 20 characters or less.', 'error');
            return false;
        }

        if (!/^[a-zA-Z0-9\s_-]+$/.test(username)) {
            this.showUsernameChangeStatus('Display name can only contain letters, numbers, spaces, hyphens, and underscores.', 'error');
            return false;
        }

        return true;
    }

    showUsernameChangeStatus(message, type) {
        this.usernameChangeStatus.textContent = message;
        this.usernameChangeStatus.className = `login-status ${type}`;
    }

    // Username persistence methods
    getSavedUsername(userId) {
        if (!userId) return null;
        return localStorage.getItem(`ticTacToe_username_${userId}`);
    }

    saveUsername(userId, username) {
        if (!userId || !username) return;
        localStorage.setItem(`ticTacToe_username_${userId}`, username);
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

        // Update player symbols with current piece colors
        this.updatePlayerSymbolColors();
    }

    updatePlayerSymbolColors() {
        if (this.xColorPicker && this.oColorPicker) {
            const xColor = this.xColorPicker.value;
            const oColor = this.oColorPicker.value;

            // Update X symbol color
            const xSymbol = document.querySelector('.player-symbol.x-symbol');
            if (xSymbol) {
                xSymbol.style.color = xColor;
            }

            // Update O symbol color
            const oSymbol = document.querySelector('.player-symbol.o-symbol');
            if (oSymbol) {
                oSymbol.style.color = oColor;
            }
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
        this.registrationModal.style.display = 'none';
        this.usernameModal.style.display = 'none';
        this.roomModal.style.display = 'none';
        this.gameContainer.style.display = 'block';
    }

    resetToLoginScreen() {
        this.loginModal.style.display = 'block';
        this.gameContainer.style.display = 'none';
        this.registrationModal.style.display = 'none';
        this.usernameModal.style.display = 'none';
        this.roomModal.style.display = 'none';
        this.settingsModal.style.display = 'none';
        this.showLoginStatus('', '');
        this.showRoomStatus('', '');
    }

    // Settings modal methods
    showSettings() {
        this.settingsModal.style.display = 'block';
        // Update color picker access when opening settings
        this.updateColorPickerAccess();
        // Pre-populate current username
        if (this.currentUser) {
            this.newUsernameInput.placeholder = `Current: ${this.currentUser.username}`;
        }
        // Clear any previous status
        this.showUsernameChangeStatus('', '');
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

        // Update current player color and player symbols
        this.updateCurrentPlayerColor();
        this.updatePlayerSymbolColors();
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

    // Room management methods
    handleJoinRoom(e) {
        e.preventDefault();
        const roomCode = this.roomCodeInput.value.trim();

        if (roomCode.length !== 6) {
            this.showRoomStatus('Please enter a 6-character room code', 'error');
            return;
        }

        this.socket.emit('joinRoom', { roomCode: roomCode });
        this.showRoomStatus('Joining room...', 'info');
    }

    async handleCreateRoom() {
        this.showRoomStatus('Creating new room...', 'info');

        try {
            const response = await fetch('/api/rooms/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();

            if (data.success) {
                this.socket.emit('joinRoom', { roomCode: data.roomCode });
                this.showRoomStatus(`Created room ${data.roomCode}...`, 'info');
            } else {
                this.showRoomStatus('Failed to create room', 'error');
            }
        } catch (error) {
            console.error('Error creating room:', error);
            this.showRoomStatus('Failed to create room', 'error');
        }
    }

    handleQuickPlay() {
        this.socket.emit('joinRoom', { roomCode: null }); // null means default room
        this.showRoomStatus('Joining quick play...', 'info');
    }

    showRoomModal() {
        this.roomModal.style.display = 'block';
        this.loginModal.style.display = 'none';
        this.usernameModal.style.display = 'none';
        this.registrationModal.style.display = 'none';

        // Load user's active games if logged in
        if (this.currentUser && this.currentUser.userId) {
            this.loadMyGames();
        }
    }

    showRoomStatus(message, type) {
        this.roomStatus.textContent = message;
        this.roomStatus.className = `login-status ${type}`;
    }

    updateRoomDisplay(roomCode) {
        if (roomCode === 'default') {
            this.roomInfo.style.display = 'none';
        } else {
            this.roomCodeDisplay.textContent = roomCode;
            this.roomInfo.style.display = 'flex';
        }
    }

    shareRoomCode() {
        if (!this.roomCode || this.roomCode === 'default') {
            return;
        }

        const shareText = `Join my Tic Tac Toe game! Room code: ${this.roomCode}`;

        if (navigator.share) {
            navigator.share({
                title: 'Tic Tac Toe Game Invitation',
                text: shareText,
                url: window.location.origin
            }).catch(console.error);
        } else if (navigator.clipboard) {
            navigator.clipboard.writeText(shareText).then(() => {
                // Show temporary feedback
                const originalText = this.shareRoomBtn.textContent;
                this.shareRoomBtn.textContent = '✓';
                setTimeout(() => {
                    this.shareRoomBtn.textContent = originalText;
                }, 1000);
            }).catch(() => {
                // Fallback: show room code in alert
                alert(`Room Code: ${this.roomCode}\n\nShare this code with your friend to play together!`);
            });
        } else {
            // Fallback: show room code in alert
            alert(`Room Code: ${this.roomCode}\n\nShare this code with your friend to play together!`);
        }
    }

    // Highscore methods
    showHighscores() {
        this.highscoresModal.style.display = 'block';
        this.loadHighscores();
    }

    hideHighscores() {
        this.highscoresModal.style.display = 'none';
    }

    loadHighscores() {
        // Show loading indicators
        this.highscoresLoading.style.display = 'flex';
        this.statsLoading.style.display = 'flex';
        this.topPlayersList.style.display = 'none';
        this.playerStatsDisplay.style.display = 'none';

        // Request highscores from server
        this.socket.emit('getHighscores');

        // Request player stats if user is logged in
        if (this.currentUser && this.currentUser.userId) {
            this.socket.emit('getPlayerStats', { userId: this.currentUser.userId });
        }
    }

    updateHighscoresDisplay(topPlayers) {
        this.highscoresLoading.style.display = 'none';
        this.topPlayersList.style.display = 'block';

        if (!topPlayers || topPlayers.length === 0) {
            this.topPlayersList.innerHTML = '<p class="no-data">No games played yet. Be the first!</p>';
            return;
        }

        const html = topPlayers.map((player, index) => {
            const rank = index + 1;
            const trophy = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `${rank}.`;

            return `
                <div class="highscore-item ${rank <= 3 ? 'top-three' : ''}">
                    <div class="rank">${trophy}</div>
                    <div class="player-info">
                        <div class="player-name">${this.escapeHtml(player.username)}</div>
                        <div class="player-stats">
                            <span class="wins">${player.wins} wins</span>
                            <span class="total-games">${player.totalGames} games</span>
                            <span class="win-rate">${player.winRate}% win rate</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        this.topPlayersList.innerHTML = html;
    }

    updatePlayerStatsDisplay(stats) {
        this.statsLoading.style.display = 'none';
        this.playerStatsDisplay.style.display = 'block';

        if (!stats) {
            this.playerStatsDisplay.innerHTML = '<p class="no-data">No stats available</p>';
            return;
        }

        const html = `
            <div class="stats-grid">
                <div class="stat-item">
                    <div class="stat-value">${stats.wins}</div>
                    <div class="stat-label">Wins</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${stats.losses}</div>
                    <div class="stat-label">Losses</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${stats.draws}</div>
                    <div class="stat-label">Draws</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value">${stats.totalGames}</div>
                    <div class="stat-label">Total Games</div>
                </div>
                <div class="stat-item featured">
                    <div class="stat-value">${stats.winRate}%</div>
                    <div class="stat-label">Win Rate</div>
                </div>
            </div>
        `;

        this.playerStatsDisplay.innerHTML = html;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // My Games methods
    loadMyGames() {
        if (!this.currentUser || !this.currentUser.userId) {
            return;
        }

        this.myGamesLoading.style.display = 'flex';
        this.myGamesList.style.display = 'none';

        this.socket.emit('getMyGames', { userId: this.currentUser.userId });
    }

    updateMyGamesDisplay(games) {
        this.myGamesLoading.style.display = 'none';

        if (!games || games.length === 0) {
            this.myGamesSection.style.display = 'none';
            return;
        }

        this.myGamesSection.style.display = 'block';
        this.myGamesList.style.display = 'block';

        const html = games.map(game => {
            // Find opponent
            const opponent = game.players.find(p => p.userId !== this.currentUser.userId);
            const opponentName = opponent ? opponent.username : 'Waiting...';
            const myPlayer = game.players.find(p => p.userId === this.currentUser.userId);

            // Determine turn status
            let turnStatus = '';
            if (game.gameActive) {
                if (myPlayer && game.currentPlayer === myPlayer.symbol) {
                    turnStatus = '<span class="your-turn">Your turn</span>';
                } else {
                    turnStatus = '<span class="their-turn">Their turn</span>';
                }
            } else {
                turnStatus = '<span class="game-ended">Game ended</span>';
            }

            // Format last activity
            const lastActivity = new Date(game.lastActivity);
            const timeAgo = this.getTimeAgo(lastActivity);

            return `
                <div class="my-game-item" data-room-code="${game.roomCode}">
                    <div class="game-info">
                        <div class="game-header">
                            <span class="room-code-badge">🎮 ${game.roomCode}</span>
                            ${turnStatus}
                        </div>
                        <div class="game-details">
                            <span class="opponent-name">vs. ${this.escapeHtml(opponentName)}</span>
                            <span class="game-phase">${game.gamePhase === 'placement' ? 'Placement Phase' : 'Movement Phase'}</span>
                        </div>
                        <div class="game-meta">
                            <span class="last-activity">Last active: ${timeAgo}</span>
                            <span class="game-score">${game.scores.X}-${game.scores.O}-${game.scores.draw}</span>
                        </div>
                    </div>
                    <div class="game-actions">
                        <button class="rejoin-btn auth-button primary" onclick="window.game.rejoinGame('${game.roomCode}')">
                            Resume Game
                        </button>
                        <button class="delete-btn auth-button secondary" onclick="window.game.deleteGame('${game.roomCode}')" title="Delete this game">
                            🗑️
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        this.myGamesList.innerHTML = html;
    }

    getTimeAgo(date) {
        const seconds = Math.floor((new Date() - date) / 1000);

        if (seconds < 60) return 'Just now';
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
        return `${Math.floor(seconds / 86400)}d ago`;
    }

    rejoinGame(roomCode) {
        this.socket.emit('joinRoom', { roomCode: roomCode });
        this.showRoomStatus(`Rejoining game ${roomCode}...`, 'info');
    }

    deleteGame(roomCode) {
        if (!this.currentUser || !this.currentUser.userId) {
            this.showGameMessage('You must be logged in to delete a game', 'error');
            return;
        }

        // Confirm deletion
        const confirmed = confirm(`Are you sure you want to delete game ${roomCode}?\n\nThis will remove the game for all players and cannot be undone.`);

        if (confirmed) {
            this.socket.emit('deleteGame', {
                roomCode: roomCode,
                userId: this.currentUser.userId
            });
        }
    }
}

// Initialize the game when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.game = new TicTacToeMultiplayer();
});