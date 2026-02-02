import SwiftUI

struct RoomSelectionView: View {
    @EnvironmentObject var authViewModel: AuthViewModel
    @EnvironmentObject var gameViewModel: GameViewModel
    @State private var roomCode = ""
    @State private var showJoinByCode = false

    var body: some View {
        ScrollView {
            VStack(spacing: 24) {
                // Header
                HStack {
                    Text("Tic Tac Toe")
                        .font(.system(size: 28, weight: .bold, design: .rounded))
                        .foregroundColor(.white)

                    Spacer()

                    Button(action: {
                        authViewModel.logout()
                    }) {
                        Image(systemName: "rectangle.portrait.and.arrow.right")
                            .font(.system(size: 18))
                            .foregroundColor(.white.opacity(0.8))
                            .padding(12)
                            .background(Color.white.opacity(0.1))
                            .clipShape(Circle())
                    }
                }
                .padding(.horizontal)
                .padding(.top, 20)

                // Welcome message
                VStack(spacing: 8) {
                    Text("Welcome, \(authViewModel.username)!")
                        .font(.system(size: 20, weight: .medium))
                        .foregroundColor(.white)

                    if !authViewModel.isSocketAuthenticated {
                        HStack(spacing: 8) {
                            ProgressView()
                                .progressViewStyle(CircularProgressViewStyle(tint: .white))
                                .scaleEffect(0.8)
                            Text("Connecting to server...")
                                .font(.system(size: 14))
                                .foregroundColor(.white.opacity(0.7))
                        }
                    }
                }
                .padding(.top, 10)

                // Active Games Section
                if !gameViewModel.activeGames.isEmpty {
                    VStack(alignment: .leading, spacing: 12) {
                        Text("Your Active Games")
                            .font(.system(size: 18, weight: .semibold))
                            .foregroundColor(.white)
                            .padding(.horizontal)

                        ForEach(gameViewModel.activeGames) { game in
                            ActiveGameRow(game: game) {
                                gameViewModel.rejoinGame(roomCode: game.roomCode)
                            } onDelete: {
                                if let userId = authViewModel.userId {
                                    gameViewModel.deleteGame(roomCode: game.roomCode, userId: userId)
                                }
                            }
                        }
                    }
                    .padding(.top, 10)
                }

                // Quick Play button
                Button(action: {
                    gameViewModel.quickPlay()
                }) {
                    HStack(spacing: 12) {
                        if gameViewModel.isJoiningRoom {
                            ProgressView()
                                .progressViewStyle(CircularProgressViewStyle(tint: Color(hex: "#667eea")))
                        } else {
                            Image(systemName: "bolt.fill")
                                .font(.system(size: 20))
                        }
                        Text("Quick Play")
                            .font(.system(size: 18, weight: .semibold))
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 18)
                    .background(Color.white)
                    .foregroundColor(Color(hex: "#667eea"))
                    .cornerRadius(12)
                }
                .disabled(!authViewModel.isSocketAuthenticated || gameViewModel.isJoiningRoom)
                .opacity(authViewModel.isSocketAuthenticated ? 1.0 : 0.6)
                .padding(.horizontal)
                .padding(.top, 20)

                // Create New Game
                Button(action: {
                    gameViewModel.createRoom()
                }) {
                    HStack(spacing: 12) {
                        Image(systemName: "plus.circle.fill")
                            .font(.system(size: 20))
                        Text("Create New Game")
                            .font(.system(size: 18, weight: .semibold))
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 18)
                    .background(Color.white.opacity(0.15))
                    .foregroundColor(.white)
                    .cornerRadius(12)
                    .overlay(
                        RoundedRectangle(cornerRadius: 12)
                            .stroke(Color.white.opacity(0.3), lineWidth: 1)
                    )
                }
                .disabled(!authViewModel.isSocketAuthenticated || gameViewModel.isJoiningRoom)
                .opacity(authViewModel.isSocketAuthenticated ? 1.0 : 0.6)
                .padding(.horizontal)

                // Join by Code
                VStack(spacing: 12) {
                    Button(action: {
                        withAnimation(.spring()) {
                            showJoinByCode.toggle()
                        }
                    }) {
                        HStack(spacing: 12) {
                            Image(systemName: "keyboard")
                                .font(.system(size: 20))
                            Text("Join with Code")
                                .font(.system(size: 18, weight: .semibold))
                            Spacer()
                            Image(systemName: showJoinByCode ? "chevron.up" : "chevron.down")
                                .font(.system(size: 14))
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 18)
                        .padding(.horizontal)
                        .background(Color.white.opacity(0.15))
                        .foregroundColor(.white)
                        .cornerRadius(12)
                        .overlay(
                            RoundedRectangle(cornerRadius: 12)
                                .stroke(Color.white.opacity(0.3), lineWidth: 1)
                        )
                    }
                    .padding(.horizontal)

                    if showJoinByCode {
                        HStack(spacing: 12) {
                            TextField("", text: $roomCode)
                                .placeholder(when: roomCode.isEmpty) {
                                    Text("Enter room code")
                                        .foregroundColor(.white.opacity(0.5))
                                }
                                .font(.system(size: 16))
                                .foregroundColor(.white)
                                .textCase(.uppercase)
                                .autocapitalization(.allCharacters)
                                .disableAutocorrection(true)
                                .padding()
                                .background(Color.white.opacity(0.1))
                                .cornerRadius(10)

                            Button(action: {
                                gameViewModel.joinRoom(code: roomCode)
                            }) {
                                Text("Join")
                                    .font(.system(size: 16, weight: .semibold))
                                    .foregroundColor(Color(hex: "#667eea"))
                                    .padding(.horizontal, 24)
                                    .padding(.vertical, 14)
                                    .background(Color.white)
                                    .cornerRadius(10)
                            }
                            .disabled(!authViewModel.isSocketAuthenticated || roomCode.isEmpty || gameViewModel.isJoiningRoom)
                        }
                        .padding(.horizontal)
                        .transition(.opacity.combined(with: .move(edge: .top)))
                    }
                }

                // Highscores button
                Button(action: {
                    gameViewModel.fetchHighscores()
                    if let userId = authViewModel.userId {
                        gameViewModel.fetchPlayerStats(userId: userId)
                    }
                    gameViewModel.showHighscores = true
                }) {
                    HStack(spacing: 12) {
                        Image(systemName: "trophy.fill")
                            .font(.system(size: 20))
                        Text("View Highscores")
                            .font(.system(size: 18, weight: .semibold))
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 18)
                    .background(Color.yellow.opacity(0.2))
                    .foregroundColor(.yellow)
                    .cornerRadius(12)
                }
                .padding(.horizontal)
                .padding(.top, 10)

                // Error message
                if let error = gameViewModel.errorMessage {
                    Text(error)
                        .font(.system(size: 14))
                        .foregroundColor(.red)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal)
                }

                Spacer(minLength: 40)
            }
        }
        .sheet(isPresented: $gameViewModel.showHighscores) {
            HighscoresView()
                .environmentObject(authViewModel)
                .environmentObject(gameViewModel)
        }
        .onAppear {
            if let userId = authViewModel.userId {
                gameViewModel.fetchMyGames(userId: userId)
            }
        }
    }

}

struct ActiveGameRow: View {
    let game: ActiveGame
    let onJoin: () -> Void
    let onDelete: () -> Void

    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                Text("Room: \(game.roomCode)")
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundColor(.white)

                HStack(spacing: 8) {
                    ForEach(game.players, id: \.id) { player in
                        Text(player.username)
                            .font(.system(size: 14))
                            .foregroundColor(.white.opacity(0.7))
                    }
                }

                Text(game.formattedLastActivity)
                    .font(.system(size: 12))
                    .foregroundColor(.white.opacity(0.5))
            }

            Spacer()

            HStack(spacing: 12) {
                Button(action: onDelete) {
                    Image(systemName: "trash")
                        .font(.system(size: 14))
                        .foregroundColor(.red.opacity(0.8))
                        .padding(8)
                        .background(Color.red.opacity(0.1))
                        .clipShape(Circle())
                }

                Button(action: onJoin) {
                    Text("Rejoin")
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundColor(Color(hex: "#667eea"))
                        .padding(.horizontal, 16)
                        .padding(.vertical, 8)
                        .background(Color.white)
                        .cornerRadius(8)
                }
            }
        }
        .padding()
        .background(Color.white.opacity(0.1))
        .cornerRadius(12)
        .padding(.horizontal)
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

        RoomSelectionView()
            .environmentObject(AuthViewModel())
            .environmentObject(GameViewModel())
    }
}
