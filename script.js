class TicTacToe {
    constructor() {
        this.board = ['', '', '', '', '', '', '', '', ''];
        this.currentPlayer = 'X';
        this.gameActive = true;
        this.gameMode = 'human';
        this.scores = { X: 0, O: 0, draw: 0 };

        this.initializeGame();
    }

    initializeGame() {
        this.cells = document.querySelectorAll('.cell');
        this.gameStatus = document.getElementById('gameStatus');
        this.playerDisplay = document.getElementById('player');
        this.resetBtn = document.getElementById('resetBtn');
        this.resetScoreBtn = document.getElementById('resetScoreBtn');
        this.modeRadios = document.querySelectorAll('input[name="mode"]');

        this.scoreXDisplay = document.getElementById('scoreX');
        this.scoreODisplay = document.getElementById('scoreO');
        this.scoreDrawDisplay = document.getElementById('scoreDraw');

        this.addEventListeners();
        this.updateDisplay();
    }

    addEventListeners() {
        this.cells.forEach((cell, index) => {
            cell.addEventListener('click', () => this.handleCellClick(index));
        });

        this.resetBtn.addEventListener('click', () => this.resetGame());
        this.resetScoreBtn.addEventListener('click', () => this.resetScore());

        this.modeRadios.forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.gameMode = e.target.value;
                this.resetGame();
            });
        });
    }

    handleCellClick(index) {
        if (!this.gameActive || this.board[index] !== '') return;

        this.makeMove(index, this.currentPlayer);

        if (this.gameMode === 'computer' && this.gameActive && this.currentPlayer === 'O') {
            setTimeout(() => this.makeComputerMove(), 500);
        }
    }

    makeMove(index, player) {
        this.board[index] = player;
        this.cells[index].textContent = player;
        this.cells[index].classList.add(player.toLowerCase());

        if (this.checkWin()) {
            this.gameActive = false;
            this.highlightWinningCells();
            this.gameStatus.textContent = `Player ${player} wins!`;
            this.gameStatus.className = 'game-status winner';
            this.scores[player]++;
            this.updateScoreDisplay();
        } else if (this.checkDraw()) {
            this.gameActive = false;
            this.gameStatus.textContent = "It's a draw!";
            this.gameStatus.className = 'game-status draw';
            this.scores.draw++;
            this.updateScoreDisplay();
        } else {
            this.currentPlayer = this.currentPlayer === 'X' ? 'O' : 'X';
            this.updateDisplay();
        }
    }

    makeComputerMove() {
        if (!this.gameActive) return;

        const bestMove = this.getBestMove();
        this.makeMove(bestMove, 'O');
    }

    getBestMove() {
        const availableMoves = this.board.map((cell, index) => cell === '' ? index : null)
                                        .filter(index => index !== null);

        let bestScore = -Infinity;
        let bestMove = availableMoves[0];

        for (let move of availableMoves) {
            this.board[move] = 'O';
            let score = this.minimax(this.board, 0, false);
            this.board[move] = '';

            if (score > bestScore) {
                bestScore = score;
                bestMove = move;
            }
        }

        return bestMove;
    }

    minimax(board, depth, isMaximizing) {
        let winner = this.evaluateBoard(board);

        if (winner === 'O') return 1;
        if (winner === 'X') return -1;
        if (this.isBoardFull(board)) return 0;

        if (isMaximizing) {
            let bestScore = -Infinity;
            for (let i = 0; i < 9; i++) {
                if (board[i] === '') {
                    board[i] = 'O';
                    let score = this.minimax(board, depth + 1, false);
                    board[i] = '';
                    bestScore = Math.max(score, bestScore);
                }
            }
            return bestScore;
        } else {
            let bestScore = Infinity;
            for (let i = 0; i < 9; i++) {
                if (board[i] === '') {
                    board[i] = 'X';
                    let score = this.minimax(board, depth + 1, true);
                    board[i] = '';
                    bestScore = Math.min(score, bestScore);
                }
            }
            return bestScore;
        }
    }

    evaluateBoard(board) {
        const winPatterns = [
            [0, 1, 2], [3, 4, 5], [6, 7, 8],
            [0, 3, 6], [1, 4, 7], [2, 5, 8],
            [0, 4, 8], [2, 4, 6]
        ];

        for (let pattern of winPatterns) {
            const [a, b, c] = pattern;
            if (board[a] && board[a] === board[b] && board[a] === board[c]) {
                return board[a];
            }
        }
        return null;
    }

    isBoardFull(board) {
        return board.every(cell => cell !== '');
    }

    checkWin() {
        const winPatterns = [
            [0, 1, 2], [3, 4, 5], [6, 7, 8],
            [0, 3, 6], [1, 4, 7], [2, 5, 8],
            [0, 4, 8], [2, 4, 6]
        ];

        for (let pattern of winPatterns) {
            const [a, b, c] = pattern;
            if (this.board[a] &&
                this.board[a] === this.board[b] &&
                this.board[a] === this.board[c]) {
                this.winningPattern = pattern;
                return true;
            }
        }
        return false;
    }

    checkDraw() {
        return this.board.every(cell => cell !== '');
    }

    highlightWinningCells() {
        if (this.winningPattern) {
            this.winningPattern.forEach(index => {
                this.cells[index].classList.add('winning');
            });
        }
    }

    resetGame() {
        this.board = ['', '', '', '', '', '', '', '', ''];
        this.currentPlayer = 'X';
        this.gameActive = true;
        this.winningPattern = null;

        this.cells.forEach(cell => {
            cell.textContent = '';
            cell.className = 'cell';
        });

        this.gameStatus.textContent = '';
        this.gameStatus.className = 'game-status';
        this.updateDisplay();
    }

    resetScore() {
        this.scores = { X: 0, O: 0, draw: 0 };
        this.updateScoreDisplay();
    }

    updateDisplay() {
        this.playerDisplay.textContent = this.currentPlayer;
    }

    updateScoreDisplay() {
        this.scoreXDisplay.textContent = this.scores.X;
        this.scoreODisplay.textContent = this.scores.O;
        this.scoreDrawDisplay.textContent = this.scores.draw;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new TicTacToe();
});