import SwiftUI

struct UsernameSetupView: View {
    @EnvironmentObject var authViewModel: AuthViewModel
    @State private var username = ""
    @FocusState private var isFocused: Bool

    var body: some View {
        VStack(spacing: 30) {
            Spacer()

            // Header
            VStack(spacing: 12) {
                Image(systemName: "person.crop.circle.badge.plus")
                    .font(.system(size: 60))
                    .foregroundColor(.white)

                Text("Choose Your Username")
                    .font(.system(size: 28, weight: .bold, design: .rounded))
                    .foregroundColor(.white)

                Text("This will be visible to other players")
                    .font(.system(size: 16))
                    .foregroundColor(.white.opacity(0.7))
            }

            // Username input
            VStack(spacing: 16) {
                TextField("", text: $username)
                    .placeholder(when: username.isEmpty) {
                        Text("Enter username")
                            .foregroundColor(.white.opacity(0.5))
                    }
                    .font(.system(size: 18))
                    .foregroundColor(.white)
                    .padding()
                    .background(Color.white.opacity(0.15))
                    .cornerRadius(12)
                    .overlay(
                        RoundedRectangle(cornerRadius: 12)
                            .stroke(Color.white.opacity(0.3), lineWidth: 1)
                    )
                    .autocapitalization(.none)
                    .disableAutocorrection(true)
                    .focused($isFocused)

                Text("2-20 characters, letters, numbers, spaces, hyphens, underscores")
                    .font(.system(size: 12))
                    .foregroundColor(.white.opacity(0.6))
            }
            .padding(.horizontal, 40)

            // Continue button
            Button(action: {
                authViewModel.setUsername(username)
            }) {
                HStack(spacing: 12) {
                    Text("Continue to Game")
                        .font(.system(size: 18, weight: .semibold))
                    Image(systemName: "arrow.right")
                        .font(.system(size: 16, weight: .semibold))
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 16)
                .background(isValidUsername ? Color.white : Color.white.opacity(0.3))
                .foregroundColor(isValidUsername ? Color(hex: "#667eea") : Color.white.opacity(0.5))
                .cornerRadius(12)
            }
            .disabled(!isValidUsername)
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
            Spacer()
        }
        .onAppear {
            isFocused = true
        }
    }

    private var isValidUsername: Bool {
        let trimmed = username.trimmingCharacters(in: .whitespacesAndNewlines)
        guard trimmed.count >= 2, trimmed.count <= 20 else { return false }
        return trimmed.range(of: "^[a-zA-Z0-9\\s_-]+$", options: .regularExpression) != nil
    }
}

// Placeholder extension for TextField
extension View {
    func placeholder<Content: View>(
        when shouldShow: Bool,
        alignment: Alignment = .leading,
        @ViewBuilder placeholder: () -> Content
    ) -> some View {
        ZStack(alignment: alignment) {
            placeholder().opacity(shouldShow ? 1 : 0)
            self
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

        UsernameSetupView()
            .environmentObject(AuthViewModel())
    }
}
