const {
    checkWin,
    checkDraw,
    isValidMove,
    switchToMovementPhase,
    createGameRoom,
    generateRoomCode,
    resetGame,
    WIN_PATTERNS
} = require('../gameLogic');

describe('checkWin', () => {
    test('detects X winning on top row [0,1,2]', () => {
        const board = ['X', 'X', 'X', '', 'O', 'O', '', '', ''];
        const result = checkWin(board);
        expect(result).toEqual({ winner: 'X', pattern: [0, 1, 2] });
    });

    test('detects O winning on middle row [3,4,5]', () => {
        const board = ['X', '', 'X', 'O', 'O', 'O', '', '', 'X'];
        const result = checkWin(board);
        expect(result).toEqual({ winner: 'O', pattern: [3, 4, 5] });
    });

    test('detects X winning on bottom row [6,7,8]', () => {
        const board = ['O', '', 'O', '', '', '', 'X', 'X', 'X'];
        const result = checkWin(board);
        expect(result).toEqual({ winner: 'X', pattern: [6, 7, 8] });
    });

    test('detects O winning on left column [0,3,6]', () => {
        const board = ['O', 'X', '', 'O', 'X', '', 'O', '', ''];
        const result = checkWin(board);
        expect(result).toEqual({ winner: 'O', pattern: [0, 3, 6] });
    });

    test('detects X winning on middle column [1,4,7]', () => {
        const board = ['O', 'X', '', '', 'X', 'O', '', 'X', ''];
        const result = checkWin(board);
        expect(result).toEqual({ winner: 'X', pattern: [1, 4, 7] });
    });

    test('detects O winning on right column [2,5,8]', () => {
        const board = ['X', '', 'O', 'X', '', 'O', '', '', 'O'];
        const result = checkWin(board);
        expect(result).toEqual({ winner: 'O', pattern: [2, 5, 8] });
    });

    test('detects X winning on main diagonal [0,4,8]', () => {
        const board = ['X', 'O', '', '', 'X', 'O', '', '', 'X'];
        const result = checkWin(board);
        expect(result).toEqual({ winner: 'X', pattern: [0, 4, 8] });
    });

    test('detects O winning on anti-diagonal [2,4,6]', () => {
        const board = ['X', '', 'O', '', 'O', '', 'O', 'X', 'X'];
        const result = checkWin(board);
        expect(result).toEqual({ winner: 'O', pattern: [2, 4, 6] });
    });

    test('returns null when no winner on empty board', () => {
        const board = ['', '', '', '', '', '', '', '', ''];
        expect(checkWin(board)).toBeNull();
    });

    test('returns null when no winner on partial board', () => {
        const board = ['X', 'O', 'X', 'O', 'X', 'O', '', '', ''];
        expect(checkWin(board)).toBeNull();
    });

    test('returns null on a draw board with no winner', () => {
        const board = ['X', 'O', 'X', 'X', 'O', 'O', 'O', 'X', 'X'];
        expect(checkWin(board)).toBeNull();
    });

    test('returns first winning pattern found when multiple exist', () => {
        // X wins on both top row and left column
        const board = ['X', 'X', 'X', 'X', 'O', 'O', 'X', '', ''];
        const result = checkWin(board);
        expect(result).not.toBeNull();
        expect(result.winner).toBe('X');
    });

    test('does not false positive on incomplete row', () => {
        const board = ['X', 'X', '', '', 'O', 'O', '', '', ''];
        expect(checkWin(board)).toBeNull();
    });

    test('does not false positive when two different symbols fill a line', () => {
        const board = ['X', 'O', 'X', '', '', '', '', '', ''];
        expect(checkWin(board)).toBeNull();
    });
});

describe('checkDraw', () => {
    test('returns true when all cells are filled', () => {
        const board = ['X', 'O', 'X', 'X', 'O', 'O', 'O', 'X', 'X'];
        expect(checkDraw(board)).toBe(true);
    });

    test('returns false when board is empty', () => {
        const board = ['', '', '', '', '', '', '', '', ''];
        expect(checkDraw(board)).toBe(false);
    });

    test('returns false when one cell is empty', () => {
        const board = ['X', 'O', 'X', 'X', 'O', 'O', 'O', 'X', ''];
        expect(checkDraw(board)).toBe(false);
    });

    test('returns false when board is partially filled', () => {
        const board = ['X', '', '', 'O', '', '', '', '', ''];
        expect(checkDraw(board)).toBe(false);
    });
});

describe('isValidMove', () => {
    test('allows moving own piece to empty cell', () => {
        const room = {
            board: ['X', '', 'O', '', 'X', '', 'O', '', 'X']
        };
        expect(isValidMove(0, 1, 'X', room)).toBe(true);
    });

    test('rejects moving from cell without own piece', () => {
        const room = {
            board: ['X', '', 'O', '', '', '', '', '', '']
        };
        expect(isValidMove(2, 1, 'X', room)).toBe(false); // cell 2 has 'O', not 'X'
    });

    test('rejects moving from empty cell', () => {
        const room = {
            board: ['X', '', 'O', '', '', '', '', '', '']
        };
        expect(isValidMove(1, 3, 'X', room)).toBe(false); // cell 1 is empty
    });

    test('rejects moving to occupied cell', () => {
        const room = {
            board: ['X', 'O', '', '', '', '', '', '', '']
        };
        expect(isValidMove(0, 1, 'X', room)).toBe(false); // cell 1 has 'O'
    });

    test('rejects moving to cell occupied by own piece', () => {
        const room = {
            board: ['X', 'X', '', '', '', '', '', '', '']
        };
        expect(isValidMove(0, 1, 'X', room)).toBe(false);
    });

    test('allows O to move their piece', () => {
        const room = {
            board: ['X', '', 'O', '', '', '', '', '', '']
        };
        expect(isValidMove(2, 4, 'O', room)).toBe(true);
    });
});

describe('switchToMovementPhase', () => {
    test('switches to movement phase when both players placed max pieces', () => {
        const room = {
            piecesPlaced: { X: 3, O: 3 },
            maxPieces: 3,
            gamePhase: 'placement'
        };
        const result = switchToMovementPhase(room);
        expect(result).toBe(true);
        expect(room.gamePhase).toBe('movement');
    });

    test('does not switch when X has not placed all pieces', () => {
        const room = {
            piecesPlaced: { X: 2, O: 3 },
            maxPieces: 3,
            gamePhase: 'placement'
        };
        const result = switchToMovementPhase(room);
        expect(result).toBe(false);
        expect(room.gamePhase).toBe('placement');
    });

    test('does not switch when O has not placed all pieces', () => {
        const room = {
            piecesPlaced: { X: 3, O: 1 },
            maxPieces: 3,
            gamePhase: 'placement'
        };
        const result = switchToMovementPhase(room);
        expect(result).toBe(false);
        expect(room.gamePhase).toBe('placement');
    });

    test('does not switch when neither player has placed all pieces', () => {
        const room = {
            piecesPlaced: { X: 0, O: 0 },
            maxPieces: 3,
            gamePhase: 'placement'
        };
        const result = switchToMovementPhase(room);
        expect(result).toBe(false);
        expect(room.gamePhase).toBe('placement');
    });

    test('switches when pieces exceed max (edge case)', () => {
        const room = {
            piecesPlaced: { X: 4, O: 4 },
            maxPieces: 3,
            gamePhase: 'placement'
        };
        const result = switchToMovementPhase(room);
        expect(result).toBe(true);
        expect(room.gamePhase).toBe('movement');
    });
});

describe('createGameRoom', () => {
    test('creates room with correct id', () => {
        const room = createGameRoom('TEST123');
        expect(room.id).toBe('TEST123');
    });

    test('creates room with empty players array', () => {
        const room = createGameRoom('ROOM1');
        expect(room.players).toEqual([]);
    });

    test('creates room with empty 9-cell board', () => {
        const room = createGameRoom('ROOM1');
        expect(room.board).toEqual(['', '', '', '', '', '', '', '', '']);
        expect(room.board).toHaveLength(9);
    });

    test('creates room with X as starting player', () => {
        const room = createGameRoom('ROOM1');
        expect(room.currentPlayer).toBe('X');
    });

    test('creates room with game active', () => {
        const room = createGameRoom('ROOM1');
        expect(room.gameActive).toBe(true);
    });

    test('creates room with zero scores', () => {
        const room = createGameRoom('ROOM1');
        expect(room.scores).toEqual({ X: 0, O: 0, draw: 0 });
    });

    test('creates room in placement phase', () => {
        const room = createGameRoom('ROOM1');
        expect(room.gamePhase).toBe('placement');
    });

    test('creates room with zero pieces placed', () => {
        const room = createGameRoom('ROOM1');
        expect(room.piecesPlaced).toEqual({ X: 0, O: 0 });
    });

    test('creates room with max 2 players', () => {
        const room = createGameRoom('ROOM1');
        expect(room.maxPlayers).toBe(2);
    });

    test('creates room with max 3 pieces per player', () => {
        const room = createGameRoom('ROOM1');
        expect(room.maxPieces).toBe(3);
    });

    test('creates room with default piece colors', () => {
        const room = createGameRoom('ROOM1');
        expect(room.pieceColors.X).toBe('#e74c3c');
        expect(room.pieceColors.O).toBe('#3498db');
    });

    test('initializes lastWinner and lastStarter as null', () => {
        const room = createGameRoom('ROOM1');
        expect(room.lastWinner).toBeNull();
        expect(room.lastStarter).toBeNull();
    });

    test('creates room with timestamps', () => {
        const before = new Date();
        const room = createGameRoom('ROOM1');
        const after = new Date();
        expect(room.createdAt).toBeInstanceOf(Date);
        expect(room.lastActivity).toBeInstanceOf(Date);
        expect(room.createdAt >= before).toBe(true);
        expect(room.createdAt <= after).toBe(true);
    });
});

describe('generateRoomCode', () => {
    test('generates a 6-character code', () => {
        const code = generateRoomCode();
        expect(code).toHaveLength(6);
    });

    test('generates code with only uppercase letters and digits', () => {
        for (let i = 0; i < 50; i++) {
            const code = generateRoomCode();
            expect(code).toMatch(/^[A-Z0-9]{6}$/);
        }
    });

    test('generates different codes on subsequent calls', () => {
        const codes = new Set();
        for (let i = 0; i < 20; i++) {
            codes.add(generateRoomCode());
        }
        // With 36^6 possible codes, 20 calls should produce at least 2 unique codes
        expect(codes.size).toBeGreaterThan(1);
    });
});

describe('resetGame', () => {
    test('clears the board', () => {
        const room = createGameRoom('ROOM1');
        room.board = ['X', 'O', 'X', 'O', 'X', 'O', 'X', 'O', 'X'];
        resetGame(room);
        expect(room.board).toEqual(['', '', '', '', '', '', '', '', '']);
    });

    test('defaults to X on first game (no lastWinner or lastStarter)', () => {
        const room = createGameRoom('ROOM1');
        room.currentPlayer = 'O';
        resetGame(room);
        expect(room.currentPlayer).toBe('X');
    });

    test('loser starts after X wins', () => {
        const room = createGameRoom('ROOM1');
        room.lastWinner = 'X';
        resetGame(room);
        expect(room.currentPlayer).toBe('O');
    });

    test('loser starts after O wins', () => {
        const room = createGameRoom('ROOM1');
        room.lastWinner = 'O';
        resetGame(room);
        expect(room.currentPlayer).toBe('X');
    });

    test('alternates starter on draw (X started)', () => {
        const room = createGameRoom('ROOM1');
        room.lastWinner = null;
        room.lastStarter = 'X';
        resetGame(room);
        expect(room.currentPlayer).toBe('O');
    });

    test('alternates starter on draw (O started)', () => {
        const room = createGameRoom('ROOM1');
        room.lastWinner = null;
        room.lastStarter = 'O';
        resetGame(room);
        expect(room.currentPlayer).toBe('X');
    });

    test('sets lastStarter to currentPlayer after reset', () => {
        const room = createGameRoom('ROOM1');
        room.lastWinner = 'X';
        resetGame(room);
        expect(room.lastStarter).toBe(room.currentPlayer);
    });

    test('clears lastWinner after reset', () => {
        const room = createGameRoom('ROOM1');
        room.lastWinner = 'X';
        resetGame(room);
        expect(room.lastWinner).toBeNull();
    });

    test('sets game to active', () => {
        const room = createGameRoom('ROOM1');
        room.gameActive = false;
        resetGame(room);
        expect(room.gameActive).toBe(true);
    });

    test('resets pieces placed to zero', () => {
        const room = createGameRoom('ROOM1');
        room.piecesPlaced = { X: 3, O: 3 };
        resetGame(room);
        expect(room.piecesPlaced).toEqual({ X: 0, O: 0 });
    });

    test('resets game phase to placement', () => {
        const room = createGameRoom('ROOM1');
        room.gamePhase = 'movement';
        resetGame(room);
        expect(room.gamePhase).toBe('placement');
    });

    test('clears selected piece', () => {
        const room = createGameRoom('ROOM1');
        room.selectedPiece = 4;
        resetGame(room);
        expect(room.selectedPiece).toBeNull();
    });

    test('updates lastActivity timestamp', () => {
        const room = createGameRoom('ROOM1');
        const oldTimestamp = new Date(2020, 0, 1);
        room.lastActivity = oldTimestamp;
        resetGame(room);
        expect(room.lastActivity.getTime()).toBeGreaterThan(oldTimestamp.getTime());
    });

    test('preserves scores', () => {
        const room = createGameRoom('ROOM1');
        room.scores = { X: 5, O: 3, draw: 2 };
        resetGame(room);
        expect(room.scores).toEqual({ X: 5, O: 3, draw: 2 });
    });

    test('preserves players', () => {
        const room = createGameRoom('ROOM1');
        room.players = [{ username: 'Alice', symbol: 'X' }];
        resetGame(room);
        expect(room.players).toEqual([{ username: 'Alice', symbol: 'X' }]);
    });
});

describe('WIN_PATTERNS', () => {
    test('contains exactly 8 winning patterns', () => {
        expect(WIN_PATTERNS).toHaveLength(8);
    });

    test('each pattern has exactly 3 indices', () => {
        for (const pattern of WIN_PATTERNS) {
            expect(pattern).toHaveLength(3);
        }
    });

    test('all indices are valid board positions (0-8)', () => {
        for (const pattern of WIN_PATTERNS) {
            for (const index of pattern) {
                expect(index).toBeGreaterThanOrEqual(0);
                expect(index).toBeLessThanOrEqual(8);
            }
        }
    });

    test('contains all 3 row patterns', () => {
        expect(WIN_PATTERNS).toContainEqual([0, 1, 2]);
        expect(WIN_PATTERNS).toContainEqual([3, 4, 5]);
        expect(WIN_PATTERNS).toContainEqual([6, 7, 8]);
    });

    test('contains all 3 column patterns', () => {
        expect(WIN_PATTERNS).toContainEqual([0, 3, 6]);
        expect(WIN_PATTERNS).toContainEqual([1, 4, 7]);
        expect(WIN_PATTERNS).toContainEqual([2, 5, 8]);
    });

    test('contains both diagonal patterns', () => {
        expect(WIN_PATTERNS).toContainEqual([0, 4, 8]);
        expect(WIN_PATTERNS).toContainEqual([2, 4, 6]);
    });
});
