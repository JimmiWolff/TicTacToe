import Foundation

class APIService {
    static let shared = APIService()

    private let baseURL = "https://play.tictactoe.dk"

    private init() {}

    // Create a new room and get the room code
    func createRoom() async throws -> String {
        guard let url = URL(string: "\(baseURL)/api/rooms/create") else {
            throw APIError.invalidURL
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        let (data, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse,
              httpResponse.statusCode == 200 else {
            throw APIError.serverError
        }

        let result = try JSONDecoder().decode(CreateRoomResponse.self, from: data)

        guard result.success, let roomCode = result.roomCode else {
            throw APIError.roomCreationFailed
        }

        return roomCode
    }
}

struct CreateRoomResponse: Codable {
    let success: Bool
    let roomCode: String?
    let message: String?
}

enum APIError: Error, LocalizedError {
    case invalidURL
    case serverError
    case roomCreationFailed

    var errorDescription: String? {
        switch self {
        case .invalidURL:
            return "Invalid URL"
        case .serverError:
            return "Server error"
        case .roomCreationFailed:
            return "Failed to create room"
        }
    }
}
