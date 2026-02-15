require('./setup');

// Mock dependencies before requiring server
jest.mock('../database', () => ({
    connectToDatabase: jest.fn().mockResolvedValue(true),
    getDatabase: jest.fn(() => ({
        collection: jest.fn(() => ({
            findOne: jest.fn().mockResolvedValue(null),
            find: jest.fn().mockReturnValue({
                sort: jest.fn().mockReturnValue({
                    toArray: jest.fn().mockResolvedValue([])
                })
            }),
            updateOne: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
            insertOne: jest.fn().mockResolvedValue({ insertedId: '123' }),
            deleteOne: jest.fn().mockResolvedValue({ deletedCount: 1 }),
            deleteMany: jest.fn().mockResolvedValue({ deletedCount: 0 }),
            createIndex: jest.fn().mockResolvedValue('ok')
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

const { createGameRoom } = require('../gameLogic');
const { rooms, cleanupEmptyRooms, findAvailablePublicRoom } = require('../server');

describe('cleanupEmptyRooms', () => {
    beforeEach(() => {
        rooms.clear();
    });

    test('removes room with no players inactive for over 5 minutes', () => {
        const room = createGameRoom('ROOM1');
        room.lastActivity = new Date(Date.now() - 400000); // ~6.7 minutes ago
        rooms.set('ROOM1', room);

        cleanupEmptyRooms();

        expect(rooms.has('ROOM1')).toBe(false);
    });

    test('keeps room with no players if inactive less than 5 minutes', () => {
        const room = createGameRoom('ROOM1');
        room.lastActivity = new Date(Date.now() - 100000); // ~1.7 minutes ago
        rooms.set('ROOM1', room);

        cleanupEmptyRooms();

        expect(rooms.has('ROOM1')).toBe(true);
    });

    test('keeps room with players even if inactive over 5 minutes', () => {
        const room = createGameRoom('ROOM1');
        room.players = [{ username: 'Alice', symbol: 'X' }];
        room.lastActivity = new Date(Date.now() - 600000); // 10 minutes ago
        rooms.set('ROOM1', room);

        cleanupEmptyRooms();

        expect(rooms.has('ROOM1')).toBe(true);
    });

    test('keeps room with players and recent activity', () => {
        const room = createGameRoom('ROOM1');
        room.players = [{ username: 'Alice', symbol: 'X' }];
        room.lastActivity = new Date(); // just now
        rooms.set('ROOM1', room);

        cleanupEmptyRooms();

        expect(rooms.has('ROOM1')).toBe(true);
    });

    test('removes multiple stale empty rooms', () => {
        for (let i = 1; i <= 5; i++) {
            const room = createGameRoom(`ROOM${i}`);
            room.lastActivity = new Date(Date.now() - 400000);
            rooms.set(`ROOM${i}`, room);
        }

        cleanupEmptyRooms();

        expect(rooms.size).toBe(0);
    });

    test('selectively removes only stale empty rooms', () => {
        // Stale and empty — should be removed
        const stale = createGameRoom('STALE');
        stale.lastActivity = new Date(Date.now() - 400000);
        rooms.set('STALE', stale);

        // Recent and empty — should stay
        const recent = createGameRoom('RECENT');
        recent.lastActivity = new Date();
        rooms.set('RECENT', recent);

        // Stale but has players — should stay
        const occupied = createGameRoom('OCCUPIED');
        occupied.players = [{ username: 'Bob', symbol: 'X' }];
        occupied.lastActivity = new Date(Date.now() - 400000);
        rooms.set('OCCUPIED', occupied);

        cleanupEmptyRooms();

        expect(rooms.has('STALE')).toBe(false);
        expect(rooms.has('RECENT')).toBe(true);
        expect(rooms.has('OCCUPIED')).toBe(true);
        expect(rooms.size).toBe(2);
    });

    test('does nothing when no rooms exist', () => {
        cleanupEmptyRooms();

        expect(rooms.size).toBe(0);
    });

    test('does not remove room at exactly 5 minutes boundary', () => {
        const room = createGameRoom('ROOM1');
        room.lastActivity = new Date(Date.now() - 300000); // exactly 5 minutes
        rooms.set('ROOM1', room);

        cleanupEmptyRooms();

        // 300000 is not > 300000, so room should stay
        expect(rooms.has('ROOM1')).toBe(true);
    });

    test('removes room just past 5 minutes', () => {
        const room = createGameRoom('ROOM1');
        room.lastActivity = new Date(Date.now() - 300001); // 5 minutes + 1ms
        rooms.set('ROOM1', room);

        cleanupEmptyRooms();

        expect(rooms.has('ROOM1')).toBe(false);
    });
});

describe('findAvailablePublicRoom', () => {
    beforeEach(() => {
        rooms.clear();
    });

    test('creates PUBLIC-1 when no public rooms exist', () => {
        const roomId = findAvailablePublicRoom();

        expect(roomId).toBe('PUBLIC-1');
    });

    test('returns existing public room with space', () => {
        const room = createGameRoom('PUBLIC-1');
        room.players = [{ username: 'Alice', symbol: 'X' }];
        rooms.set('PUBLIC-1', room);

        const roomId = findAvailablePublicRoom();

        expect(roomId).toBe('PUBLIC-1');
    });

    test('creates next room when existing public room is full', () => {
        const room = createGameRoom('PUBLIC-1');
        room.players = [
            { username: 'Alice', symbol: 'X' },
            { username: 'Bob', symbol: 'O' }
        ];
        rooms.set('PUBLIC-1', room);

        const roomId = findAvailablePublicRoom();

        expect(roomId).toBe('PUBLIC-2');
    });

    test('finds first available room among multiple', () => {
        // PUBLIC-1: full
        const room1 = createGameRoom('PUBLIC-1');
        room1.players = [
            { username: 'Alice', symbol: 'X' },
            { username: 'Bob', symbol: 'O' }
        ];
        rooms.set('PUBLIC-1', room1);

        // PUBLIC-2: has space
        const room2 = createGameRoom('PUBLIC-2');
        room2.players = [{ username: 'Charlie', symbol: 'X' }];
        rooms.set('PUBLIC-2', room2);

        // PUBLIC-3: full
        const room3 = createGameRoom('PUBLIC-3');
        room3.players = [
            { username: 'Dave', symbol: 'X' },
            { username: 'Eve', symbol: 'O' }
        ];
        rooms.set('PUBLIC-3', room3);

        const roomId = findAvailablePublicRoom();

        expect(roomId).toBe('PUBLIC-2');
    });

    test('creates next numbered room when all are full', () => {
        for (let i = 1; i <= 3; i++) {
            const room = createGameRoom(`PUBLIC-${i}`);
            room.players = [
                { username: `P${i}A`, symbol: 'X' },
                { username: `P${i}B`, symbol: 'O' }
            ];
            rooms.set(`PUBLIC-${i}`, room);
        }

        const roomId = findAvailablePublicRoom();

        expect(roomId).toBe('PUBLIC-4');
    });

    test('ignores non-public rooms', () => {
        // Private room with space
        const privateRoom = createGameRoom('ABCDEF');
        privateRoom.players = [{ username: 'Alice', symbol: 'X' }];
        rooms.set('ABCDEF', privateRoom);

        const roomId = findAvailablePublicRoom();

        // Should create PUBLIC-1, not return the private room
        expect(roomId).toBe('PUBLIC-1');
    });

    test('returns empty public room', () => {
        const room = createGameRoom('PUBLIC-1');
        // No players added
        rooms.set('PUBLIC-1', room);

        const roomId = findAvailablePublicRoom();

        expect(roomId).toBe('PUBLIC-1');
    });
});
