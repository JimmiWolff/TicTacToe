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
                    // Re-send login after joining room to be added as a player
                    // (Same pattern as web client)
                    DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
                        self?.authenticateToRoom()
                    }
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

        // Errors
        socketService.errorReceived
            .receive(on: DispatchQueue.main)
            .sink { [weak self] message in
                self?.errorMessage = message
            }
            .store(in: &cancellables)
    }

    private func updateMyPlayer() {
        guard let myPlayer = myPlayer else { return }
        if let updated = gameState.players.first(where: { $0.userId == myPlayer.userId }) {
            self.myPlayer = updated
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
    }

    // MARK: - Game Actions

    func cellTapped(index: Int) {
        guard gameState.gameActive else { return }
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
        socketService.resetGame()
        selectedPieceIndex = nil
    }

    func resetScore() {
        socketService.resetScore()
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
        guard let mySymbol = myPlayer?.symbol ?? myPlayer?.oddsSymbol else { return false }
        return gameState.currentPlayer == mySymbol && gameState.gameActive
    }

    var currentPlayerName: String {
        gameState.players.first { $0.displaySymbol == gameState.currentPlayer }?.username ?? gameState.currentPlayer
    }

    var statusText: String {
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
