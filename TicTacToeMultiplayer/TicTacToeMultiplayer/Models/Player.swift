import Foundation

struct Player: Codable, Identifiable, Equatable {
    var id: String { oddsId ?? oddsSocketId ?? socketId ?? oddsUserId ?? oddsSymbol ?? symbol ?? UUID().uuidString }
    var oddsId: String?
    var oddsSocketId: String?
    var socketId: String?
    var username: String
    var symbol: String?
    var oddsSymbol: String?
    var oddsUserId: String?
    var userId: String?
    var email: String?
    var authType: String?
    var loginTime: String?
    var lastSeen: String?
    var isReady: Bool?

    enum CodingKeys: String, CodingKey {
        case oddsId = "_id"
        case oddsSocketId
        case socketId
        case username
        case symbol
        case oddsSymbol
        case oddsUserId
        case userId
        case email
        case authType
        case loginTime
        case lastSeen
        case isReady
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        oddsId = try container.decodeIfPresent(String.self, forKey: .oddsId)
        oddsSocketId = try container.decodeIfPresent(String.self, forKey: .oddsSocketId)
        socketId = try container.decodeIfPresent(String.self, forKey: .socketId)
        username = try container.decodeIfPresent(String.self, forKey: .username) ?? "Unknown"
        symbol = try container.decodeIfPresent(String.self, forKey: .symbol)
        oddsSymbol = try container.decodeIfPresent(String.self, forKey: .oddsSymbol)
        oddsUserId = try container.decodeIfPresent(String.self, forKey: .oddsUserId)
        userId = try container.decodeIfPresent(String.self, forKey: .userId)
        email = try container.decodeIfPresent(String.self, forKey: .email)
        authType = try container.decodeIfPresent(String.self, forKey: .authType)
        loginTime = try container.decodeIfPresent(String.self, forKey: .loginTime)
        lastSeen = try container.decodeIfPresent(String.self, forKey: .lastSeen)
        isReady = try container.decodeIfPresent(Bool.self, forKey: .isReady)
    }

    init(
        oddsId: String? = nil,
        oddsSocketId: String? = nil,
        socketId: String? = nil,
        username: String = "Unknown",
        symbol: String? = nil,
        oddsSymbol: String? = nil,
        oddsUserId: String? = nil,
        userId: String? = nil,
        email: String? = nil,
        authType: String? = nil,
        loginTime: String? = nil,
        lastSeen: String? = nil,
        isReady: Bool? = nil
    ) {
        self.oddsId = oddsId
        self.oddsSocketId = oddsSocketId
        self.socketId = socketId
        self.username = username
        self.symbol = symbol
        self.oddsSymbol = oddsSymbol
        self.oddsUserId = oddsUserId
        self.userId = userId
        self.email = email
        self.authType = authType
        self.loginTime = loginTime
        self.lastSeen = lastSeen
        self.isReady = isReady
    }

    var displaySymbol: String {
        symbol ?? oddsSymbol ?? "?"
    }

    static func == (lhs: Player, rhs: Player) -> Bool {
        lhs.id == rhs.id
    }
}
