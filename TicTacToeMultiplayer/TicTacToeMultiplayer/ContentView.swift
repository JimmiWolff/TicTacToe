import SwiftUI

struct ContentView: View {
    @EnvironmentObject var authViewModel: AuthViewModel
    @EnvironmentObject var gameViewModel: GameViewModel

    var body: some View {
        ZStack {
            // Background gradient matching web app
            LinearGradient(
                gradient: Gradient(colors: [
                    Color(hex: "#667eea"),
                    Color(hex: "#764ba2")
                ]),
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .ignoresSafeArea()

            if authViewModel.isAuthenticated {
                if authViewModel.isGuestMode {
                    // Guest mode: Show banner with option to login for online features
                    VStack(spacing: 0) {
                        // Guest mode banner
                        VStack(spacing: 8) {
                            Text("Guest Mode")
                                .font(.system(size: 16, weight: .semibold))
                                .foregroundColor(.white)
                            Text("Login to access online multiplayer and leaderboards")
                                .font(.system(size: 13))
                                .foregroundColor(.white.opacity(0.8))
                                .multilineTextAlignment(.center)
                            Button(action: {
                                authViewModel.logout()
                            }) {
                                Text("Login Now")
                                    .font(.system(size: 14, weight: .medium))
                                    .foregroundColor(Color(hex: "#667eea"))
                                    .padding(.horizontal, 20)
                                    .padding(.vertical, 8)
                                    .background(Color.white)
                                    .cornerRadius(8)
                            }
                            .padding(.top, 4)
                        }
                        .padding(.vertical, 16)
                        .frame(maxWidth: .infinity)
                        .background(Color.white.opacity(0.15))

                        // Show room selection with features disabled for guests
                        if gameViewModel.currentRoom == nil {
                            RoomSelectionView()
                        } else {
                            GameBoardView()
                        }
                    }
                } else if authViewModel.needsUsername {
                    UsernameSetupView()
                } else if gameViewModel.currentRoom == nil {
                    RoomSelectionView()
                } else {
                    GameBoardView()
                }
            } else {
                LoginView()
            }
        }
        .preferredColorScheme(.dark)
    }
}

// Color extension for hex colors
extension Color {
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let a, r, g, b: UInt64
        switch hex.count {
        case 3: // RGB (12-bit)
            (a, r, g, b) = (255, (int >> 8) * 17, (int >> 4 & 0xF) * 17, (int & 0xF) * 17)
        case 6: // RGB (24-bit)
            (a, r, g, b) = (255, int >> 16, int >> 8 & 0xFF, int & 0xFF)
        case 8: // ARGB (32-bit)
            (a, r, g, b) = (int >> 24, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
        default:
            (a, r, g, b) = (255, 0, 0, 0)
        }
        self.init(
            .sRGB,
            red: Double(r) / 255,
            green: Double(g) / 255,
            blue: Double(b) / 255,
            opacity: Double(a) / 255
        )
    }
}

#Preview {
    ContentView()
        .environmentObject(AuthViewModel())
        .environmentObject(GameViewModel())
}
