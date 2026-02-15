// Pure game logic functions extracted for testability

const WIN_PATTERNS = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // columns
    [0, 4, 8], [2, 4, 6]              // diagonals
];

function checkWin(board) {
    for (let pattern of WIN_PATTERNS) {
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

function isValidMove(fromIndex, toIndex, player, room) {
    // Check if fromIndex has the player's piece
    if (room.board[fromIndex] !== player) {
        return false;
    }

    // Check if toIndex is empty
    if (room.board[toIndex] !== '') {
        return false;
    }

    // Pieces can move to any empty cell on the board
    return true;
}

function switchToMovementPhase(room) {
    if (room.piecesPlaced.X >= room.maxPieces &&
        room.piecesPlaced.O >= room.maxPieces) {
        room.gamePhase = 'movement';
        return true;
    }
    return false;
}

function createGameRoom(roomId) {
    return {
        id: roomId,
        players: [],
        maxPlayers: 2,
        board: ['', '', '', '', '', '', '', '', ''],
        currentPlayer: 'X',
        gameActive: true,
        scores: { X: 0, O: 0, draw: 0 },
        piecesPlaced: { X: 0, O: 0 },
        gamePhase: 'placement',
        selectedPiece: null,
        maxPieces: 3,
        pieceColors: {
            X: '#e74c3c',
            O: '#3498db'
        },
        createdAt: new Date(),
        lastActivity: new Date()
    };
}

function generateRoomCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

function resetGame(room) {
    room.board = ['', '', '', '', '', '', '', '', ''];
    room.currentPlayer = 'X';
    room.gameActive = true;
    room.piecesPlaced = { X: 0, O: 0 };
    room.gamePhase = 'placement';
    room.selectedPiece = null;
    room.lastActivity = new Date();
}

module.exports = {
    WIN_PATTERNS,
    checkWin,
    checkDraw,
    isValidMove,
    switchToMovementPhase,
    createGameRoom,
    generateRoomCode,
    resetGame
};
