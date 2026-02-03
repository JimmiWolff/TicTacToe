import SwiftUI

struct LoginView: View {
    @EnvironmentObject var authViewModel: AuthViewModel

    var body: some View {
        VStack(spacing: 30) {
            Spacer()

            // Logo/Title
            VStack(spacing: 4) {
                Text("The Wolff")
                    .font(.system(size: 20, weight: .medium, design: .rounded))
                    .foregroundColor(.white.opacity(0.8))
                Text("Tic Tac Toe")
                    .font(.system(size: 42, weight: .bold, design: .rounded))
                    .foregroundColor(.white)
            }

            // Game preview icon
            VStack(spacing: 8) {
                HStack(spacing: 8) {
                    ForEach(0..<3) { col in
                        RoundedRectangle(cornerRadius: 8)
                            .fill(.white.opacity(0.1))
                            .frame(width: 50, height: 50)
                            .overlay {
                                if col == 0 {
                                    Text("X")
                                        .font(.system(size: 28, weight: .bold))
                                        .foregroundColor(Color(hex: "#e74c3c"))
                                } else if col == 1 {
                                    Text("O")
                                        .font(.system(size: 28, weight: .bold))
                                        .foregroundColor(Color(hex: "#3498db"))
                                }
                            }
                    }
                }
                HStack(spacing: 8) {
                    ForEach(0..<3) { col in
                        RoundedRectangle(cornerRadius: 8)
                            .fill(.white.opacity(0.1))
                            .frame(width: 50, height: 50)
                            .overlay {
                                if col == 1 {
                                    Text("X")
                                        .font(.system(size: 28, weight: .bold))
                                        .foregroundColor(Color(hex: "#e74c3c"))
                                }
                            }
                    }
                }
                HStack(spacing: 8) {
                    ForEach(0..<3) { col in
                        RoundedRectangle(cornerRadius: 8)
                            .fill(.white.opacity(0.1))
                            .frame(width: 50, height: 50)
                            .overlay {
                                if col == 2 {
                                    Text("X")
                                        .font(.system(size: 28, weight: .bold))
                                        .foregroundColor(Color(hex: "#e74c3c"))
                                } else if col == 0 {
                                    Text("O")
                                        .font(.system(size: 28, weight: .bold))
                                        .foregroundColor(Color(hex: "#3498db"))
                                }
                            }
                    }
                }
            }
            .padding(.vertical, 20)

            Spacer()

            // Login button
            Button(action: {
                authViewModel.login()
            }) {
                HStack(spacing: 12) {
                    if authViewModel.isLoading {
                        ProgressView()
                            .progressViewStyle(CircularProgressViewStyle(tint: Color(hex: "#667eea")))
                    } else {
                        Image(systemName: "person.fill")
                            .font(.system(size: 18))
                    }
                    Text(authViewModel.isLoading ? "Logging in..." : "Login to Play")
                        .font(.system(size: 18, weight: .semibold))
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 16)
                .background(Color.white)
                .foregroundColor(Color(hex: "#667eea"))
                .cornerRadius(12)
            }
            .disabled(authViewModel.isLoading)
            .padding(.horizontal, 40)

            // Error message
            if let error = authViewModel.errorMessage {
                Text(error)
                    .font(.system(size: 14))
                    .foregroundColor(.red)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal)
            }

            Spacer()
                .frame(height: 50)
        }
    }
}

#Preview {
    ZStack {
        LinearGradient(
            gradient: Gradient(colors: [
                Color(hex: "#667eea"),
                Color(hex: "#764ba2")
            ]),
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )
        .ignoresSafeArea()

        LoginView()
            .environmentObject(AuthViewModel())
    }
}
