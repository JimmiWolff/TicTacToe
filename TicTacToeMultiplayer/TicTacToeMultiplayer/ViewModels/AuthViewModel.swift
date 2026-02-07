import Foundation
import Combine
import AuthenticationServices

@MainActor
class AuthViewModel: ObservableObject {
    @Published var isAuthenticated = false
    @Published var isSocketAuthenticated = false
    @Published var needsUsername = false
    @Published var username: String = ""
    @Published var userId: String?
    @Published var isLoading = false
    @Published var errorMessage: String?

    private let authService = AuthService.shared
    private let socketService = SocketService.shared
    private var cancellables = Set<AnyCancellable>()

    init() {
        setupBindings()
        checkExistingSession()
    }

    private func setupBindings() {
        // Listen for auth service changes
        authService.$isAuthenticated
            .receive(on: DispatchQueue.main)
            .sink { [weak self] isAuth in
                self?.isAuthenticated = isAuth
                if isAuth {
                    self?.checkUsername()
                    self?.connectSocket()
                }
            }
            .store(in: &cancellables)

        // Listen for socket connection and authenticate immediately
        socketService.connectionStatus
            .receive(on: DispatchQueue.main)
            .sink { [weak self] (isConnected: Bool) in
                print("AuthViewModel: Socket connection status changed: \(isConnected)")
                if isConnected {
                    self?.authenticateSocket()
                } else {
                    self?.isSocketAuthenticated = false
                }
            }
            .store(in: &cancellables)

        // Also listen for access token changes - authenticate when token becomes available
        authService.$accessToken
            .receive(on: DispatchQueue.main)
            .sink { [weak self] (token: String?) in
                print("AuthViewModel: Token changed, hasToken: \(token != nil), socketConnected: \(self?.socketService.isConnected ?? false), socketAuth: \(self?.isSocketAuthenticated ?? false)")
                if token != nil && self?.socketService.isConnected == true && self?.isSocketAuthenticated == false {
                    print("AuthViewModel: Triggering authentication from token change")
                    self?.authenticateSocket()
                }
            }
            .store(in: &cancellables)

        authService.$userId
            .receive(on: DispatchQueue.main)
            .assign(to: &$userId)

        authService.$errorMessage
            .receive(on: DispatchQueue.main)
            .sink { [weak self] error in
                if let error = error {
                    self?.errorMessage = error
                    self?.isLoading = false
                }
            }
            .store(in: &cancellables)

        // Listen for login response from socket
        socketService.loginResponse
            .receive(on: DispatchQueue.main)
            .sink { [weak self] response in
                print("AuthViewModel: Received loginResponse - success: \(response.success), message: \(response.message ?? "nil")")
                self?.isLoading = false
                if response.success {
                    self?.isSocketAuthenticated = true
                    print("AuthViewModel: Socket authenticated successfully")
                    if let newUsername = response.username {
                        self?.username = newUsername
                        self?.authService.saveUsername(newUsername)
                    }
                    self?.needsUsername = false
                } else {
                    self?.errorMessage = response.message
                    print("AuthViewModel: Socket authentication failed: \(response.message ?? "unknown error")")
                }
            }
            .store(in: &cancellables)

        // Listen for username changes
        socketService.usernameChanged
            .receive(on: DispatchQueue.main)
            .sink { [weak self] response in
                if response.success, let newUsername = response.newUsername {
                    self?.username = newUsername
                    self?.authService.saveUsername(newUsername)
                } else {
                    self?.errorMessage = response.message
                }
            }
            .store(in: &cancellables)
    }

    private func checkExistingSession() {
        print("AuthViewModel: Checking existing session, isAuthenticated: \(authService.isAuthenticated)")
        if authService.isAuthenticated {
            isAuthenticated = true
            checkUsername()
            connectSocket()
        }
    }

    private func checkUsername() {
        if let savedUsername = authService.savedUsername {
            username = savedUsername
            needsUsername = false
        } else {
            needsUsername = true
        }
    }

    private func connectSocket() {
        print("AuthViewModel: connectSocket called, isConnected: \(socketService.isConnected)")
        if !socketService.isConnected {
            print("AuthViewModel: Connecting socket...")
            socketService.connect()
        }
    }

    // MARK: - Actions

    func login() {
        isLoading = true
        errorMessage = nil

        Task {
            await authService.login()
            if authService.isAuthenticated {
                connectSocket()
            }
        }
    }

    func logout() {
        isLoading = true

        Task {
            socketService.disconnect()
            await authService.logout()
            isLoading = false
            isSocketAuthenticated = false
            needsUsername = false
            username = ""
        }
    }

    func setUsername(_ newUsername: String) {
        guard !newUsername.isEmpty else {
            errorMessage = "Username cannot be empty"
            return
        }

        let trimmed = newUsername.trimmingCharacters(in: .whitespacesAndNewlines)

        guard trimmed.count >= 2, trimmed.count <= 20 else {
            errorMessage = "Username must be between 2 and 20 characters"
            return
        }

        guard trimmed.range(of: "^[a-zA-Z0-9\\s_-]+$", options: .regularExpression) != nil else {
            errorMessage = "Username can only contain letters, numbers, spaces, hyphens, and underscores"
            return
        }

        username = trimmed
        authService.saveUsername(trimmed)
        needsUsername = false
        errorMessage = nil

        // Login to socket with custom username
        if let token = authService.accessToken {
            socketService.login(token: token, customUsername: trimmed)
        }
    }

    func changeUsername(_ newUsername: String) {
        socketService.changeUsername(newUsername: newUsername)
    }

    func authenticateSocket() {
        guard let token = authService.accessToken else {
            print("AuthViewModel: No token available for socket authentication")
            return
        }
        print("AuthViewModel: Sending socket login with username: \(username.isEmpty ? "nil" : username)")
        socketService.login(token: token, customUsername: username.isEmpty ? nil : username)
    }

    func handleAppleSignIn(_ result: Result<ASAuthorization, Error>) {
        isLoading = true
        errorMessage = nil

        Task {
            switch result {
            case .success(let authorization):
                await authService.loginWithApple(authorization: authorization)
                if authService.isAuthenticated {
                    connectSocket()
                }
            case .failure(let error):
                errorMessage = "Apple Sign In failed: \(error.localizedDescription)"
                print("Apple Sign In error: \(error)")
            }
            isLoading = false
        }
    }
}
