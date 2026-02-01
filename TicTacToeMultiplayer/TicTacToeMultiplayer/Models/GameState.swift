import Foundation

struct GameState: Codable {
    var players: [Player]
    var board: [String]
    var currentPlayer: String
    var gameActive: Bool
    var scores: Scores
    var piecesPlaced: PiecesPlaced
    var gamePhase: String
    var maxPieces: Int
    var pieceColors: PieceColors?

    static var empty: GameState {
        GameState(
            players: [],
            board: Array(repeating: "", count: 9),
            currentPlayer: "X",
            gameActive: false,
            scores: Scores(X: 0, O: 0, draw: 0),
            piecesPlaced: PiecesPlaced(X: 0, O: 0),
            gamePhase: "placement",
            maxPieces: 3,
            pieceColors: PieceColors(X: "#e74c3c", O: "#3498db")
        )
    }
}

struct Scores: Codable {
    var X: Int
    var O: Int
    var draw: Int
}

struct PiecesPlaced: Codable {
    var X: Int
    var O: Int
}

struct PieceColors: Codable {
    var X: String
    var O: String
}

struct GameOverResult: Codable {
    var winner: String?
    var winnerName: String?
    var pattern: [Int]?
    var board: [String]
    var scores: Scores
    var gamePhase: String
    var draw: Bool?
}

struct RoomJoinedResponse: Codable {
    var success: Bool
    var roomCode: String
    var message: String
}

struct LoginResponse: Codable {
    var success: Bool
    var message: String
    var needsRoom: Bool?
    var username: String?
    var player: Player?
    var roomCode: String?
}

struct UsernameChangedResponse: Codable {
    var success: Bool
    var newUsername: String?
    var message: String
}

struct ColorChangedResponse: Codable {
    var piece: String
    var color: String
}

struct HighscoresResponse: Codable {
    var topPlayers: [LeaderboardEntry]
}

struct LeaderboardEntry: Codable, Identifiable {
    var id: String { oddsId ?? oddsUsername ?? username }
    var oddsId: String?
    var oddsUsername: String?
    var username: String
    var wins: Int
    var losses: Int
    var draws: Int
    var winRate: Double?

    enum CodingKeys: String, CodingKey {
        case oddsId = "_id"
        case oddsUsername
        case username
        case wins
        case losses
        case draws
        case winRate
    }
}

struct PlayerStats: Codable {
    var wins: Int
    var losses: Int
    var draws: Int
    var winRate: Double

    static var empty: PlayerStats {
        PlayerStats(wins: 0, losses: 0, draws: 0, winRate: 0)
    }
}

struct PlayerStatsResponse: Codable {
    var stats: PlayerStats?
}

struct MyGamesResponse: Codable {
    var games: [ActiveGame]
}

struct ActiveGame: Codable, Identifiable {
    var id: String { roomCode }
    var roomCode: String
    var players: [Player]
    var lastActivity: String?
    var gameActive: Bool?

    var opponentName: String {
        players.first { $0.symbol != nil }?.username ?? "Unknown"
    }

    var formattedLastActivity: String {
        guard let lastActivity = lastActivity else { return "Unknown" }
        // Parse ISO date string
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let date = formatter.date(from: lastActivity) {
            let relativeFormatter = RelativeDateTimeFormatter()
            relativeFormatter.unitsStyle = .abbreviated
            return relativeFormatter.localizedString(for: date, relativeTo: Date())
        }
        return lastActivity
    }
}

struct DeleteGameResponse: Codable {
    var success: Bool
    var message: String
}

struct ErrorResponse: Codable {
    var message: String
}
