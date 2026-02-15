require('./setup');

// Mock the database module
const mockCollection = {
    createIndex: jest.fn(),
    updateOne: jest.fn(),
    findOne: jest.fn(),
    deleteOne: jest.fn(),
    deleteMany: jest.fn(),
    find: jest.fn()
};

jest.mock('../database', () => ({
    getDatabase: jest.fn(() => ({
        collection: jest.fn(() => mockCollection)
    }))
}));

const gameStateService = require('../gameState');

// Helper to set up find().sort().toArray() chain
function mockFindChain(results) {
    mockCollection.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
            toArray: jest.fn().mockResolvedValue(results)
        })
    });
}

describe('GameStateService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('ensureIndexes', () => {
        test('creates roomCode unique index', async () => {
            mockCollection.createIndex.mockResolvedValue('roomCode_1');

            await gameStateService.ensureIndexes();

            expect(mockCollection.createIndex).toHaveBeenCalledWith(
                { roomCode: 1 },
                { unique: true }
            );
        });

        test('creates players.userId index', async () => {
            mockCollection.createIndex.mockResolvedValue('players.userId_1');

            await gameStateService.ensureIndexes();

            expect(mockCollection.createIndex).toHaveBeenCalledWith(
                { 'players.userId': 1 }
            );
        });

        test('creates lastActivity index', async () => {
            mockCollection.createIndex.mockResolvedValue('lastActivity_1');

            await gameStateService.ensureIndexes();

            expect(mockCollection.createIndex).toHaveBeenCalledWith(
                { lastActivity: 1 }
            );
        });

        test('creates all three indexes', async () => {
            mockCollection.createIndex.mockResolvedValue('ok');

            await gameStateService.ensureIndexes();

            expect(mockCollection.createIndex).toHaveBeenCalledTimes(3);
        });

        test('handles index creation errors gracefully', async () => {
            mockCollection.createIndex.mockRejectedValue(new Error('Index error'));

            // Should not throw
            await expect(gameStateService.ensureIndexes()).resolves.not.toThrow();
        });
    });

    describe('saveGame', () => {
        test('upserts game data with roomCode filter', async () => {
            mockCollection.updateOne.mockResolvedValue({ modifiedCount: 1 });

            const gameData = {
                board: ['X', '', 'O', '', '', '', '', '', ''],
                currentPlayer: 'O',
                gameActive: true
            };

            const result = await gameStateService.saveGame('ROOM1', gameData);

            expect(result).toBe(true);
            expect(mockCollection.updateOne).toHaveBeenCalledWith(
                { roomCode: 'ROOM1' },
                {
                    $set: expect.objectContaining({
                        board: gameData.board,
                        currentPlayer: 'O',
                        gameActive: true,
                        lastActivity: expect.any(Date)
                    })
                },
                { upsert: true }
            );
        });

        test('sets lastActivity timestamp on save', async () => {
            mockCollection.updateOne.mockResolvedValue({ modifiedCount: 1 });
            const before = new Date();

            await gameStateService.saveGame('ROOM1', { board: [] });

            const updateArg = mockCollection.updateOne.mock.calls[0][1];
            const lastActivity = updateArg.$set.lastActivity;
            const after = new Date();

            expect(lastActivity).toBeInstanceOf(Date);
            expect(lastActivity.getTime()).toBeGreaterThanOrEqual(before.getTime());
            expect(lastActivity.getTime()).toBeLessThanOrEqual(after.getTime());
        });

        test('returns true on successful save', async () => {
            mockCollection.updateOne.mockResolvedValue({ modifiedCount: 1 });

            const result = await gameStateService.saveGame('ROOM1', {});
            expect(result).toBe(true);
        });

        test('returns false on database error', async () => {
            mockCollection.updateOne.mockRejectedValue(new Error('DB error'));

            const result = await gameStateService.saveGame('ROOM1', {});
            expect(result).toBe(false);
        });

        test('uses upsert option to create or update', async () => {
            mockCollection.updateOne.mockResolvedValue({ upsertedCount: 1 });

            await gameStateService.saveGame('NEW_ROOM', { board: [] });

            const options = mockCollection.updateOne.mock.calls[0][2];
            expect(options.upsert).toBe(true);
        });
    });

    describe('loadGame', () => {
        test('finds game by roomCode', async () => {
            const gameData = {
                roomCode: 'ROOM1',
                board: ['X', 'O', '', '', '', '', '', '', ''],
                currentPlayer: 'X',
                gameActive: true
            };
            mockCollection.findOne.mockResolvedValue(gameData);

            const result = await gameStateService.loadGame('ROOM1');

            expect(result).toEqual(gameData);
            expect(mockCollection.findOne).toHaveBeenCalledWith({ roomCode: 'ROOM1' });
        });

        test('returns null when game not found', async () => {
            mockCollection.findOne.mockResolvedValue(null);

            const result = await gameStateService.loadGame('NONEXISTENT');

            expect(result).toBeNull();
        });

        test('returns null on database error', async () => {
            mockCollection.findOne.mockRejectedValue(new Error('DB error'));

            const result = await gameStateService.loadGame('ROOM1');

            expect(result).toBeNull();
        });
    });

    describe('updatePlayerStatus', () => {
        test('updates player socketId and lastSeen by roomCode and userId', async () => {
            mockCollection.updateOne.mockResolvedValue({ modifiedCount: 1 });

            const result = await gameStateService.updatePlayerStatus(
                'ROOM1', 'auth0|user1', 'socket123'
            );

            expect(result).toBe(true);
            expect(mockCollection.updateOne).toHaveBeenCalledWith(
                {
                    roomCode: 'ROOM1',
                    'players.userId': 'auth0|user1'
                },
                {
                    $set: {
                        'players.$.socketId': 'socket123',
                        'players.$.lastSeen': expect.any(Date),
                        lastActivity: expect.any(Date)
                    }
                }
            );
        });

        test('uses provided lastSeen timestamp', async () => {
            mockCollection.updateOne.mockResolvedValue({ modifiedCount: 1 });
            const customDate = new Date('2025-06-15T10:00:00Z');

            await gameStateService.updatePlayerStatus(
                'ROOM1', 'auth0|user1', 'socket123', customDate
            );

            const updateArg = mockCollection.updateOne.mock.calls[0][1];
            expect(updateArg.$set['players.$.lastSeen']).toEqual(customDate);
        });

        test('defaults lastSeen to current time', async () => {
            mockCollection.updateOne.mockResolvedValue({ modifiedCount: 1 });
            const before = new Date();

            await gameStateService.updatePlayerStatus('ROOM1', 'auth0|user1', 'socket123');

            const updateArg = mockCollection.updateOne.mock.calls[0][1];
            const lastSeen = updateArg.$set['players.$.lastSeen'];
            const after = new Date();

            expect(lastSeen.getTime()).toBeGreaterThanOrEqual(before.getTime());
            expect(lastSeen.getTime()).toBeLessThanOrEqual(after.getTime());
        });

        test('returns false when player not found in room', async () => {
            mockCollection.updateOne.mockResolvedValue({ modifiedCount: 0 });

            const result = await gameStateService.updatePlayerStatus(
                'ROOM1', 'auth0|nonexistent', 'socket123'
            );

            expect(result).toBe(false);
        });

        test('returns false on database error', async () => {
            mockCollection.updateOne.mockRejectedValue(new Error('DB error'));

            const result = await gameStateService.updatePlayerStatus(
                'ROOM1', 'auth0|user1', 'socket123'
            );

            expect(result).toBe(false);
        });
    });

    describe('markGameCompleted', () => {
        test('sets gameActive to false and adds completedAt', async () => {
            mockCollection.updateOne.mockResolvedValue({ modifiedCount: 1 });

            const result = await gameStateService.markGameCompleted('ROOM1');

            expect(result).toBe(true);
            expect(mockCollection.updateOne).toHaveBeenCalledWith(
                { roomCode: 'ROOM1' },
                {
                    $set: {
                        gameActive: false,
                        completedAt: expect.any(Date),
                        lastActivity: expect.any(Date)
                    }
                }
            );
        });

        test('sets completedAt to current time', async () => {
            mockCollection.updateOne.mockResolvedValue({ modifiedCount: 1 });
            const before = new Date();

            await gameStateService.markGameCompleted('ROOM1');

            const updateArg = mockCollection.updateOne.mock.calls[0][1];
            const completedAt = updateArg.$set.completedAt;
            const after = new Date();

            expect(completedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
            expect(completedAt.getTime()).toBeLessThanOrEqual(after.getTime());
        });

        test('returns false on database error', async () => {
            mockCollection.updateOne.mockRejectedValue(new Error('DB error'));

            const result = await gameStateService.markGameCompleted('ROOM1');

            expect(result).toBe(false);
        });
    });

    describe('deleteGame', () => {
        test('deletes game by roomCode', async () => {
            mockCollection.deleteOne.mockResolvedValue({ deletedCount: 1 });

            const result = await gameStateService.deleteGame('ROOM1');

            expect(result).toBe(true);
            expect(mockCollection.deleteOne).toHaveBeenCalledWith({ roomCode: 'ROOM1' });
        });

        test('returns false when game does not exist', async () => {
            mockCollection.deleteOne.mockResolvedValue({ deletedCount: 0 });

            const result = await gameStateService.deleteGame('NONEXISTENT');

            expect(result).toBe(false);
        });

        test('returns false on database error', async () => {
            mockCollection.deleteOne.mockRejectedValue(new Error('DB error'));

            const result = await gameStateService.deleteGame('ROOM1');

            expect(result).toBe(false);
        });
    });

    describe('getUserGames', () => {
        test('finds active games for user sorted by lastActivity desc', async () => {
            const games = [
                { roomCode: 'ROOM2', gameActive: true, lastActivity: new Date('2025-06-15') },
                { roomCode: 'ROOM1', gameActive: true, lastActivity: new Date('2025-06-14') }
            ];
            mockFindChain(games);

            const result = await gameStateService.getUserGames('auth0|user1');

            expect(result).toEqual(games);
            expect(mockCollection.find).toHaveBeenCalledWith({
                'players.userId': 'auth0|user1',
                gameActive: true
            });
        });

        test('filters by gameActive true only', async () => {
            mockFindChain([]);

            await gameStateService.getUserGames('auth0|user1');

            const filter = mockCollection.find.mock.calls[0][0];
            expect(filter.gameActive).toBe(true);
        });

        test('sorts by lastActivity descending', async () => {
            mockFindChain([]);

            await gameStateService.getUserGames('auth0|user1');

            const sortArg = mockCollection.find().sort.mock.calls[0][0];
            expect(sortArg).toEqual({ lastActivity: -1 });
        });

        test('returns empty array when user has no active games', async () => {
            mockFindChain([]);

            const result = await gameStateService.getUserGames('auth0|no-games');

            expect(result).toEqual([]);
        });

        test('returns empty array on database error', async () => {
            mockCollection.find.mockImplementation(() => {
                throw new Error('DB error');
            });

            const result = await gameStateService.getUserGames('auth0|user1');

            expect(result).toEqual([]);
        });
    });

    describe('getAllUserGames', () => {
        test('finds all games for user including inactive', async () => {
            const games = [
                { roomCode: 'ROOM1', gameActive: true },
                { roomCode: 'ROOM2', gameActive: false }
            ];
            mockFindChain(games);

            const result = await gameStateService.getAllUserGames('auth0|user1');

            expect(result).toEqual(games);
            expect(mockCollection.find).toHaveBeenCalledWith({
                'players.userId': 'auth0|user1'
            });
        });

        test('does not filter by gameActive', async () => {
            mockFindChain([]);

            await gameStateService.getAllUserGames('auth0|user1');

            const filter = mockCollection.find.mock.calls[0][0];
            expect(filter.gameActive).toBeUndefined();
        });

        test('sorts by lastActivity descending', async () => {
            mockFindChain([]);

            await gameStateService.getAllUserGames('auth0|user1');

            const sortArg = mockCollection.find().sort.mock.calls[0][0];
            expect(sortArg).toEqual({ lastActivity: -1 });
        });

        test('returns empty array when user has no games', async () => {
            mockFindChain([]);

            const result = await gameStateService.getAllUserGames('auth0|user1');

            expect(result).toEqual([]);
        });

        test('returns empty array on database error', async () => {
            mockCollection.find.mockImplementation(() => {
                throw new Error('DB error');
            });

            const result = await gameStateService.getAllUserGames('auth0|user1');

            expect(result).toEqual([]);
        });
    });

    describe('cleanupOldGames', () => {
        test('deletes completed games older than 7 days', async () => {
            mockCollection.deleteMany.mockResolvedValue({ deletedCount: 0 });
            const before = new Date();

            await gameStateService.cleanupOldGames();

            const firstCall = mockCollection.deleteMany.mock.calls[0];
            const filter = firstCall[0];

            expect(filter.gameActive).toBe(false);
            expect(filter.completedAt.$lt).toBeInstanceOf(Date);

            // Verify the cutoff is approximately 7 days ago
            const cutoff = filter.completedAt.$lt;
            const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
            const expectedCutoff = new Date(before - sevenDaysMs);
            expect(Math.abs(cutoff.getTime() - expectedCutoff.getTime())).toBeLessThan(1000);
        });

        test('deletes inactive games older than 30 days', async () => {
            mockCollection.deleteMany.mockResolvedValue({ deletedCount: 0 });
            const before = new Date();

            await gameStateService.cleanupOldGames();

            const secondCall = mockCollection.deleteMany.mock.calls[1];
            const filter = secondCall[0];

            expect(filter.lastActivity.$lt).toBeInstanceOf(Date);

            // Verify the cutoff is approximately 30 days ago
            const cutoff = filter.lastActivity.$lt;
            const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
            const expectedCutoff = new Date(before - thirtyDaysMs);
            expect(Math.abs(cutoff.getTime() - expectedCutoff.getTime())).toBeLessThan(1000);
        });

        test('deletes default room games inactive for 24 hours', async () => {
            mockCollection.deleteMany.mockResolvedValue({ deletedCount: 0 });
            const before = new Date();

            await gameStateService.cleanupOldGames();

            const thirdCall = mockCollection.deleteMany.mock.calls[2];
            const filter = thirdCall[0];

            expect(filter.roomCode).toBe('default');
            expect(filter.lastActivity.$lt).toBeInstanceOf(Date);

            // Verify the cutoff is approximately 24 hours ago
            const cutoff = filter.lastActivity.$lt;
            const oneDayMs = 24 * 60 * 60 * 1000;
            const expectedCutoff = new Date(before - oneDayMs);
            expect(Math.abs(cutoff.getTime() - expectedCutoff.getTime())).toBeLessThan(1000);
        });

        test('runs all three cleanup queries', async () => {
            mockCollection.deleteMany.mockResolvedValue({ deletedCount: 0 });

            await gameStateService.cleanupOldGames();

            expect(mockCollection.deleteMany).toHaveBeenCalledTimes(3);
        });

        test('returns total count of deleted games', async () => {
            mockCollection.deleteMany
                .mockResolvedValueOnce({ deletedCount: 3 })  // completed
                .mockResolvedValueOnce({ deletedCount: 5 })  // inactive
                .mockResolvedValueOnce({ deletedCount: 1 }); // default room

            const result = await gameStateService.cleanupOldGames();

            expect(result).toBe(9);
        });

        test('returns 0 when no games deleted', async () => {
            mockCollection.deleteMany.mockResolvedValue({ deletedCount: 0 });

            const result = await gameStateService.cleanupOldGames();

            expect(result).toBe(0);
        });

        test('returns 0 on database error', async () => {
            mockCollection.deleteMany.mockRejectedValue(new Error('DB error'));

            const result = await gameStateService.cleanupOldGames();

            expect(result).toBe(0);
        });
    });
});
