import Foundation
import Combine
import SocketIO

class SocketService: ObservableObject {
    static let shared = SocketService()

    private let manager: SocketManager
    private let socket: SocketIOClient

    // Publishers for socket events
    let roomJoined = PassthroughSubject<RoomJoinedResponse, Never>()
    let loginResponse = PassthroughSubject<LoginResponse, Never>()
    let gameStateUpdate = PassthroughSubject<GameState, Never>()
    let gameOver = PassthroughSubject<GameOverResult, Never>()
    let colorChanged = PassthroughSubject<ColorChangedResponse, Never>()
    let usernameChanged = PassthroughSubject<UsernameChangedResponse, Never>()
    let highscoresUpdate = PassthroughSubject<HighscoresResponse, Never>()
    let playerStatsUpdate = PassthroughSubject<PlayerStatsResponse, Never>()
    let myGamesUpdate = PassthroughSubject<MyGamesResponse, Never>()
    let deleteGameResponse = PassthroughSubject<DeleteGameResponse, Never>()
    let playerDisconnected = PassthroughSubject<String, Never>()
    let gameDeleted = PassthroughSubject<String, Never>()
    let errorReceived = PassthroughSubject<String, Never>()
    let connectionStatus = CurrentValueSubject<Bool, Never>(false)

    @Published var isConnected = false

    private init() {
        let serverURL = URL(string: "https://play.tictactoe.dk")!
        manager = SocketManager(socketURL: serverURL, config: [
            .log(true),
            .reconnects(true),
            .reconnectAttempts(5),
            .reconnectWait(5)
        ])
        socket = manager.defaultSocket

        setupEventHandlers()
    }

    private func setupEventHandlers() {
        socket.on(clientEvent: .connect) { [weak self] _, _ in
            print("Socket connected")
            self?.isConnected = true
            self?.connectionStatus.send(true)
        }

        socket.on(clientEvent: .disconnect) { [weak self] _, _ in
            print("Socket disconnected")
            self?.isConnected = false
            self?.connectionStatus.send(false)
        }

        socket.on(clientEvent: .error) { [weak self] data, _ in
            if let error = data.first {
                print("Socket error: \(error)")
                self?.errorReceived.send("Connection error")
            }
        }

        socket.on("roomJoined") { [weak self] data, _ in
            guard let dict = data.first as? [String: Any],
                  let jsonData = try? JSONSerialization.data(withJSONObject: dict),
                  let response = try? JSONDecoder().decode(RoomJoinedResponse.self, from: jsonData) else {
                return
            }
            self?.roomJoined.send(response)
        }

        socket.on("loginResponse") { [weak self] data, _ in
            guard let dict = data.first as? [String: Any],
                  let jsonData = try? JSONSerialization.data(withJSONObject: dict),
                  let response = try? JSONDecoder().decode(LoginResponse.self, from: jsonData) else {
                return
            }
            self?.loginResponse.send(response)
        }

        socket.on("gameStateUpdate") { [weak self] data, _ in
            guard let dict = data.first as? [String: Any],
                  let jsonData = try? JSONSerialization.data(withJSONObject: dict),
                  let state = try? JSONDecoder().decode(GameState.self, from: jsonData) else {
                return
            }
            self?.gameStateUpdate.send(state)
        }

        socket.on("gameOver") { [weak self] data, _ in
            guard let dict = data.first as? [String: Any],
                  let jsonData = try? JSONSerialization.data(withJSONObject: dict),
                  let result = try? JSONDecoder().decode(GameOverResult.self, from: jsonData) else {
                return
            }
            self?.gameOver.send(result)
        }

        socket.on("colorChanged") { [weak self] data, _ in
            guard let dict = data.first as? [String: Any],
                  let jsonData = try? JSONSerialization.data(withJSONObject: dict),
                  let response = try? JSONDecoder().decode(ColorChangedResponse.self, from: jsonData) else {
                return
            }
            self?.colorChanged.send(response)
        }

        socket.on("usernameChanged") { [weak self] data, _ in
            guard let dict = data.first as? [String: Any],
                  let jsonData = try? JSONSerialization.data(withJSONObject: dict),
                  let response = try? JSONDecoder().decode(UsernameChangedResponse.self, from: jsonData) else {
                return
            }
            self?.usernameChanged.send(response)
        }

        socket.on("highscoresUpdate") { [weak self] data, _ in
            guard let dict = data.first as? [String: Any],
                  let jsonData = try? JSONSerialization.data(withJSONObject: dict),
                  let response = try? JSONDecoder().decode(HighscoresResponse.self, from: jsonData) else {
                return
            }
            self?.highscoresUpdate.send(response)
        }

        socket.on("playerStatsUpdate") { [weak self] data, _ in
            guard let dict = data.first as? [String: Any],
                  let jsonData = try? JSONSerialization.data(withJSONObject: dict),
                  let response = try? JSONDecoder().decode(PlayerStatsResponse.self, from: jsonData) else {
                return
            }
            self?.playerStatsUpdate.send(response)
        }

        socket.on("myGamesUpdate") { [weak self] data, _ in
            guard let dict = data.first as? [String: Any],
                  let jsonData = try? JSONSerialization.data(withJSONObject: dict),
                  let response = try? JSONDecoder().decode(MyGamesResponse.self, from: jsonData) else {
                return
            }
            self?.myGamesUpdate.send(response)
        }

        socket.on("deleteGameResponse") { [weak self] data, _ in
            guard let dict = data.first as? [String: Any],
                  let jsonData = try? JSONSerialization.data(withJSONObject: dict),
                  let response = try? JSONDecoder().decode(DeleteGameResponse.self, from: jsonData) else {
                return
            }
            self?.deleteGameResponse.send(response)
        }

        socket.on("playerDisconnected") { [weak self] data, _ in
            if let dict = data.first as? [String: Any],
               let username = dict["username"] as? String {
                self?.playerDisconnected.send(username)
            }
        }

        socket.on("gameDeleted") { [weak self] data, _ in
            if let dict = data.first as? [String: Any],
               let message = dict["message"] as? String {
                self?.gameDeleted.send(message)
            }
        }

        socket.on("error") { [weak self] data, _ in
            if let dict = data.first as? [String: Any],
               let message = dict["message"] as? String {
                self?.errorReceived.send(message)
            }
        }
    }

    // MARK: - Connection Management

    func connect() {
        socket.connect()
    }

    func disconnect() {
        socket.disconnect()
    }

    // MARK: - Emitters

    func joinRoom(roomCode: String? = nil) {
        var data: [String: Any] = [:]
        if let code = roomCode {
            data["roomCode"] = code
        }
        socket.emit("joinRoom", data)
    }

    func login(token: String, customUsername: String? = nil) {
        var data: [String: Any] = ["token": token]
        if let username = customUsername {
            data["customUsername"] = username
        }
        socket.emit("login", data)
    }

    func makeMove(cellIndex: Int, fromIndex: Int? = nil) {
        var data: [String: Any] = ["cellIndex": cellIndex]
        if let from = fromIndex {
            data["fromIndex"] = from
        }
        socket.emit("makeMove", data)
    }

    func resetGame() {
        socket.emit("resetGame")
    }

    func resetScore() {
        socket.emit("resetScore")
    }

    func changeColor(piece: String, color: String) {
        socket.emit("changeColor", ["piece": piece, "color": color])
    }

    func changeUsername(newUsername: String) {
        socket.emit("changeUsername", ["newUsername": newUsername])
    }

    func getHighscores() {
        socket.emit("getHighscores")
    }

    func getPlayerStats(userId: String) {
        socket.emit("getPlayerStats", ["userId": userId])
    }

    func getMyGames(userId: String) {
        socket.emit("getMyGames", ["userId": userId])
    }

    func deleteGame(roomCode: String, userId: String) {
        socket.emit("deleteGame", ["roomCode": roomCode, "userId": userId])
    }
}
