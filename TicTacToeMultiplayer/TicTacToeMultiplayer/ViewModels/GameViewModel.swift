import Foundation
import Combine
import SwiftUI

@MainActor
class GameViewModel: ObservableObject {
    // Room state
    @Published var currentRoom: String?
    @Published var isJoiningRoom = false

    // Game state
    @Published var gameState: GameState = .empty
    @Published var myPlayer: Player?
    @Published var selectedPieceIndex: Int?

    // Local game state
    @Published var isLocalGame = false

    // UI state
    @Published var showSettings = false
    @Published var showHighscores = false
    @Published var errorMessage: String?
    @Published var toastMessage: String?

    // Highscores
    @Published var leaderboard: [LeaderboardEntry] = []
    @Published var playerStats: PlayerStats = .empty
    @Published var activeGames: [ActiveGame] = []

    private let socketService = SocketService.shared
    private let authService = AuthService.shared
    private var cancellables = Set<AnyCancellable>()

    init() {
        setupBindings()
    }

    private func setupBindings() {
        // Room joined
        socketService.roomJoined
            .receive(on: DispatchQueue.main)
            .sink { [weak self] response in
                self?.isJoiningRoom = false
                if response.success {
                    self?.currentRoom = response.roomCode
                } else {
                    self?.errorMessage = response.message
                }
            }
            .store(in: &cancellables)

        // Login response with room
        socketService.loginResponse
            .receive(on: DispatchQueue.main)
            .sink { [weak self] response in
                if response.success {
                    self?.myPlayer = response.player
                    if let roomCode = response.roomCode {
                        self?.currentRoom = roomCode
                    }
                    // Rejoin current room after re-authentication (e.g. returning from background)
                    if let room = self?.currentRoom, room != "LOCAL" {
                        self?.socketService.joinRoom(roomCode: room)
                    }
                }
            }
            .store(in: &cancellables)

        // Game state updates
        socketService.gameStateUpdate
            .receive(on: DispatchQueue.main)
            .sink { [weak self] state in
                self?.gameState = state
                self?.updateMyPlayer()
            }
            .store(in: &cancellables)

        // Game over
        socketService.gameOver
            .receive(on: DispatchQueue.main)
            .sink { [weak self] result in
                self?.handleGameOver(result)
            }
            .store(in: &cancellables)

        // Color changes
        socketService.colorChanged
            .receive(on: DispatchQueue.main)
            .sink { [weak self] response in
                if response.piece == "X" {
                    self?.gameState.pieceColors?.X = response.color
                } else if response.piece == "O" {
                    self?.gameState.pieceColors?.O = response.color
                }
            }
            .store(in: &cancellables)

        // Highscores
        socketService.highscoresUpdate
            .receive(on: DispatchQueue.main)
            .sink { [weak self] response in
                self?.leaderboard = response.topPlayers
            }
            .store(in: &cancellables)

        // Player stats
        socketService.playerStatsUpdate
            .receive(on: DispatchQueue.main)
            .sink { [weak self] response in
                if let stats = response.stats {
                    self?.playerStats = stats
                }
            }
            .store(in: &cancellables)

        // My games
        socketService.myGamesUpdate
            .receive(on: DispatchQueue.main)
            .sink { [weak self] response in
                self?.activeGames = response.games
            }
            .store(in: &cancellables)

        // Player disconnected
        socketService.playerDisconnected
            .receive(on: DispatchQueue.main)
            .sink { [weak self] username in
                self?.toastMessage = "\(username) disconnected"
            }
            .store(in: &cancellables)

        // Game deleted
        socketService.gameDeleted
            .receive(on: DispatchQueue.main)
            .sink { [weak self] message in
                self?.toastMessage = message
                self?.leaveRoom()
            }
            .store(in: &cancellables)

        // Delete game response
        socketService.deleteGameResponse
            .receive(on: DispatchQueue.main)
            .sink { [weak self] response in
                if response.success {
                    self?.toastMessage = response.message
                    // Refresh the games list after successful deletion
                    if let userId = self?.authService.userId {
                        self?.fetchMyGames(userId: userId)
                    }
                } else {
                    self?.errorMessage = response.message
                }
            }
            .store(in: &cancellables)

        // Reconnection - rejoin current room to re-sync game state
        socketService.didReconnect
            .receive(on: DispatchQueue.main)
            .sink { [weak self] in
                guard let self = self,
                      let room = self.currentRoom,
                      room != "LOCAL" else { return }
                print("GameViewModel: Socket reconnected, rejoining room \(room)")
                self.socketService.joinRoom(roomCode: room)
            }
            .store(in: &cancellables)

        // Errors
        socketService.errorReceived
            .receive(on: DispatchQueue.main)
            .sink { [weak self] message in
                self?.errorMessage = message
            }
            .store(in: &cancellables)
    }

    private func updateMyPlayer() {
        if let myPlayer = myPlayer {
            // Update existing myPlayer from game state
            if let updated = gameState.players.first(where: { $0.userId == myPlayer.userId }) {
                self.myPlayer = updated
            }
        } else {
            // myPlayer not set yet — identify our player from game state by authService userId
            if let userId = authService.userId,
               let player = gameState.players.first(where: { $0.userId == userId }) {
                self.myPlayer = player
            }
        }
    }

    private func handleGameOver(_ result: GameOverResult) {
        gameState.board = result.board
        gameState.scores = result.scores
        gameState.gameActive = false

        if result.winner != nil, let winnerName = result.winnerName {
            toastMessage = "\(winnerName) wins!"
        } else if result.draw == true {
            toastMessage = "It's a draw!"
        }

        // Clear selected piece
        selectedPieceIndex = nil
    }

    // MARK: - Room Actions

    func quickPlay() {
        isJoiningRoom = true
        socketService.joinRoom()
    }

    func createRoom() {
        isJoiningRoom = true

        Task {
            do {
                // Call API to create a unique room code
                let roomCode = try await APIService.shared.createRoom()
                // Then join that room via socket
                socketService.joinRoom(roomCode: roomCode)
            } catch {
                isJoiningRoom = false
                errorMessage = error.localizedDescription
            }
        }
    }

    func joinRoom(code: String) {
        guard !code.isEmpty else {
            errorMessage = "Please enter a room code"
            return
        }
        isJoiningRoom = true
        socketService.joinRoom(roomCode: code.uppercased())
    }

    func rejoinGame(roomCode: String) {
        isJoiningRoom = true
        socketService.joinRoom(roomCode: roomCode)
    }

    func leaveRoom() {
        currentRoom = nil
        gameState = .empty
        myPlayer = nil
        selectedPieceIndex = nil
        isLocalGame = false
    }

    func clearAllState() {
        // Clear all game state (used when logging out or deleting account)
        currentRoom = nil
        gameState = .empty
        myPlayer = nil
        selectedPieceIndex = nil
        isLocalGame = false
        leaderboard = []
        playerStats = .empty
        activeGames = []
        errorMessage = nil
        toastMessage = nil
    }

    // MARK: - Game Actions

    func cellTapped(index: Int) {
        guard gameState.gameActive else { return }

        if isLocalGame {
            processLocalMove(index: index)
            return
        }

        guard let mySymbol = myPlayer?.symbol ?? myPlayer?.oddsSymbol else { return }
        guard gameState.currentPlayer == mySymbol else {
            errorMessage = "It's not your turn!"
            return
        }

        if gameState.gamePhase == "placement" {
            // Placement phase - tap empty cell to place
            guard gameState.board[index].isEmpty else {
                errorMessage = "Cell is already occupied!"
                return
            }
            socketService.makeMove(cellIndex: index)
        } else if gameState.gamePhase == "movement" {
            // Movement phase
            if let selected = selectedPieceIndex {
                // Second tap - move to destination
                if index == selected {
                    // Deselect
                    selectedPieceIndex = nil
                } else if gameState.board[index].isEmpty {
                    // Move piece
                    socketService.makeMove(cellIndex: index, fromIndex: selected)
                    selectedPieceIndex = nil
                } else {
                    // Select different piece if it's ours
                    if gameState.board[index] == mySymbol {
                        selectedPieceIndex = index
                    } else {
                        errorMessage = "You can only move your own pieces!"
                    }
                }
            } else {
                // First tap - select piece
                if gameState.board[index] == mySymbol {
                    selectedPieceIndex = index
                } else if gameState.board[index].isEmpty {
                    errorMessage = "Select one of your pieces first!"
                } else {
                    errorMessage = "You can only move your own pieces!"
                }
            }
        }
    }

    func newGame() {
        if isLocalGame {
            gameState.board = Array(repeating: "", count: 9)
            gameState.currentPlayer = "X"
            gameState.gameActive = true
            gameState.piecesPlaced = PiecesPlaced(X: 0, O: 0)
            gameState.gamePhase = "placement"
            selectedPieceIndex = nil
            return
        }
        socketService.resetGame()
        selectedPieceIndex = nil
    }

    func resetScore() {
        if isLocalGame {
            gameState.scores = Scores(X: 0, O: 0, draw: 0)
            return
        }
        socketService.resetScore()
    }

    // MARK: - Local Game

    private let winPatterns = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
        [0, 3, 6], [1, 4, 7], [2, 5, 8], // columns
        [0, 4, 8], [2, 4, 6]              // diagonals
    ]

    func startLocalGame() {
        isLocalGame = true
        gameState = GameState(
            players: [
                Player(username: "Player X", symbol: "X"),
                Player(username: "Player O", symbol: "O")
            ],
            board: Array(repeating: "", count: 9),
            currentPlayer: "X",
            gameActive: true,
            scores: Scores(X: 0, O: 0, draw: 0),
            piecesPlaced: PiecesPlaced(X: 0, O: 0),
            gamePhase: "placement",
            maxPieces: 3,
            pieceColors: PieceColors(X: "#e74c3c", O: "#3498db")
        )
        currentRoom = "LOCAL"
        selectedPieceIndex = nil
    }

    private func processLocalMove(index: Int) {
        let currentSymbol = gameState.currentPlayer

        if gameState.gamePhase == "placement" {
            guard gameState.board[index].isEmpty else {
                errorMessage = "Cell is already occupied!"
                return
            }

            // Place piece
            gameState.board[index] = currentSymbol
            if currentSymbol == "X" {
                gameState.piecesPlaced.X += 1
            } else {
                gameState.piecesPlaced.O += 1
            }

            // Check win
            if let result = checkWin(board: gameState.board) {
                handleLocalGameOver(winner: result.winner, pattern: result.pattern)
                return
            }

            // Check draw
            if checkDraw(board: gameState.board) {
                handleLocalGameOver(winner: nil, pattern: nil)
                return
            }

            // Check if we should switch to movement phase
            if gameState.piecesPlaced.X >= gameState.maxPieces &&
               gameState.piecesPlaced.O >= gameState.maxPieces {
                gameState.gamePhase = "movement"
            }

            // Switch turn
            gameState.currentPlayer = currentSymbol == "X" ? "O" : "X"

        } else if gameState.gamePhase == "movement" {
            if let selected = selectedPieceIndex {
                if index == selected {
                    // Deselect
                    selectedPieceIndex = nil
                } else if gameState.board[index].isEmpty {
                    // Move piece
                    gameState.board[index] = gameState.board[selected]
                    gameState.board[selected] = ""
                    selectedPieceIndex = nil

                    // Check win after move
                    if let result = checkWin(board: gameState.board) {
                        handleLocalGameOver(winner: result.winner, pattern: result.pattern)
                        return
                    }

                    // Switch turn
                    gameState.currentPlayer = currentSymbol == "X" ? "O" : "X"
                } else if gameState.board[index] == currentSymbol {
                    // Select different own piece
                    selectedPieceIndex = index
                } else {
                    errorMessage = "You can only move your own pieces!"
                }
            } else {
                // First tap - select piece
                if gameState.board[index] == currentSymbol {
                    selectedPieceIndex = index
                } else if gameState.board[index].isEmpty {
                    errorMessage = "Select one of your pieces first!"
                } else {
                    errorMessage = "That's not your piece!"
                }
            }
        }
    }

    private func checkWin(board: [String]) -> (winner: String, pattern: [Int])? {
        for pattern in winPatterns {
            let a = pattern[0], b = pattern[1], c = pattern[2]
            if !board[a].isEmpty && board[a] == board[b] && board[a] == board[c] {
                return (winner: board[a], pattern: pattern)
            }
        }
        return nil
    }

    private func checkDraw(board: [String]) -> Bool {
        return board.allSatisfy { !$0.isEmpty }
    }

    private func handleLocalGameOver(winner: String?, pattern: [Int]?) {
        gameState.gameActive = false

        if let winner = winner {
            if winner == "X" {
                gameState.scores.X += 1
            } else {
                gameState.scores.O += 1
            }
            toastMessage = "Player \(winner) wins!"
        } else {
            gameState.scores.draw += 1
            toastMessage = "It's a draw!"
        }

        selectedPieceIndex = nil
    }

    // MARK: - Settings

    func changeColor(piece: String, color: String) {
        socketService.changeColor(piece: piece, color: color)
    }

    // MARK: - Highscores

    func fetchHighscores() {
        socketService.getHighscores()
    }

    func fetchPlayerStats(userId: String) {
        socketService.getPlayerStats(userId: userId)
    }

    func fetchMyGames(userId: String) {
        socketService.getMyGames(userId: userId)
    }

    func deleteGame(roomCode: String, userId: String) {
        socketService.deleteGame(roomCode: roomCode, userId: userId)
    }

    // MARK: - Helpers

    var isMyTurn: Bool {
        if isLocalGame {
            return gameState.gameActive
        }
        guard let mySymbol = myPlayer?.symbol ?? myPlayer?.oddsSymbol else { return false }
        return gameState.currentPlayer == mySymbol && gameState.gameActive
    }

    var currentPlayerName: String {
        gameState.players.first { $0.displaySymbol == gameState.currentPlayer }?.username ?? gameState.currentPlayer
    }

    var statusText: String {
        if isLocalGame {
            if !gameState.gameActive {
                return "Game Over"
            }
            return "Player \(gameState.currentPlayer)'s turn"
        }
        if !gameState.gameActive {
            if gameState.players.count < 2 {
                return "Waiting for opponent..."
            }
            return "Game Over"
        }
        return isMyTurn ? "Your turn" : "\(currentPlayerName)'s turn"
    }

    func colorForPiece(_ piece: String) -> Color {
        let hexColor: String
        if piece == "X" {
            hexColor = gameState.pieceColors?.X ?? "#e74c3c"
        } else {
            hexColor = gameState.pieceColors?.O ?? "#3498db"
        }
        return Color(hex: hexColor)
    }

    // MARK: - Room Authentication

    private func authenticateToRoom() {
        guard let token = authService.accessToken else {
            print("GameViewModel: No token for room authentication")
            return
        }
        let username = authService.savedUsername
        print("GameViewModel: Re-authenticating to room with username: \(username ?? "nil")")
        socketService.login(token: token, customUsername: username)
    }
}
