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

    var displaySymbol: String {
        symbol ?? oddsSymbol ?? "?"
    }

    static func == (lhs: Player, rhs: Player) -> Bool {
        lhs.id == rhs.id
    }
}
