const jwt = require('jsonwebtoken');
const { io: ioClient } = require('socket.io-client');

require('./setup');

// Mock dependencies before requiring server
jest.mock('../database', () => ({
    connectToDatabase: jest.fn().mockResolvedValue(true),
    getDatabase: jest.fn(() => ({
        collection: jest.fn(() => ({
            findOne: jest.fn().mockResolvedValue(null),
            find: jest.fn().mockReturnValue({
                sort: jest.fn().mockReturnValue({
                    toArray: jest.fn().mockResolvedValue([]),
                    limit: jest.fn().mockReturnValue({
                        toArray: jest.fn().mockResolvedValue([])
                    })
                })
            }),
            updateOne: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
            deleteOne: jest.fn().mockResolvedValue({ deletedCount: 1 }),
            deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
            insertOne: jest.fn().mockResolvedValue({ insertedId: 'test' }),
            createIndex: jest.fn().mockResolvedValue(true)
        }))
    }))
}));

jest.mock('../highscore', () => ({
    deletePlayer: jest.fn().mockResolvedValue({ deletedCount: 1 }),
    updatePlayerScore: jest.fn().mockResolvedValue({}),
    getTopPlayers: jest.fn().mockResolvedValue([]),
    getPlayerStats: jest.fn().mockResolvedValue({})
}));

jest.mock('../gameState', () => ({
    ensureIndexes: jest.fn().mockResolvedValue(true),
    saveGame: jest.fn().mockResolvedValue(true),
    loadGame: jest.fn().mockResolvedValue(null),
    deleteGame: jest.fn().mockResolvedValue(true),
    getAllUserGames: jest.fn().mockResolvedValue([]),
    getUserGames: jest.fn().mockResolvedValue([]),
    updatePlayerStatus: jest.fn().mockResolvedValue(true),
    markGameCompleted: jest.fn().mockResolvedValue(true),
    cleanupOldGames: jest.fn().mockResolvedValue(0)
}));

jest.mock('apple-signin-auth', () => ({
    verifyIdToken: jest.fn()
}));

jest.mock('@sentry/node', () => ({
    init: jest.fn(),
    Handlers: null,
    captureException: jest.fn(),
    addBreadcrumb: jest.fn(),
    setUser: jest.fn(),
    profilingIntegration: null
}));

const gameStateService = require('../gameState');
const highscoreService = require('../highscore');

// Now require server (won't auto-listen because require.main !== module)
const { server, io, rooms } = require('../server');

const TEST_PORT = 4567;
const SERVER_URL = `http://localhost:${TEST_PORT}`;

// Helper to create Auth0 test tokens
function createToken(userId, overrides = {}) {
    const payload = {
        sub: userId,
        email: `${userId}@test.com`,
        nickname: userId.replace('auth0|', ''),
        iss: 'https://test-domain.auth0.com/',
        aud: 'test-audience',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
        ...overrides
    };
    return jwt.sign(payload, 'test-secret');
}

// Helper to create a connected client
function createClient() {
    return ioClient(SERVER_URL, {
        transports: ['websocket'],
        forceNew: true,
        autoConnect: true
    });
}

// Helper to wait for a socket event with timeout
function waitForEvent(socket, event, timeout = 5000) {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error(`Timeout waiting for "${event}"`)), timeout);
        socket.once(event, (data) => {
            clearTimeout(timer);
            resolve(data);
        });
    });
}

// Helper to drain all pending events of a type so stale events don't interfere
function drainEvents(socket, event) {
    socket.removeAllListeners(event);
}

describe('Socket.IO Events', () => {
    let httpServer;

    beforeAll((done) => {
        httpServer = server.listen(TEST_PORT, done);
    });

    afterAll((done) => {
        // Disconnect all sockets and close server
        io.close();
        httpServer.close(done);
    });

    beforeEach(() => {
        jest.clearAllMocks();
        // Clear all rooms between tests
        rooms.clear();
        // Reset mocks
        gameStateService.saveGame.mockResolvedValue(true);
        gameStateService.loadGame.mockResolvedValue(null);
        gameStateService.deleteGame.mockResolvedValue(true);
        gameStateService.getAllUserGames.mockResolvedValue([]);
        gameStateService.updatePlayerStatus.mockResolvedValue(true);
        gameStateService.markGameCompleted.mockResolvedValue(true);
        highscoreService.updatePlayerScore.mockResolvedValue({});
    });

    describe('joinRoom', () => {
        test('joins a room and receives roomJoined event', async () => {
            const client = createClient();
            try {
                await waitForEvent(client, 'connect');

                client.emit('joinRoom', { roomCode: 'TESTROOM' });
                const response = await waitForEvent(client, 'roomJoined');

                expect(response.success).toBe(true);
                expect(response.roomCode).toBe('TESTROOM');
            } finally {
                client.disconnect();
            }
        });

        test('normalizes room code to uppercase', async () => {
            const client = createClient();
            try {
                await waitForEvent(client, 'connect');

                client.emit('joinRoom', { roomCode: 'lowercase' });
                const response = await waitForEvent(client, 'roomJoined');

                expect(response.roomCode).toBe('LOWERCASE');
            } finally {
                client.disconnect();
            }
        });

        test('assigns to public room when no room code provided (Quick Play)', async () => {
            const client = createClient();
            try {
                await waitForEvent(client, 'connect');

                client.emit('joinRoom', {});
                const response = await waitForEvent(client, 'roomJoined');

                expect(response.success).toBe(true);
                expect(response.roomCode).toMatch(/^PUBLIC-/);
            } finally {
                client.disconnect();
            }
        });

        test('creates room in memory when joining', async () => {
            const client = createClient();
            try {
                await waitForEvent(client, 'connect');

                client.emit('joinRoom', { roomCode: 'NEWROOM' });
                await waitForEvent(client, 'roomJoined');

                expect(rooms.has('NEWROOM')).toBe(true);
                expect(rooms.get('NEWROOM').board).toHaveLength(9);
            } finally {
                client.disconnect();
            }
        });
    });

    describe('login', () => {
        test('succeeds with valid Auth0 token (no room joined yet)', async () => {
            const client = createClient();
            try {
                await waitForEvent(client, 'connect');

                const token = createToken('auth0|player1');
                client.emit('login', { token });
                const response = await waitForEvent(client, 'loginResponse');

                expect(response.success).toBe(true);
                expect(response.needsRoom).toBe(true);
                expect(response.username).toBe('player1');
            } finally {
                client.disconnect();
            }
        });

        test('fails without token', async () => {
            const client = createClient();
            try {
                await waitForEvent(client, 'connect');

                client.emit('login', {});
                const response = await waitForEvent(client, 'loginResponse');

                expect(response.success).toBe(false);
                expect(response.message).toContain('authentication token');
            } finally {
                client.disconnect();
            }
        });

        test('fails with invalid token', async () => {
            const client = createClient();
            try {
                await waitForEvent(client, 'connect');

                client.emit('login', { token: 'garbage-token' });
                const response = await waitForEvent(client, 'loginResponse');

                expect(response.success).toBe(false);
                expect(response.message).toContain('Invalid');
            } finally {
                client.disconnect();
            }
        });

        test('assigns player X to first player in room', async () => {
            const client = createClient();
            try {
                await waitForEvent(client, 'connect');

                // Join room first, then login
                client.emit('joinRoom', { roomCode: 'ROOM1' });
                await waitForEvent(client, 'roomJoined');

                const token = createToken('auth0|alice');
                client.emit('login', { token });
                const response = await waitForEvent(client, 'loginResponse');

                expect(response.success).toBe(true);
                expect(response.player.symbol).toBe('X');
                expect(response.player.username).toBe('alice');
            } finally {
                client.disconnect();
            }
        });

        test('assigns player O to second player in room', async () => {
            const client1 = createClient();
            await waitForEvent(client1, 'connect');
            client1.emit('joinRoom', { roomCode: 'ROOM2' });
            await waitForEvent(client1, 'roomJoined');
            client1.emit('login', { token: createToken('auth0|alice') });
            await waitForEvent(client1, 'loginResponse');

            const client2 = createClient();
            await waitForEvent(client2, 'connect');
            client2.emit('joinRoom', { roomCode: 'ROOM2' });
            await waitForEvent(client2, 'roomJoined');
            client2.emit('login', { token: createToken('auth0|bob') });
            const response = await waitForEvent(client2, 'loginResponse');

            try {
                expect(response.success).toBe(true);
                expect(response.player.symbol).toBe('O');
                expect(response.player.username).toBe('bob');
            } finally {
                client1.disconnect();
                client2.disconnect();
            }
        });

        test('rejects third player when room is full', async () => {
            const client1 = createClient();
            try {
                await waitForEvent(client1, 'connect');
                client1.emit('joinRoom', { roomCode: 'FULLROOM' });
                await waitForEvent(client1, 'roomJoined');
                client1.emit('login', { token: createToken('auth0|p1') });
                await waitForEvent(client1, 'loginResponse');

                const client2 = createClient();
                await waitForEvent(client2, 'connect');
                client2.emit('joinRoom', { roomCode: 'FULLROOM' });
                await waitForEvent(client2, 'roomJoined');
                client2.emit('login', { token: createToken('auth0|p2') });
                await waitForEvent(client2, 'loginResponse');

                const client3 = createClient();
                await waitForEvent(client3, 'connect');
                // Third player tries to join
                client3.emit('joinRoom', { roomCode: 'FULLROOM' });
                await waitForEvent(client3, 'roomJoined');
                client3.emit('login', { token: createToken('auth0|p3') });
                const response = await waitForEvent(client3, 'loginResponse');

                expect(response.success).toBe(false);
                expect(response.message).toContain('full');

                client2.disconnect();
                client3.disconnect();
            } finally {
                client1.disconnect();
            }
        });

        test('truncates long email-based usernames to 12 characters', async () => {
            const client = createClient();
            try {
                await waitForEvent(client, 'connect');

                const token = createToken('auth0|user1', {
                    nickname: undefined,
                    name: undefined,
                    preferred_username: undefined,
                    email: 'verylongemailname@example.com'
                });
                // Remove nickname from token by creating without it
                const payload = {
                    sub: 'auth0|user1',
                    email: 'verylongemailname@example.com',
                    iss: 'https://test-domain.auth0.com/',
                    aud: 'test-audience',
                    iat: Math.floor(Date.now() / 1000),
                    exp: Math.floor(Date.now() / 1000) + 3600
                };
                const bareToken = jwt.sign(payload, 'test-secret');

                client.emit('login', { token: bareToken });
                const response = await waitForEvent(client, 'loginResponse');

                expect(response.success).toBe(true);
                expect(response.username.length).toBeLessThanOrEqual(12);
                expect(response.username).toBe('verylongemai');
            } finally {
                client.disconnect();
            }
        });

        test('uses customUsername when provided', async () => {
            const client = createClient();
            try {
                await waitForEvent(client, 'connect');

                const token = createToken('auth0|user1');
                client.emit('login', { token, customUsername: 'MyName' });
                const response = await waitForEvent(client, 'loginResponse');

                expect(response.success).toBe(true);
                expect(response.username).toBe('MyName');
            } finally {
                client.disconnect();
            }
        });

        test('saves game state after player joins room', async () => {
            const client = createClient();
            try {
                await waitForEvent(client, 'connect');

                client.emit('joinRoom', { roomCode: 'SAVEROOM' });
                await waitForEvent(client, 'roomJoined');

                client.emit('login', { token: createToken('auth0|saver') });
                await waitForEvent(client, 'loginResponse');

                // Wait a bit for async save to complete
                await new Promise(r => setTimeout(r, 100));
                expect(gameStateService.saveGame).toHaveBeenCalled();
            } finally {
                client.disconnect();
            }
        });
    });

    describe('makeMove', () => {
        // Helper to set up a game with two logged-in players
        async function setupGame(roomCode = 'GAME') {
            const player1 = createClient();
            await waitForEvent(player1, 'connect');

            player1.emit('joinRoom', { roomCode });
            await waitForEvent(player1, 'roomJoined');
            player1.emit('login', { token: createToken('auth0|playerX') });
            await waitForEvent(player1, 'loginResponse');

            const player2 = createClient();
            await waitForEvent(player2, 'connect');

            player2.emit('joinRoom', { roomCode });
            await waitForEvent(player2, 'roomJoined');
            player2.emit('login', { token: createToken('auth0|playerO') });
            await waitForEvent(player2, 'loginResponse');

            // Wait for all gameStateUpdate events from join/login to settle
            await new Promise(r => setTimeout(r, 200));

            // Drain stale gameStateUpdate events so tests get fresh ones
            drainEvents(player1, 'gameStateUpdate');
            drainEvents(player2, 'gameStateUpdate');
            drainEvents(player1, 'gameOver');
            drainEvents(player2, 'gameOver');

            return { player1, player2 };
        }

        test('player X can make the first move', async () => {
            const { player1, player2 } = await setupGame('MOVE1');
            try {
                player1.emit('makeMove', { cellIndex: 4 });
                const update = await waitForEvent(player1, 'gameStateUpdate');

                expect(update.board[4]).toBe('X');
                expect(update.currentPlayer).toBe('O');
            } finally {
                player1.disconnect();
                player2.disconnect();
            }
        });

        test('player O cannot move first (not their turn)', async () => {
            const { player1, player2 } = await setupGame('MOVE2');
            try {
                player2.emit('makeMove', { cellIndex: 0 });
                const error = await waitForEvent(player2, 'error');

                expect(error.message).toContain('not your turn');
            } finally {
                player1.disconnect();
                player2.disconnect();
            }
        });

        test('rejects move on occupied cell', async () => {
            const { player1, player2 } = await setupGame('MOVE3');
            try {
                // X places at cell 4
                player1.emit('makeMove', { cellIndex: 4 });
                await waitForEvent(player1, 'gameStateUpdate');

                // O places at cell 4 (occupied)
                player2.emit('makeMove', { cellIndex: 4 });
                const error = await waitForEvent(player2, 'error');

                expect(error.message).toContain('occupied');
            } finally {
                player1.disconnect();
                player2.disconnect();
            }
        });

        test('alternates turns between X and O', async () => {
            const { player1, player2 } = await setupGame('MOVE4');
            try {
                // X moves at cell 0 — consume event from BOTH players
                player1.emit('makeMove', { cellIndex: 0 });
                const [u1a, u1b] = await Promise.all([
                    waitForEvent(player1, 'gameStateUpdate'),
                    waitForEvent(player2, 'gameStateUpdate')
                ]);
                expect(u1a.board[0]).toBe('X');
                expect(u1a.currentPlayer).toBe('O');

                // O moves at cell 3 — consume from both
                player2.emit('makeMove', { cellIndex: 3 });
                const [u2a, u2b] = await Promise.all([
                    waitForEvent(player1, 'gameStateUpdate'),
                    waitForEvent(player2, 'gameStateUpdate')
                ]);
                expect(u2a.board[3]).toBe('O');
                expect(u2a.currentPlayer).toBe('X');

                // X moves at cell 4 — consume from both
                player1.emit('makeMove', { cellIndex: 4 });
                const [u3a, u3b] = await Promise.all([
                    waitForEvent(player1, 'gameStateUpdate'),
                    waitForEvent(player2, 'gameStateUpdate')
                ]);
                expect(u3a.board[4]).toBe('X');
                expect(u3a.currentPlayer).toBe('O');
            } finally {
                player1.disconnect();
                player2.disconnect();
            }
        });

        test('detects win and emits gameOver', async () => {
            const { player1, player2 } = await setupGame('WIN1');
            try {
                // X: 0, O: 3, X: 1, O: 4, X: 2 (top row win)
                player1.emit('makeMove', { cellIndex: 0 }); // X
                await waitForEvent(player2, 'gameStateUpdate');

                player2.emit('makeMove', { cellIndex: 3 }); // O
                await waitForEvent(player1, 'gameStateUpdate');

                player1.emit('makeMove', { cellIndex: 1 }); // X
                await waitForEvent(player2, 'gameStateUpdate');

                player2.emit('makeMove', { cellIndex: 4 }); // O
                await waitForEvent(player1, 'gameStateUpdate');

                // Set up gameOver listener BEFORE the winning move
                const gameOverPromise = waitForEvent(player2, 'gameOver');
                player1.emit('makeMove', { cellIndex: 2 }); // X wins
                const gameOver = await gameOverPromise;

                expect(gameOver.winner).toBe('X');
                expect(gameOver.winnerName).toBe('playerX');
                expect(gameOver.pattern).toEqual([0, 1, 2]);
            } finally {
                player1.disconnect();
                player2.disconnect();
            }
        });

        test('updates highscores after a win', async () => {
            const { player1, player2 } = await setupGame('WIN2');
            try {
                // Play a quick win: X: 0, O: 3, X: 1, O: 4, X: 2
                player1.emit('makeMove', { cellIndex: 0 });
                await waitForEvent(player2, 'gameStateUpdate');
                player2.emit('makeMove', { cellIndex: 3 });
                await waitForEvent(player1, 'gameStateUpdate');
                player1.emit('makeMove', { cellIndex: 1 });
                await waitForEvent(player2, 'gameStateUpdate');
                player2.emit('makeMove', { cellIndex: 4 });
                await waitForEvent(player1, 'gameStateUpdate');

                const gameOverPromise = waitForEvent(player2, 'gameOver');
                player1.emit('makeMove', { cellIndex: 2 });
                await gameOverPromise;

                // Wait for async highscore update
                await new Promise(r => setTimeout(r, 200));
                expect(highscoreService.updatePlayerScore).toHaveBeenCalled();
            } finally {
                player1.disconnect();
                player2.disconnect();
            }
        });

        test('switches to movement phase after all pieces placed', async () => {
            const { player1, player2 } = await setupGame('PHASE1');
            try {
                // Place 3 pieces each without creating a win:
                // X:0, O:1, X:3, O:5, X:8, O:7
                // Board: X O _ / X _ O / _ O X (no three in a row)
                player1.emit('makeMove', { cellIndex: 0 }); // X
                await Promise.all([waitForEvent(player1, 'gameStateUpdate'), waitForEvent(player2, 'gameStateUpdate')]);
                player2.emit('makeMove', { cellIndex: 1 }); // O
                await Promise.all([waitForEvent(player1, 'gameStateUpdate'), waitForEvent(player2, 'gameStateUpdate')]);
                player1.emit('makeMove', { cellIndex: 3 }); // X
                await Promise.all([waitForEvent(player1, 'gameStateUpdate'), waitForEvent(player2, 'gameStateUpdate')]);
                player2.emit('makeMove', { cellIndex: 5 }); // O
                await Promise.all([waitForEvent(player1, 'gameStateUpdate'), waitForEvent(player2, 'gameStateUpdate')]);
                player1.emit('makeMove', { cellIndex: 8 }); // X (piece 3)
                await Promise.all([waitForEvent(player1, 'gameStateUpdate'), waitForEvent(player2, 'gameStateUpdate')]);

                // O places last piece - should trigger movement phase
                player2.emit('makeMove', { cellIndex: 7 }); // O (piece 3)
                const [update] = await Promise.all([
                    waitForEvent(player1, 'gameStateUpdate'),
                    waitForEvent(player2, 'gameStateUpdate')
                ]);

                expect(update.gamePhase).toBe('movement');
                expect(update.piecesPlaced.X).toBe(3);
                expect(update.piecesPlaced.O).toBe(3);
            } finally {
                player1.disconnect();
                player2.disconnect();
            }
        });

        test('saves game state after each move', async () => {
            const { player1, player2 } = await setupGame('SAVE1');
            try {
                gameStateService.saveGame.mockClear();

                player1.emit('makeMove', { cellIndex: 0 });
                await waitForEvent(player1, 'gameStateUpdate');

                await new Promise(r => setTimeout(r, 100));
                expect(gameStateService.saveGame).toHaveBeenCalled();
            } finally {
                player1.disconnect();
                player2.disconnect();
            }
        });

        test('rejects move from unauthenticated client', async () => {
            const client = createClient();
            try {
                await waitForEvent(client, 'connect');

                client.emit('makeMove', { cellIndex: 0 });
                const error = await waitForEvent(client, 'error');

                expect(error.message).toContain('logged in');
            } finally {
                client.disconnect();
            }
        });
    });

    describe('resetGame', () => {
        test('resets board and game state', async () => {
            const player1 = createClient();
            await waitForEvent(player1, 'connect');
            player1.emit('joinRoom', { roomCode: 'RESET1' });
            await waitForEvent(player1, 'roomJoined');
            player1.emit('login', { token: createToken('auth0|resetter1') });
            await waitForEvent(player1, 'loginResponse');

            const player2 = createClient();
            await waitForEvent(player2, 'connect');
            player2.emit('joinRoom', { roomCode: 'RESET1' });
            await waitForEvent(player2, 'roomJoined');
            player2.emit('login', { token: createToken('auth0|resetter2') });
            await waitForEvent(player2, 'loginResponse');

            // Wait for join events to settle, then drain
            await new Promise(r => setTimeout(r, 200));
            drainEvents(player1, 'gameStateUpdate');
            drainEvents(player2, 'gameStateUpdate');

            try {
                // Make a move — consume from both
                player1.emit('makeMove', { cellIndex: 4 });
                await Promise.all([
                    waitForEvent(player1, 'gameStateUpdate'),
                    waitForEvent(player2, 'gameStateUpdate')
                ]);

                // Reset the game — consume from both
                player1.emit('resetGame');
                const [update] = await Promise.all([
                    waitForEvent(player1, 'gameStateUpdate'),
                    waitForEvent(player2, 'gameStateUpdate')
                ]);

                expect(update.board).toEqual(['', '', '', '', '', '', '', '', '']);
                expect(update.currentPlayer).toBe('X');
                expect(update.gameActive).toBe(true);
                expect(update.gamePhase).toBe('placement');
            } finally {
                player1.disconnect();
                player2.disconnect();
            }
        });
    });

    describe('leaveRoom', () => {
        test('player can leave a room', async () => {
            const client = createClient();
            try {
                await waitForEvent(client, 'connect');

                client.emit('joinRoom', { roomCode: 'LEAVE1' });
                await waitForEvent(client, 'roomJoined');

                client.emit('login', { token: createToken('auth0|leaver') });
                await waitForEvent(client, 'loginResponse');

                client.emit('leaveRoom', { roomCode: 'LEAVE1' });

                // Give time for leave to process
                await new Promise(r => setTimeout(r, 200));

                // Room should be deleted since it's empty
                expect(rooms.has('LEAVE1')).toBe(false);
            } finally {
                client.disconnect();
            }
        });

        test('notifies remaining players when someone leaves', async () => {
            const player1 = createClient();
            await waitForEvent(player1, 'connect');
            player1.emit('joinRoom', { roomCode: 'LEAVE2' });
            await waitForEvent(player1, 'roomJoined');
            player1.emit('login', { token: createToken('auth0|stayer') });
            await waitForEvent(player1, 'loginResponse');

            const player2 = createClient();
            await waitForEvent(player2, 'connect');
            player2.emit('joinRoom', { roomCode: 'LEAVE2' });
            await waitForEvent(player2, 'roomJoined');
            player2.emit('login', { token: createToken('auth0|leaver2') });
            await waitForEvent(player2, 'loginResponse');
            await new Promise(r => setTimeout(r, 200));

            try {
                // Player 2 leaves
                player2.emit('leaveRoom', { roomCode: 'LEAVE2' });
                const notification = await waitForEvent(player1, 'playerDisconnected');

                expect(notification.username).toBe('leaver2');
            } finally {
                player1.disconnect();
                player2.disconnect();
            }
        });

        test('rejects leave without room code', async () => {
            const client = createClient();
            try {
                await waitForEvent(client, 'connect');

                client.emit('leaveRoom', {});
                const error = await waitForEvent(client, 'error');

                expect(error.message).toContain('Room code is required');
            } finally {
                client.disconnect();
            }
        });
    });

    describe('disconnect', () => {
        test('preserves game state when player disconnects', async () => {
            const player1 = createClient();
            await waitForEvent(player1, 'connect');
            player1.emit('joinRoom', { roomCode: 'DISC1' });
            await waitForEvent(player1, 'roomJoined');
            player1.emit('login', { token: createToken('auth0|disc1') });
            await waitForEvent(player1, 'loginResponse');

            const player2 = createClient();
            await waitForEvent(player2, 'connect');
            player2.emit('joinRoom', { roomCode: 'DISC1' });
            await waitForEvent(player2, 'roomJoined');
            player2.emit('login', { token: createToken('auth0|disc2') });
            await waitForEvent(player2, 'loginResponse');
            await new Promise(r => setTimeout(r, 200));

            try {
                // Player 1 disconnects
                player1.disconnect();

                // Player 2 should be notified
                const notification = await waitForEvent(player2, 'playerDisconnected');
                expect(notification.username).toBe('disc1');

                // Room should still exist with the game preserved
                const room = rooms.get('DISC1');
                expect(room).toBeDefined();
                expect(room.players).toHaveLength(2);
            } finally {
                player2.disconnect();
            }
        });

        test('marks disconnected player socketId as null', async () => {
            const player1 = createClient();
            await waitForEvent(player1, 'connect');
            player1.emit('joinRoom', { roomCode: 'DISC2' });
            await waitForEvent(player1, 'roomJoined');
            player1.emit('login', { token: createToken('auth0|disc3') });
            await waitForEvent(player1, 'loginResponse');

            const player2 = createClient();
            await waitForEvent(player2, 'connect');
            player2.emit('joinRoom', { roomCode: 'DISC2' });
            await waitForEvent(player2, 'roomJoined');
            player2.emit('login', { token: createToken('auth0|disc4') });
            await waitForEvent(player2, 'loginResponse');
            await new Promise(r => setTimeout(r, 200));

            try {
                player1.disconnect();
                await waitForEvent(player2, 'playerDisconnected');

                // Wait for async operations
                await new Promise(r => setTimeout(r, 200));

                const room = rooms.get('DISC2');
                const disconnectedPlayer = room.players.find(p => p.username === 'disc3');
                expect(disconnectedPlayer.socketId).toBeNull();
            } finally {
                player2.disconnect();
            }
        });
    });

    describe('changeUsername', () => {
        test('rejects username change without login', async () => {
            const client = createClient();
            try {
                await waitForEvent(client, 'connect');

                client.emit('changeUsername', { newUsername: 'NewName' });
                const response = await waitForEvent(client, 'usernameChanged');

                expect(response.success).toBe(false);
                expect(response.message).toContain('logged in');
            } finally {
                client.disconnect();
            }
        });

        test('rejects username shorter than 2 characters', async () => {
            const client = createClient();
            try {
                await waitForEvent(client, 'connect');

                client.emit('joinRoom', { roomCode: 'UNAME1' });
                await waitForEvent(client, 'roomJoined');
                client.emit('login', { token: createToken('auth0|namechanger') });
                await waitForEvent(client, 'loginResponse');

                client.emit('changeUsername', { newUsername: 'A' });
                const response = await waitForEvent(client, 'usernameChanged');

                expect(response.success).toBe(false);
                expect(response.message).toContain('between 2 and 20');
            } finally {
                client.disconnect();
            }
        });

        test('rejects username with special characters', async () => {
            const client = createClient();
            try {
                await waitForEvent(client, 'connect');

                client.emit('joinRoom', { roomCode: 'UNAME2' });
                await waitForEvent(client, 'roomJoined');
                client.emit('login', { token: createToken('auth0|namechanger2') });
                await waitForEvent(client, 'loginResponse');

                client.emit('changeUsername', { newUsername: 'user<script>' });
                const response = await waitForEvent(client, 'usernameChanged');

                expect(response.success).toBe(false);
                expect(response.message).toContain('letters, numbers');
            } finally {
                client.disconnect();
            }
        });
    });

    describe('changeColor', () => {
        test('rejects invalid hex color', async () => {
            const client = createClient();
            try {
                await waitForEvent(client, 'connect');

                client.emit('joinRoom', { roomCode: 'COLOR1' });
                await waitForEvent(client, 'roomJoined');
                client.emit('login', { token: createToken('auth0|colorist') });
                await waitForEvent(client, 'loginResponse');

                client.emit('changeColor', { piece: 'X', color: 'not-a-color' });
                const error = await waitForEvent(client, 'error');

                expect(error.message).toContain('Invalid color');
            } finally {
                client.disconnect();
            }
        });

        test('rejects changing opponent piece color', async () => {
            const client = createClient();
            try {
                await waitForEvent(client, 'connect');

                client.emit('joinRoom', { roomCode: 'COLOR2' });
                await waitForEvent(client, 'roomJoined');
                client.emit('login', { token: createToken('auth0|colorist2') });
                await waitForEvent(client, 'loginResponse');

                // Player is X, trying to change O's color
                client.emit('changeColor', { piece: 'O', color: '#FF0000' });
                const error = await waitForEvent(client, 'error');

                expect(error.message).toContain('own piece color');
            } finally {
                client.disconnect();
            }
        });
    });
});
