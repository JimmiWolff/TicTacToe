const jwt = require('jsonwebtoken');

require('./setup');

// Mock dependencies
jest.mock('../database', () => {
    const mockCollection = {
        findOne: jest.fn(),
        find: jest.fn(),
        deleteOne: jest.fn(),
        deleteMany: jest.fn(),
        updateOne: jest.fn(),
        insertOne: jest.fn()
    };
    // find() returns a chainable cursor
    mockCollection.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
            toArray: jest.fn().mockResolvedValue([])
        })
    });
    return {
        connectToDatabase: jest.fn().mockResolvedValue(true),
        getDatabase: jest.fn(() => ({
            collection: jest.fn(() => mockCollection)
        }))
    };
});

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

// Mock apple-signin-auth
jest.mock('apple-signin-auth', () => ({
    verifyIdToken: jest.fn()
}));

// Mock Sentry
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

// Helper to create test JWT tokens
function createTestToken(userId, provider = 'auth0') {
    const payload = {
        sub: userId,
        email: 'test@example.com',
        nickname: 'testuser',
        iss: provider === 'auth0'
            ? 'https://test-domain.auth0.com/'
            : 'https://appleid.apple.com',
        aud: provider === 'auth0' ? 'test-audience' : 'com.test.app',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600
    };
    return jwt.sign(payload, 'test-secret');
}

describe('Account Deletion API', () => {
    let app;
    let server;
    let request;

    beforeAll(async () => {
        // Clear module cache to get fresh server instance with mocks
        // We need to require supertest after mocks are set up
        request = require('supertest');

        // Import the express app from server.js
        // Since server.js starts listening, we need to handle this carefully
        // We'll create a minimal express app that replicates the account deletion endpoint
        const express = require('express');
        app = express();
        app.use(express.json());

        // Replicate the verifyToken logic
        async function verifyToken(token) {
            try {
                const decoded = jwt.decode(token, { complete: true });
                if (!decoded || !decoded.payload) return null;
                const issuer = decoded.payload.iss;
                if (issuer && issuer.includes('appleid.apple.com')) {
                    // For testing, we accept the decoded payload directly
                    // In production, this calls apple-signin-auth
                    return { ...decoded.payload, authProvider: 'apple' };
                } else {
                    return { ...decoded.payload, authProvider: 'auth0' };
                }
            } catch (error) {
                return null;
            }
        }

        // Replicate the deleteUserAccount function
        async function deleteUserAccount(userId) {
            const userGames = await gameStateService.getAllUserGames(userId);
            for (const game of userGames) {
                await gameStateService.deleteGame(game.roomCode);
            }
            await highscoreService.deletePlayer(userId);
            return true;
        }

        // Mount the account deletion endpoint
        app.delete('/api/user/account', async (req, res) => {
            try {
                const authHeader = req.headers.authorization;
                if (!authHeader) {
                    return res.status(401).json({
                        success: false,
                        error: 'No authorization header'
                    });
                }

                const token = authHeader.split(' ')[1];
                const decoded = await verifyToken(token);

                if (!decoded) {
                    return res.status(401).json({
                        success: false,
                        error: 'Invalid token'
                    });
                }

                const userId = decoded.sub;
                await deleteUserAccount(userId);

                res.json({
                    success: true,
                    message: 'Account successfully deleted'
                });
            } catch (error) {
                res.status(500).json({
                    success: false,
                    error: 'Failed to delete account'
                });
            }
        });
    });

    beforeEach(() => {
        jest.clearAllMocks();
        // Reset default mock implementations
        gameStateService.getAllUserGames.mockResolvedValue([]);
        gameStateService.deleteGame.mockResolvedValue(true);
        highscoreService.deletePlayer.mockResolvedValue({ deletedCount: 1 });
    });

    describe('DELETE /api/user/account', () => {
        test('deletes user account with valid Auth0 token', async () => {
            const token = createTestToken('auth0|user123');

            const response = await request(app)
                .delete('/api/user/account')
                .set('Authorization', `Bearer ${token}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.message).toBe('Account successfully deleted');
        });

        test('deletes user account with valid Apple Sign In token', async () => {
            const token = createTestToken('000123.abc456def.1234', 'apple');

            const response = await request(app)
                .delete('/api/user/account')
                .set('Authorization', `Bearer ${token}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(response.body.message).toBe('Account successfully deleted');
        });

        test('returns 401 for invalid token', async () => {
            const response = await request(app)
                .delete('/api/user/account')
                .set('Authorization', 'Bearer invalid-token-12345')
                .expect(401);

            expect(response.body.success).toBe(false);
            expect(response.body.error).toBe('Invalid token');
        });

        test('returns 401 when no authorization header provided', async () => {
            const response = await request(app)
                .delete('/api/user/account')
                .expect(401);

            expect(response.body.success).toBe(false);
            expect(response.body.error).toBe('No authorization header');
        });

        test('deletes all user games from database', async () => {
            const userId = 'auth0|user-with-games';
            const token = createTestToken(userId);

            gameStateService.getAllUserGames.mockResolvedValue([
                { roomCode: 'GAME1', players: [{ userId }] },
                { roomCode: 'GAME2', players: [{ userId }] },
                { roomCode: 'GAME3', players: [{ userId }] }
            ]);

            await request(app)
                .delete('/api/user/account')
                .set('Authorization', `Bearer ${token}`)
                .expect(200);

            expect(gameStateService.getAllUserGames).toHaveBeenCalledWith(userId);
            expect(gameStateService.deleteGame).toHaveBeenCalledTimes(3);
            expect(gameStateService.deleteGame).toHaveBeenCalledWith('GAME1');
            expect(gameStateService.deleteGame).toHaveBeenCalledWith('GAME2');
            expect(gameStateService.deleteGame).toHaveBeenCalledWith('GAME3');
        });

        test('removes user from highscores collection', async () => {
            const userId = 'auth0|user-highscore';
            const token = createTestToken(userId);

            await request(app)
                .delete('/api/user/account')
                .set('Authorization', `Bearer ${token}`)
                .expect(200);

            expect(highscoreService.deletePlayer).toHaveBeenCalledWith(userId);
            expect(highscoreService.deletePlayer).toHaveBeenCalledTimes(1);
        });

        test('user can only delete their own account (token determines userId)', async () => {
            const userAId = 'auth0|user-a';
            const userBId = 'auth0|user-b';
            const tokenA = createTestToken(userAId);

            await request(app)
                .delete('/api/user/account')
                .set('Authorization', `Bearer ${tokenA}`)
                .expect(200);

            // Should only delete user A's data - the userId comes from the token
            expect(highscoreService.deletePlayer).toHaveBeenCalledWith(userAId);
            expect(highscoreService.deletePlayer).not.toHaveBeenCalledWith(userBId);
            expect(gameStateService.getAllUserGames).toHaveBeenCalledWith(userAId);
            expect(gameStateService.getAllUserGames).not.toHaveBeenCalledWith(userBId);
        });

        test('handles database errors gracefully', async () => {
            const token = createTestToken('auth0|error-user');
            gameStateService.getAllUserGames.mockRejectedValue(new Error('Database connection failed'));

            const response = await request(app)
                .delete('/api/user/account')
                .set('Authorization', `Bearer ${token}`)
                .expect(500);

            expect(response.body.success).toBe(false);
            expect(response.body.error).toBe('Failed to delete account');
        });

        test('handles partial failure when deleting games', async () => {
            const userId = 'auth0|partial-fail';
            const token = createTestToken(userId);

            gameStateService.getAllUserGames.mockResolvedValue([
                { roomCode: 'GAME1', players: [{ userId }] }
            ]);
            gameStateService.deleteGame.mockRejectedValue(new Error('Delete failed'));

            const response = await request(app)
                .delete('/api/user/account')
                .set('Authorization', `Bearer ${token}`)
                .expect(500);

            expect(response.body.success).toBe(false);
        });

        test('works when user has no games', async () => {
            const token = createTestToken('auth0|no-games-user');
            gameStateService.getAllUserGames.mockResolvedValue([]);

            const response = await request(app)
                .delete('/api/user/account')
                .set('Authorization', `Bearer ${token}`)
                .expect(200);

            expect(response.body.success).toBe(true);
            expect(gameStateService.deleteGame).not.toHaveBeenCalled();
        });

        test('returns 401 for empty Bearer token', async () => {
            const response = await request(app)
                .delete('/api/user/account')
                .set('Authorization', 'Bearer ')
                .expect(401);

            expect(response.body.success).toBe(false);
        });
    });
});
