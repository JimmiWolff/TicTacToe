import SwiftUI

struct GameBoardView: View {
    @EnvironmentObject var authViewModel: AuthViewModel
    @EnvironmentObject var gameViewModel: GameViewModel

    var body: some View {
        VStack(spacing: 0) {
            // Header
            GameHeader()

            ScrollView {
                VStack(spacing: 20) {
                    // Room code
                    if let roomCode = gameViewModel.currentRoom {
                        HStack(spacing: 8) {
                            Text("Room:")
                                .font(.system(size: 14))
                                .foregroundColor(.white.opacity(0.7))
                            Text(roomCode)
                                .font(.system(size: 16, weight: .bold, design: .monospaced))
                                .foregroundColor(.white)

                            Button(action: {
                                UIPasteboard.general.string = roomCode
                                gameViewModel.toastMessage = "Room code copied!"
                            }) {
                                Image(systemName: "doc.on.doc")
                                    .font(.system(size: 14))
                                    .foregroundColor(.white.opacity(0.7))
                            }
                        }
                        .padding(.horizontal, 16)
                        .padding(.vertical, 8)
                        .background(Color.white.opacity(0.1))
                        .cornerRadius(20)
                    }

                    // Player slots
                    PlayerSlotsView()
                        .padding(.horizontal)

                    // Current player indicator
                    Text(gameViewModel.statusText)
                        .font(.system(size: 18, weight: .medium))
                        .foregroundColor(gameViewModel.isMyTurn ? .green : .white.opacity(0.8))
                        .padding(.vertical, 8)

                    // Game board
                    GameGrid()
                        .padding(.horizontal, 20)

                    // Scores
                    ScoreView()
                        .padding(.horizontal)
                        .padding(.top, 10)

                    // Game controls
                    GameControls()
                        .padding(.horizontal)
                        .padding(.top, 20)

                    Spacer(minLength: 40)
                }
                .padding(.top, 20)
            }
        }
        .sheet(isPresented: $gameViewModel.showSettings) {
            SettingsView()
                .environmentObject(authViewModel)
                .environmentObject(gameViewModel)
        }
        .sheet(isPresented: $gameViewModel.showHighscores) {
            HighscoresView()
                .environmentObject(authViewModel)
                .environmentObject(gameViewModel)
        }
        .overlay(
            ToastView(message: $gameViewModel.toastMessage)
        )
    }
}

struct GameHeader: View {
    @EnvironmentObject var authViewModel: AuthViewModel
    @EnvironmentObject var gameViewModel: GameViewModel

    var body: some View {
        HStack {
            // Back button
            Button(action: {
                gameViewModel.leaveRoom()
            }) {
                Image(systemName: "chevron.left")
                    .font(.system(size: 18, weight: .semibold))
                    .foregroundColor(.white)
                    .padding(12)
                    .background(Color.white.opacity(0.1))
                    .clipShape(Circle())
            }

            Spacer()

            Text("Tic Tac Toe")
                .font(.system(size: 20, weight: .bold, design: .rounded))
                .foregroundColor(.white)

            Spacer()

            HStack(spacing: 12) {
                // Settings
                Button(action: {
                    gameViewModel.showSettings = true
                }) {
                    Image(systemName: "gearshape.fill")
                        .font(.system(size: 18))
                        .foregroundColor(.white.opacity(0.8))
                        .padding(12)
                        .background(Color.white.opacity(0.1))
                        .clipShape(Circle())
                }

                // Highscores
                Button(action: {
                    gameViewModel.fetchHighscores()
                    if let userId = authViewModel.userId {
                        gameViewModel.fetchPlayerStats(userId: userId)
                    }
                    gameViewModel.showHighscores = true
                }) {
                    Image(systemName: "trophy.fill")
                        .font(.system(size: 18))
                        .foregroundColor(.yellow)
                        .padding(12)
                        .background(Color.white.opacity(0.1))
                        .clipShape(Circle())
                }
            }
        }
        .padding(.horizontal)
        .padding(.vertical, 10)
    }
}

struct PlayerSlotsView: View {
    @EnvironmentObject var gameViewModel: GameViewModel

    var body: some View {
        HStack(spacing: 16) {
            PlayerSlot(
                symbol: "X",
                player: gameViewModel.gameState.players.first { $0.displaySymbol == "X" },
                isCurrentTurn: gameViewModel.gameState.currentPlayer == "X",
                color: gameViewModel.colorForPiece("X")
            )

            Text("VS")
                .font(.system(size: 16, weight: .bold))
                .foregroundColor(.white.opacity(0.5))

            PlayerSlot(
                symbol: "O",
                player: gameViewModel.gameState.players.first { $0.displaySymbol == "O" },
                isCurrentTurn: gameViewModel.gameState.currentPlayer == "O",
                color: gameViewModel.colorForPiece("O")
            )
        }
    }
}

struct PlayerSlot: View {
    let symbol: String
    let player: Player?
    let isCurrentTurn: Bool
    let color: Color

    var body: some View {
        VStack(spacing: 8) {
            ZStack {
                Circle()
                    .fill(Color.white.opacity(0.1))
                    .frame(width: 50, height: 50)

                if isCurrentTurn {
                    Circle()
                        .stroke(color, lineWidth: 3)
                        .frame(width: 50, height: 50)
                }

                Text(symbol)
                    .font(.system(size: 24, weight: .bold))
                    .foregroundColor(color)
            }

            Text(player?.username ?? "Waiting...")
                .font(.system(size: 14, weight: player != nil ? .medium : .regular))
                .foregroundColor(player != nil ? .white : .white.opacity(0.5))
                .lineLimit(1)
        }
        .frame(maxWidth: .infinity)
    }
}

struct GameGrid: View {
    @EnvironmentObject var gameViewModel: GameViewModel

    var body: some View {
        let gridSize = UIScreen.main.bounds.width - 60

        VStack(spacing: 8) {
            ForEach(0..<3) { row in
                HStack(spacing: 8) {
                    ForEach(0..<3) { col in
                        let index = row * 3 + col
                        GameCellView(
                            index: index,
                            value: gameViewModel.gameState.board[index],
                            isSelected: gameViewModel.selectedPieceIndex == index,
                            colorX: gameViewModel.colorForPiece("X"),
                            colorO: gameViewModel.colorForPiece("O")
                        ) {
                            gameViewModel.cellTapped(index: index)
                        }
                    }
                }
            }
        }
        .frame(width: gridSize, height: gridSize)
        .padding(12)
        .background(Color.white.opacity(0.05))
        .cornerRadius(16)
    }
}

struct GameCellView: View {
    let index: Int
    let value: String
    let isSelected: Bool
    let colorX: Color
    let colorO: Color
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            ZStack {
                RoundedRectangle(cornerRadius: 12)
                    .fill(isSelected ? Color.white.opacity(0.3) : Color.white.opacity(0.1))

                if isSelected {
                    RoundedRectangle(cornerRadius: 12)
                        .stroke(Color.white, lineWidth: 3)
                }

                if !value.isEmpty {
                    Text(value)
                        .font(.system(size: 44, weight: .bold, design: .rounded))
                        .foregroundColor(value == "X" ? colorX : colorO)
                }
            }
        }
        .aspectRatio(1, contentMode: .fit)
        .sensoryFeedback(.impact(weight: .light), trigger: value)
    }
}

struct ScoreView: View {
    @EnvironmentObject var gameViewModel: GameViewModel

    var body: some View {
        HStack(spacing: 20) {
            ScoreItem(
                label: "X",
                score: gameViewModel.gameState.scores.X,
                color: gameViewModel.colorForPiece("X")
            )

            ScoreItem(
                label: "Draw",
                score: gameViewModel.gameState.scores.draw,
                color: .gray
            )

            ScoreItem(
                label: "O",
                score: gameViewModel.gameState.scores.O,
                color: gameViewModel.colorForPiece("O")
            )
        }
        .padding()
        .background(Color.white.opacity(0.1))
        .cornerRadius(12)
    }
}

struct ScoreItem: View {
    let label: String
    let score: Int
    let color: Color

    var body: some View {
        VStack(spacing: 4) {
            Text(label)
                .font(.system(size: 14, weight: .medium))
                .foregroundColor(color)

            Text("\(score)")
                .font(.system(size: 24, weight: .bold))
                .foregroundColor(.white)
        }
        .frame(maxWidth: .infinity)
    }
}

struct GameControls: View {
    @EnvironmentObject var gameViewModel: GameViewModel

    var body: some View {
        HStack(spacing: 16) {
            Button(action: {
                gameViewModel.newGame()
            }) {
                HStack(spacing: 8) {
                    Image(systemName: "arrow.counterclockwise")
                    Text("New Game")
                }
                .font(.system(size: 16, weight: .semibold))
                .frame(maxWidth: .infinity)
                .padding(.vertical, 14)
                .background(Color.white)
                .foregroundColor(Color(hex: "#667eea"))
                .cornerRadius(10)
            }

            Button(action: {
                gameViewModel.resetScore()
            }) {
                HStack(spacing: 8) {
                    Image(systemName: "xmark.circle")
                    Text("Reset Score")
                }
                .font(.system(size: 16, weight: .semibold))
                .frame(maxWidth: .infinity)
                .padding(.vertical, 14)
                .background(Color.white.opacity(0.15))
                .foregroundColor(.white)
                .cornerRadius(10)
            }
        }
    }
}

struct ToastView: View {
    @Binding var message: String?

    var body: some View {
        VStack {
            Spacer()
            if let msg = message {
                Text(msg)
                    .font(.system(size: 16, weight: .medium))
                    .foregroundColor(.white)
                    .padding(.horizontal, 20)
                    .padding(.vertical, 12)
                    .background(Color.black.opacity(0.8))
                    .cornerRadius(25)
                    .transition(.move(edge: .bottom).combined(with: .opacity))
                    .onAppear {
                        DispatchQueue.main.asyncAfter(deadline: .now() + 2) {
                            withAnimation {
                                message = nil
                            }
                        }
                    }
            }
        }
        .padding(.bottom, 30)
        .animation(.spring(), value: message)
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

        GameBoardView()
            .environmentObject(AuthViewModel())
            .environmentObject(GameViewModel())
    }
}
