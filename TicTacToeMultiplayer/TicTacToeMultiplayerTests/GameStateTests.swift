import XCTest
@testable import TicTacToeMultiplayer

final class GameStateTests: XCTestCase {

    // MARK: - GameState.empty

    func testEmptyGameStateHasEmptyPlayers() {
        let state = GameState.empty
        XCTAssertTrue(state.players.isEmpty)
    }

    func testEmptyGameStateHasNineCellBoard() {
        let state = GameState.empty
        XCTAssertEqual(state.board.count, 9)
        XCTAssertTrue(state.board.allSatisfy { $0 == "" })
    }

    func testEmptyGameStateStartsWithX() {
        let state = GameState.empty
        XCTAssertEqual(state.currentPlayer, "X")
    }

    func testEmptyGameStateIsNotActive() {
        let state = GameState.empty
        XCTAssertFalse(state.gameActive)
    }

    func testEmptyGameStateHasZeroScores() {
        let state = GameState.empty
        XCTAssertEqual(state.scores.X, 0)
        XCTAssertEqual(state.scores.O, 0)
        XCTAssertEqual(state.scores.draw, 0)
    }

    func testEmptyGameStateHasZeroPiecesPlaced() {
        let state = GameState.empty
        XCTAssertEqual(state.piecesPlaced.X, 0)
        XCTAssertEqual(state.piecesPlaced.O, 0)
    }

    func testEmptyGameStateIsInPlacementPhase() {
        let state = GameState.empty
        XCTAssertEqual(state.gamePhase, "placement")
    }

    func testEmptyGameStateHasMaxThreePieces() {
        let state = GameState.empty
        XCTAssertEqual(state.maxPieces, 3)
    }

    func testEmptyGameStateHasDefaultColors() {
        let state = GameState.empty
        XCTAssertEqual(state.pieceColors?.X, "#e74c3c")
        XCTAssertEqual(state.pieceColors?.O, "#3498db")
    }

    // MARK: - GameState Codable

    func testGameStateDecodesFromJSON() throws {
        let json = """
        {
            "players": [],
            "board": ["", "", "", "", "", "", "", "", ""],
            "currentPlayer": "X",
            "gameActive": true,
            "scores": {"X": 1, "O": 2, "draw": 3},
            "piecesPlaced": {"X": 2, "O": 1},
            "gamePhase": "placement",
            "maxPieces": 3
        }
        """.data(using: .utf8)!

        let state = try JSONDecoder().decode(GameState.self, from: json)
        XCTAssertEqual(state.currentPlayer, "X")
        XCTAssertTrue(state.gameActive)
        XCTAssertEqual(state.scores.X, 1)
        XCTAssertEqual(state.scores.O, 2)
        XCTAssertEqual(state.scores.draw, 3)
        XCTAssertEqual(state.piecesPlaced.X, 2)
        XCTAssertEqual(state.piecesPlaced.O, 1)
        XCTAssertNil(state.pieceColors)
    }

    func testGameStateDecodesWithPieceColors() throws {
        let json = """
        {
            "players": [],
            "board": ["X", "O", "", "", "", "", "", "", ""],
            "currentPlayer": "O",
            "gameActive": true,
            "scores": {"X": 0, "O": 0, "draw": 0},
            "piecesPlaced": {"X": 1, "O": 1},
            "gamePhase": "placement",
            "maxPieces": 3,
            "pieceColors": {"X": "#ff0000", "O": "#0000ff"}
        }
        """.data(using: .utf8)!

        let state = try JSONDecoder().decode(GameState.self, from: json)
        XCTAssertEqual(state.pieceColors?.X, "#ff0000")
        XCTAssertEqual(state.pieceColors?.O, "#0000ff")
    }

    func testGameStateEncodesAndDecodesRoundTrip() throws {
        let original = GameState.empty
        let data = try JSONEncoder().encode(original)
        let decoded = try JSONDecoder().decode(GameState.self, from: data)

        XCTAssertEqual(decoded.currentPlayer, original.currentPlayer)
        XCTAssertEqual(decoded.gameActive, original.gameActive)
        XCTAssertEqual(decoded.board, original.board)
        XCTAssertEqual(decoded.gamePhase, original.gamePhase)
        XCTAssertEqual(decoded.maxPieces, original.maxPieces)
    }

    // MARK: - Scores

    func testScoresDecodesFromJSON() throws {
        let json = """
        {"X": 5, "O": 3, "draw": 2}
        """.data(using: .utf8)!

        let scores = try JSONDecoder().decode(Scores.self, from: json)
        XCTAssertEqual(scores.X, 5)
        XCTAssertEqual(scores.O, 3)
        XCTAssertEqual(scores.draw, 2)
    }

    // MARK: - PiecesPlaced

    func testPiecesPlacedDecodesFromJSON() throws {
        let json = """
        {"X": 3, "O": 2}
        """.data(using: .utf8)!

        let pieces = try JSONDecoder().decode(PiecesPlaced.self, from: json)
        XCTAssertEqual(pieces.X, 3)
        XCTAssertEqual(pieces.O, 2)
    }

    // MARK: - PieceColors

    func testPieceColorsDecodesFromJSON() throws {
        let json = """
        {"X": "#e74c3c", "O": "#3498db"}
        """.data(using: .utf8)!

        let colors = try JSONDecoder().decode(PieceColors.self, from: json)
        XCTAssertEqual(colors.X, "#e74c3c")
        XCTAssertEqual(colors.O, "#3498db")
    }

    // MARK: - GameOverResult

    func testGameOverResultDecodesWinWithPattern() throws {
        let json = """
        {
            "winner": "X",
            "winnerName": "Alice",
            "pattern": [0, 1, 2],
            "board": ["X", "X", "X", "O", "O", "", "", "", ""],
            "scores": {"X": 1, "O": 0, "draw": 0},
            "gamePhase": "placement"
        }
        """.data(using: .utf8)!

        let result = try JSONDecoder().decode(GameOverResult.self, from: json)
        XCTAssertEqual(result.winner, "X")
        XCTAssertEqual(result.winnerName, "Alice")
        XCTAssertEqual(result.pattern, [0, 1, 2])
        XCTAssertNil(result.draw)
    }

    func testGameOverResultDecodesDraw() throws {
        let json = """
        {
            "board": ["X", "O", "X", "X", "O", "O", "O", "X", "X"],
            "scores": {"X": 0, "O": 0, "draw": 1},
            "gamePhase": "placement",
            "draw": true
        }
        """.data(using: .utf8)!

        let result = try JSONDecoder().decode(GameOverResult.self, from: json)
        XCTAssertNil(result.winner)
        XCTAssertNil(result.winnerName)
        XCTAssertNil(result.pattern)
        XCTAssertEqual(result.draw, true)
    }

    // MARK: - RoomJoinedResponse

    func testRoomJoinedResponseDecodes() throws {
        let json = """
        {"success": true, "roomCode": "ABC123", "message": "Joined room"}
        """.data(using: .utf8)!

        let response = try JSONDecoder().decode(RoomJoinedResponse.self, from: json)
        XCTAssertTrue(response.success)
        XCTAssertEqual(response.roomCode, "ABC123")
        XCTAssertEqual(response.message, "Joined room")
    }

    // MARK: - LoginResponse

    func testLoginResponseDecodesWithAllFields() throws {
        let json = """
        {
            "success": true,
            "message": "Logged in",
            "needsRoom": true,
            "username": "Alice",
            "roomCode": "ROOM1"
        }
        """.data(using: .utf8)!

        let response = try JSONDecoder().decode(LoginResponse.self, from: json)
        XCTAssertTrue(response.success)
        XCTAssertEqual(response.needsRoom, true)
        XCTAssertEqual(response.username, "Alice")
        XCTAssertEqual(response.roomCode, "ROOM1")
    }

    func testLoginResponseDecodesWithMinimalFields() throws {
        let json = """
        {"success": false, "message": "Auth failed"}
        """.data(using: .utf8)!

        let response = try JSONDecoder().decode(LoginResponse.self, from: json)
        XCTAssertFalse(response.success)
        XCTAssertNil(response.needsRoom)
        XCTAssertNil(response.username)
        XCTAssertNil(response.player)
        XCTAssertNil(response.roomCode)
    }

    // MARK: - UsernameChangedResponse

    func testUsernameChangedResponseDecodes() throws {
        let json = """
        {"success": true, "newUsername": "Bob", "message": "Username updated"}
        """.data(using: .utf8)!

        let response = try JSONDecoder().decode(UsernameChangedResponse.self, from: json)
        XCTAssertTrue(response.success)
        XCTAssertEqual(response.newUsername, "Bob")
    }

    func testUsernameChangedResponseDecodesWithoutNewUsername() throws {
        let json = """
        {"success": false, "message": "Username taken"}
        """.data(using: .utf8)!

        let response = try JSONDecoder().decode(UsernameChangedResponse.self, from: json)
        XCTAssertFalse(response.success)
        XCTAssertNil(response.newUsername)
    }

    // MARK: - ColorChangedResponse

    func testColorChangedResponseDecodes() throws {
        let json = """
        {"piece": "X", "color": "#ff0000"}
        """.data(using: .utf8)!

        let response = try JSONDecoder().decode(ColorChangedResponse.self, from: json)
        XCTAssertEqual(response.piece, "X")
        XCTAssertEqual(response.color, "#ff0000")
    }

    // MARK: - LeaderboardEntry custom decoder

    func testLeaderboardEntryDecodesWithDoubleWinRate() throws {
        let json = """
        {
            "username": "Alice",
            "wins": 10,
            "losses": 5,
            "draws": 2,
            "winRate": 58.8
        }
        """.data(using: .utf8)!

        let entry = try JSONDecoder().decode(LeaderboardEntry.self, from: json)
        XCTAssertEqual(entry.username, "Alice")
        XCTAssertEqual(entry.wins, 10)
        XCTAssertEqual(entry.losses, 5)
        XCTAssertEqual(entry.draws, 2)
        XCTAssertEqual(entry.winRate, 58.8, accuracy: 0.01)
    }

    func testLeaderboardEntryDecodesWithIntWinRate() throws {
        let json = """
        {
            "username": "Bob",
            "wins": 5,
            "losses": 0,
            "draws": 0,
            "winRate": 100
        }
        """.data(using: .utf8)!

        let entry = try JSONDecoder().decode(LeaderboardEntry.self, from: json)
        XCTAssertEqual(entry.winRate, 100.0, accuracy: 0.01)
    }

    func testLeaderboardEntryDecodesWithNullWinRate() throws {
        let json = """
        {
            "username": "Charlie",
            "wins": 0,
            "losses": 0,
            "draws": 0,
            "winRate": null
        }
        """.data(using: .utf8)!

        let entry = try JSONDecoder().decode(LeaderboardEntry.self, from: json)
        XCTAssertEqual(entry.winRate, 0.0)
    }

    func testLeaderboardEntryDecodesWithMissingWinRate() throws {
        let json = """
        {
            "username": "Dave",
            "wins": 0,
            "losses": 0,
            "draws": 0
        }
        """.data(using: .utf8)!

        let entry = try JSONDecoder().decode(LeaderboardEntry.self, from: json)
        XCTAssertEqual(entry.winRate, 0.0)
    }

    func testLeaderboardEntryDefaultsUsernameToUnknown() throws {
        let json = """
        {
            "wins": 1,
            "losses": 0,
            "draws": 0,
            "winRate": 100
        }
        """.data(using: .utf8)!

        let entry = try JSONDecoder().decode(LeaderboardEntry.self, from: json)
        XCTAssertEqual(entry.username, "Unknown")
    }

    func testLeaderboardEntryDefaultsMissingStatsToZero() throws {
        let json = """
        {
            "username": "Eve"
        }
        """.data(using: .utf8)!

        let entry = try JSONDecoder().decode(LeaderboardEntry.self, from: json)
        XCTAssertEqual(entry.wins, 0)
        XCTAssertEqual(entry.losses, 0)
        XCTAssertEqual(entry.draws, 0)
        XCTAssertEqual(entry.winRate, 0.0)
    }

    // MARK: - LeaderboardEntry id computed property

    func testLeaderboardEntryIdUsesOddsIdFirst() throws {
        let json = """
        {
            "_id": "mongo123",
            "oddsUsername": "alt",
            "username": "Alice",
            "wins": 0, "losses": 0, "draws": 0, "winRate": 0
        }
        """.data(using: .utf8)!

        let entry = try JSONDecoder().decode(LeaderboardEntry.self, from: json)
        XCTAssertEqual(entry.id, "mongo123")
    }

    func testLeaderboardEntryIdFallsBackToOddsUsername() throws {
        let json = """
        {
            "oddsUsername": "alt_name",
            "username": "Alice",
            "wins": 0, "losses": 0, "draws": 0, "winRate": 0
        }
        """.data(using: .utf8)!

        let entry = try JSONDecoder().decode(LeaderboardEntry.self, from: json)
        XCTAssertEqual(entry.id, "alt_name")
    }

    func testLeaderboardEntryIdFallsBackToUsername() throws {
        let json = """
        {
            "username": "Alice",
            "wins": 0, "losses": 0, "draws": 0, "winRate": 0
        }
        """.data(using: .utf8)!

        let entry = try JSONDecoder().decode(LeaderboardEntry.self, from: json)
        XCTAssertEqual(entry.id, "Alice")
    }

    // MARK: - HighscoresResponse

    func testHighscoresResponseDecodesTopPlayers() throws {
        let json = """
        {
            "topPlayers": [
                {"username": "Alice", "wins": 10, "losses": 2, "draws": 1, "winRate": 76.9},
                {"username": "Bob", "wins": 5, "losses": 5, "draws": 0, "winRate": 50.0}
            ]
        }
        """.data(using: .utf8)!

        let response = try JSONDecoder().decode(HighscoresResponse.self, from: json)
        XCTAssertEqual(response.topPlayers.count, 2)
        XCTAssertEqual(response.topPlayers[0].username, "Alice")
        XCTAssertEqual(response.topPlayers[1].username, "Bob")
    }

    // MARK: - PlayerStats

    func testPlayerStatsEmptyHasZeroValues() {
        let stats = PlayerStats.empty
        XCTAssertEqual(stats.wins, 0)
        XCTAssertEqual(stats.losses, 0)
        XCTAssertEqual(stats.draws, 0)
        XCTAssertEqual(stats.winRate, 0.0)
    }

    func testPlayerStatsDecodesWithIntWinRate() throws {
        let json = """
        {"wins": 10, "losses": 5, "draws": 3, "winRate": 55}
        """.data(using: .utf8)!

        let stats = try JSONDecoder().decode(PlayerStats.self, from: json)
        XCTAssertEqual(stats.winRate, 55.0, accuracy: 0.01)
    }

    func testPlayerStatsDecodesWithDoubleWinRate() throws {
        let json = """
        {"wins": 7, "losses": 3, "draws": 1, "winRate": 63.6}
        """.data(using: .utf8)!

        let stats = try JSONDecoder().decode(PlayerStats.self, from: json)
        XCTAssertEqual(stats.winRate, 63.6, accuracy: 0.01)
    }

    func testPlayerStatsDecodesWithNullWinRate() throws {
        let json = """
        {"wins": 0, "losses": 0, "draws": 0, "winRate": null}
        """.data(using: .utf8)!

        let stats = try JSONDecoder().decode(PlayerStats.self, from: json)
        XCTAssertEqual(stats.winRate, 0.0)
    }

    func testPlayerStatsDecodesWithMissingFields() throws {
        let json = """
        {}
        """.data(using: .utf8)!

        let stats = try JSONDecoder().decode(PlayerStats.self, from: json)
        XCTAssertEqual(stats.wins, 0)
        XCTAssertEqual(stats.losses, 0)
        XCTAssertEqual(stats.draws, 0)
        XCTAssertEqual(stats.winRate, 0.0)
    }

    func testPlayerStatsMemberInit() {
        let stats = PlayerStats(wins: 10, losses: 5, draws: 2, winRate: 58.8)
        XCTAssertEqual(stats.wins, 10)
        XCTAssertEqual(stats.losses, 5)
        XCTAssertEqual(stats.draws, 2)
        XCTAssertEqual(stats.winRate, 58.8, accuracy: 0.01)
    }

    // MARK: - PlayerStatsResponse

    func testPlayerStatsResponseDecodesWithStats() throws {
        let json = """
        {"stats": {"wins": 5, "losses": 3, "draws": 1, "winRate": 55.5}}
        """.data(using: .utf8)!

        let response = try JSONDecoder().decode(PlayerStatsResponse.self, from: json)
        XCTAssertNotNil(response.stats)
        XCTAssertEqual(response.stats?.wins, 5)
    }

    func testPlayerStatsResponseDecodesWithNullStats() throws {
        let json = """
        {"stats": null}
        """.data(using: .utf8)!

        let response = try JSONDecoder().decode(PlayerStatsResponse.self, from: json)
        XCTAssertNil(response.stats)
    }

    // MARK: - ActiveGame

    func testActiveGameIdIsRoomCode() throws {
        let json = """
        {
            "roomCode": "ABC123",
            "players": [],
            "gameActive": true
        }
        """.data(using: .utf8)!

        let game = try JSONDecoder().decode(ActiveGame.self, from: json)
        XCTAssertEqual(game.id, "ABC123")
    }

    func testActiveGameOpponentNameFindsPlayerWithSymbol() throws {
        let json = """
        {
            "roomCode": "ROOM1",
            "players": [
                {"username": "Alice", "symbol": "X"},
                {"username": "Bob"}
            ]
        }
        """.data(using: .utf8)!

        let game = try JSONDecoder().decode(ActiveGame.self, from: json)
        XCTAssertEqual(game.opponentName, "Alice")
    }

    func testActiveGameOpponentNameReturnsUnknownWhenNoSymbol() throws {
        let json = """
        {
            "roomCode": "ROOM1",
            "players": [
                {"username": "Alice"},
                {"username": "Bob"}
            ]
        }
        """.data(using: .utf8)!

        let game = try JSONDecoder().decode(ActiveGame.self, from: json)
        XCTAssertEqual(game.opponentName, "Unknown")
    }

    func testActiveGameOpponentNameReturnsUnknownWhenNoPlayers() throws {
        let json = """
        {
            "roomCode": "ROOM1",
            "players": []
        }
        """.data(using: .utf8)!

        let game = try JSONDecoder().decode(ActiveGame.self, from: json)
        XCTAssertEqual(game.opponentName, "Unknown")
    }

    func testActiveGameFormattedLastActivityWithNilReturnsUnknown() throws {
        let json = """
        {
            "roomCode": "ROOM1",
            "players": []
        }
        """.data(using: .utf8)!

        let game = try JSONDecoder().decode(ActiveGame.self, from: json)
        XCTAssertEqual(game.formattedLastActivity, "Unknown")
    }

    func testActiveGameFormattedLastActivityWithValidISO8601() throws {
        let json = """
        {
            "roomCode": "ROOM1",
            "players": [],
            "lastActivity": "2020-01-01T00:00:00.000Z"
        }
        """.data(using: .utf8)!

        let game = try JSONDecoder().decode(ActiveGame.self, from: json)
        // Should return a relative time string (not "Unknown" and not the raw ISO string)
        XCTAssertNotEqual(game.formattedLastActivity, "Unknown")
        XCTAssertNotEqual(game.formattedLastActivity, "2020-01-01T00:00:00.000Z")
    }

    func testActiveGameFormattedLastActivityWithInvalidDateReturnsRawString() throws {
        let json = """
        {
            "roomCode": "ROOM1",
            "players": [],
            "lastActivity": "not-a-date"
        }
        """.data(using: .utf8)!

        let game = try JSONDecoder().decode(ActiveGame.self, from: json)
        XCTAssertEqual(game.formattedLastActivity, "not-a-date")
    }

    // MARK: - MyGamesResponse

    func testMyGamesResponseDecodes() throws {
        let json = """
        {
            "games": [
                {"roomCode": "ROOM1", "players": [], "gameActive": true},
                {"roomCode": "ROOM2", "players": [], "gameActive": false}
            ]
        }
        """.data(using: .utf8)!

        let response = try JSONDecoder().decode(MyGamesResponse.self, from: json)
        XCTAssertEqual(response.games.count, 2)
        XCTAssertEqual(response.games[0].roomCode, "ROOM1")
        XCTAssertEqual(response.games[1].roomCode, "ROOM2")
    }

    // MARK: - DeleteGameResponse

    func testDeleteGameResponseDecodes() throws {
        let json = """
        {"success": true, "message": "Game deleted"}
        """.data(using: .utf8)!

        let response = try JSONDecoder().decode(DeleteGameResponse.self, from: json)
        XCTAssertTrue(response.success)
        XCTAssertEqual(response.message, "Game deleted")
    }

    // MARK: - ErrorResponse

    func testErrorResponseDecodes() throws {
        let json = """
        {"message": "Something went wrong"}
        """.data(using: .utf8)!

        let response = try JSONDecoder().decode(ErrorResponse.self, from: json)
        XCTAssertEqual(response.message, "Something went wrong")
    }
}
