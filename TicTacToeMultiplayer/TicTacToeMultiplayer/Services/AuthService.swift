import Foundation
import Auth0
import Combine
import Security
import AuthenticationServices

class AuthService: ObservableObject {
    static let shared = AuthService()

    @Published var isAuthenticated = false
    @Published var userProfile: UserInfo?
    @Published var accessToken: String?
    @Published var userId: String?
    @Published var errorMessage: String?
    @Published var authProvider: String = "auth0" // "auth0" or "apple"

    private let credentialsManager: CredentialsManager

    private init() {
        credentialsManager = CredentialsManager(authentication: Auth0.authentication())

        // Check for existing credentials
        loadCredentials()
    }

    // MARK: - Authentication

    func login() async {
        do {
            let credentials = try await Auth0
                .webAuth()
                .scope("openid profile email")
                .start()

            await MainActor.run {
                self.handleCredentials(credentials, provider: "auth0")
            }
        } catch {
            await MainActor.run {
                self.errorMessage = "Login failed: \(error.localizedDescription)"
                print("Auth0 login error: \(error)")
            }
        }
    }

    func loginWithApple(authorization: ASAuthorization) async {
        guard let appleIDCredential = authorization.credential as? ASAuthorizationAppleIDCredential,
              let identityToken = appleIDCredential.identityToken,
              let tokenString = String(data: identityToken, encoding: .utf8) else {
            await MainActor.run {
                self.errorMessage = "Failed to get Apple ID token"
            }
            return
        }

        await MainActor.run {
            // Store Apple token and user info
            self.accessToken = tokenString
            self.userId = appleIDCredential.user
            self.authProvider = "apple"
            self.isAuthenticated = true

            // Extract email if available (only provided on first sign-in)
            if let email = appleIDCredential.email {
                // Store email for later use
                UserDefaults.standard.set(email, forKey: "apple_user_email")
            }

            print("AuthService: Apple Sign In successful, userId: \(appleIDCredential.user)")
        }
    }

    func logout() async {
        do {
            if authProvider == "auth0" {
                try await Auth0.webAuth().clearSession()
            }
            // For Apple, just clear local credentials
            await MainActor.run {
                self.clearCredentials()
            }
        } catch {
            await MainActor.run {
                self.errorMessage = "Logout failed: \(error.localizedDescription)"
                print("Logout error: \(error)")
            }
        }
    }

    // MARK: - Credentials Management

    private func handleCredentials(_ credentials: Credentials, provider: String) {
        _ = credentialsManager.store(credentials: credentials)
        // Use ID token for socket authentication (always a JWT)
        // Access token without audience is opaque and can't be decoded
        let token = credentials.idToken
        print("AuthService: Setting ID token, length: \(token.count)")
        accessToken = token
        userId = decodeUserId(from: token)
        authProvider = provider
        print("AuthService: Decoded userId: \(userId ?? "nil"), provider: \(provider)")
        isAuthenticated = true

        // Fetch user profile
        Task {
            await fetchUserProfile()
        }
    }

    private func loadCredentials() {
        guard credentialsManager.hasValid() else {
            isAuthenticated = false
            return
        }

        credentialsManager.credentials { [weak self] result in
            DispatchQueue.main.async {
                switch result {
                case .success(let credentials):
                    // Use ID token for socket authentication (always a JWT)
                    self?.accessToken = credentials.idToken
                    self?.userId = self?.decodeUserId(from: credentials.idToken)
                    self?.authProvider = "auth0" // Credentials manager only stores Auth0 credentials
                    self?.isAuthenticated = true
                    Task {
                        await self?.fetchUserProfile()
                    }
                case .failure(let error):
                    print("Failed to load credentials: \(error)")
                    self?.isAuthenticated = false
                }
            }
        }
    }

    private func clearCredentials() {
        _ = credentialsManager.clear()
        accessToken = nil
        userId = nil
        userProfile = nil
        authProvider = "auth0"
        isAuthenticated = false
        clearSavedUsername()
    }

    private func fetchUserProfile() async {
        guard let token = accessToken else { return }

        do {
            let profile = try await Auth0
                .authentication()
                .userInfo(withAccessToken: token)
                .start()

            await MainActor.run {
                self.userProfile = profile
                if self.userId == nil {
                    self.userId = profile.sub
                }
            }
        } catch {
            print("Failed to fetch user profile: \(error)")
        }
    }

    private func decodeUserId(from idToken: String) -> String? {
        let parts = idToken.split(separator: ".")
        guard parts.count >= 2 else { return nil }

        var payload = String(parts[1])
        // Pad to multiple of 4
        while payload.count % 4 != 0 {
            payload += "="
        }

        guard let data = Data(base64Encoded: payload),
              let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let sub = json["sub"] as? String else {
            return nil
        }
        return sub
    }

    // MARK: - Username Persistence

    private let usernameKey = "tictactoe_username"

    var savedUsername: String? {
        get { UserDefaults.standard.string(forKey: usernameKey) }
        set { UserDefaults.standard.set(newValue, forKey: usernameKey) }
    }

    func saveUsername(_ username: String) {
        savedUsername = username
    }

    private func clearSavedUsername() {
        UserDefaults.standard.removeObject(forKey: usernameKey)
    }

    // MARK: - Token Refresh

    func getValidToken() async -> String? {
        guard credentialsManager.hasValid() else {
            return nil
        }

        return await withCheckedContinuation { continuation in
            credentialsManager.credentials { result in
                switch result {
                case .success(let credentials):
                    // Use ID token for socket authentication
                    continuation.resume(returning: credentials.idToken)
                case .failure:
                    continuation.resume(returning: nil)
                }
            }
        }
    }
}
