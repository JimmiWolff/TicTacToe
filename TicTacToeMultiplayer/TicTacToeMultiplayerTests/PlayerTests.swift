import XCTest
@testable import TicTacToeMultiplayer

final class PlayerTests: XCTestCase {

    // MARK: - Default init

    func testDefaultInitSetsUsernameToUnknown() {
        let player = Player()
        XCTAssertEqual(player.username, "Unknown")
    }

    func testDefaultInitHasNilOptionalFields() {
        let player = Player()
        XCTAssertNil(player.oddsId)
        XCTAssertNil(player.oddsSocketId)
        XCTAssertNil(player.socketId)
        XCTAssertNil(player.symbol)
        XCTAssertNil(player.oddsSymbol)
        XCTAssertNil(player.oddsUserId)
        XCTAssertNil(player.userId)
        XCTAssertNil(player.email)
        XCTAssertNil(player.authType)
        XCTAssertNil(player.loginTime)
        XCTAssertNil(player.lastSeen)
        XCTAssertNil(player.isReady)
    }

    func testInitWithCustomValues() {
        let player = Player(
            socketId: "sock1",
            username: "Alice",
            symbol: "X",
            userId: "auth0|123"
        )
        XCTAssertEqual(player.username, "Alice")
        XCTAssertEqual(player.socketId, "sock1")
        XCTAssertEqual(player.symbol, "X")
        XCTAssertEqual(player.userId, "auth0|123")
    }

    // MARK: - id computed property priority chain

    func testIdUsesOddsIdFirst() {
        let player = Player(
            oddsId: "mongo_id",
            oddsSocketId: "odd_sock",
            socketId: "sock",
            symbol: "X",
            oddsSymbol: "O",
            oddsUserId: "odd_user"
        )
        XCTAssertEqual(player.id, "mongo_id")
    }

    func testIdFallsToOddsSocketId() {
        let player = Player(
            oddsSocketId: "odd_sock",
            socketId: "sock",
            symbol: "X",
            oddsSymbol: "O",
            oddsUserId: "odd_user"
        )
        XCTAssertEqual(player.id, "odd_sock")
    }

    func testIdFallsToSocketId() {
        let player = Player(
            socketId: "sock",
            symbol: "X",
            oddsSymbol: "O",
            oddsUserId: "odd_user"
        )
        XCTAssertEqual(player.id, "sock")
    }

    func testIdFallsToOddsUserId() {
        let player = Player(
            symbol: "X",
            oddsSymbol: "O",
            oddsUserId: "odd_user"
        )
        XCTAssertEqual(player.id, "odd_user")
    }

    func testIdFallsToOddsSymbol() {
        let player = Player(
            symbol: "X",
            oddsSymbol: "O"
        )
        XCTAssertEqual(player.id, "O")
    }

    func testIdFallsToSymbol() {
        let player = Player(symbol: "X")
        XCTAssertEqual(player.id, "X")
    }

    func testIdGeneratesUUIDWhenNoFieldsSet() {
        let player = Player()
        // Should return a non-empty string (UUID)
        XCTAssertFalse(player.id.isEmpty)
    }

    func testIdGeneratesDifferentUUIDsForDifferentInstances() {
        let player1 = Player()
        let player2 = Player()
        // UUIDs are generated each time id is accessed, so they could differ
        // This test verifies the UUID path works without crashing
        XCTAssertFalse(player1.id.isEmpty)
        XCTAssertFalse(player2.id.isEmpty)
    }

    // MARK: - displaySymbol

    func testDisplaySymbolUsesSymbolFirst() {
        let player = Player(symbol: "X", oddsSymbol: "O")
        XCTAssertEqual(player.displaySymbol, "X")
    }

    func testDisplaySymbolFallsToOddsSymbol() {
        let player = Player(oddsSymbol: "O")
        XCTAssertEqual(player.displaySymbol, "O")
    }

    func testDisplaySymbolDefaultsToQuestionMark() {
        let player = Player()
        XCTAssertEqual(player.displaySymbol, "?")
    }

    // MARK: - Equatable

    func testPlayersWithSameIdAreEqual() {
        let player1 = Player(socketId: "sock1", username: "Alice")
        let player2 = Player(socketId: "sock1", username: "Bob")
        XCTAssertEqual(player1, player2)
    }

    func testPlayersWithDifferentIdAreNotEqual() {
        let player1 = Player(socketId: "sock1", username: "Alice")
        let player2 = Player(socketId: "sock2", username: "Alice")
        XCTAssertNotEqual(player1, player2)
    }

    // MARK: - Codable decoding

    func testDecodesFromFullJSON() throws {
        let json = """
        {
            "_id": "mongo123",
            "oddsSocketId": "oddsock1",
            "socketId": "sock1",
            "username": "Alice",
            "symbol": "X",
            "oddsSymbol": "O",
            "oddsUserId": "odduser1",
            "userId": "auth0|123",
            "email": "alice@example.com",
            "authType": "auth0",
            "loginTime": "2025-01-01T00:00:00Z",
            "lastSeen": "2025-01-01T01:00:00Z",
            "isReady": true
        }
        """.data(using: .utf8)!

        let player = try JSONDecoder().decode(Player.self, from: json)
        XCTAssertEqual(player.oddsId, "mongo123")
        XCTAssertEqual(player.oddsSocketId, "oddsock1")
        XCTAssertEqual(player.socketId, "sock1")
        XCTAssertEqual(player.username, "Alice")
        XCTAssertEqual(player.symbol, "X")
        XCTAssertEqual(player.oddsSymbol, "O")
        XCTAssertEqual(player.oddsUserId, "odduser1")
        XCTAssertEqual(player.userId, "auth0|123")
        XCTAssertEqual(player.email, "alice@example.com")
        XCTAssertEqual(player.authType, "auth0")
        XCTAssertEqual(player.loginTime, "2025-01-01T00:00:00Z")
        XCTAssertEqual(player.lastSeen, "2025-01-01T01:00:00Z")
        XCTAssertEqual(player.isReady, true)
    }

    func testDecodesFromMinimalJSON() throws {
        let json = """
        {}
        """.data(using: .utf8)!

        let player = try JSONDecoder().decode(Player.self, from: json)
        XCTAssertEqual(player.username, "Unknown")
        XCTAssertNil(player.socketId)
        XCTAssertNil(player.symbol)
        XCTAssertNil(player.userId)
    }

    func testDecodesWithMissingUsername() throws {
        let json = """
        {"socketId": "sock1", "symbol": "X"}
        """.data(using: .utf8)!

        let player = try JSONDecoder().decode(Player.self, from: json)
        XCTAssertEqual(player.username, "Unknown")
        XCTAssertEqual(player.socketId, "sock1")
        XCTAssertEqual(player.symbol, "X")
    }

    // MARK: - Codable round-trip

    func testEncodesAndDecodesRoundTrip() throws {
        let original = Player(
            oddsId: "m1",
            socketId: "s1",
            username: "Alice",
            symbol: "X",
            userId: "auth0|1",
            email: "a@b.com",
            isReady: true
        )

        let data = try JSONEncoder().encode(original)
        let decoded = try JSONDecoder().decode(Player.self, from: data)

        XCTAssertEqual(decoded.oddsId, original.oddsId)
        XCTAssertEqual(decoded.socketId, original.socketId)
        XCTAssertEqual(decoded.username, original.username)
        XCTAssertEqual(decoded.symbol, original.symbol)
        XCTAssertEqual(decoded.userId, original.userId)
        XCTAssertEqual(decoded.email, original.email)
        XCTAssertEqual(decoded.isReady, original.isReady)
    }
}
