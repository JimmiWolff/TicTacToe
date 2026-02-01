import SwiftUI

struct HighscoresView: View {
    @EnvironmentObject var authViewModel: AuthViewModel
    @EnvironmentObject var gameViewModel: GameViewModel
    @Environment(\.dismiss) var dismiss

    var body: some View {
        NavigationView {
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

                ScrollView {
                    VStack(spacing: 24) {
                        // Personal stats card
                        PersonalStatsCard(stats: gameViewModel.playerStats)
                            .padding(.horizontal)

                        // Leaderboard
                        VStack(alignment: .leading, spacing: 16) {
                            Text("Top Players")
                                .font(.system(size: 20, weight: .bold))
                                .foregroundColor(.white)
                                .padding(.horizontal)

                            if gameViewModel.leaderboard.isEmpty {
                                VStack(spacing: 12) {
                                    Image(systemName: "trophy")
                                        .font(.system(size: 40))
                                        .foregroundColor(.white.opacity(0.5))
                                    Text("No players yet")
                                        .font(.system(size: 16))
                                        .foregroundColor(.white.opacity(0.7))
                                }
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 40)
                            } else {
                                ForEach(Array(gameViewModel.leaderboard.enumerated()), id: \.element.id) { index, entry in
                                    LeaderboardRow(rank: index + 1, entry: entry)
                                }
                                .padding(.horizontal)
                            }
                        }

                        Spacer(minLength: 40)
                    }
                    .padding(.top, 20)
                }
            }
            .navigationTitle("Highscores")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") {
                        dismiss()
                    }
                    .foregroundColor(.white)
                }
            }
            .toolbarColorScheme(.dark, for: .navigationBar)
            .toolbarBackground(Color(hex: "#667eea"), for: .navigationBar)
            .toolbarBackground(.visible, for: .navigationBar)
        }
        .onAppear {
            gameViewModel.fetchHighscores()
            if let userId = authViewModel.userId {
                gameViewModel.fetchPlayerStats(userId: userId)
            }
        }
    }
}

struct PersonalStatsCard: View {
    let stats: PlayerStats

    var body: some View {
        VStack(spacing: 16) {
            Text("Your Statistics")
                .font(.system(size: 18, weight: .semibold))
                .foregroundColor(.white)

            HStack(spacing: 20) {
                StatItem(label: "Wins", value: "\(stats.wins)", color: .green)
                StatItem(label: "Losses", value: "\(stats.losses)", color: .red)
                StatItem(label: "Draws", value: "\(stats.draws)", color: .gray)
                StatItem(label: "Win Rate", value: String(format: "%.0f%%", stats.winRate * 100), color: .yellow)
            }
        }
        .padding()
        .background(Color.white.opacity(0.15))
        .cornerRadius(16)
    }
}

struct StatItem: View {
    let label: String
    let value: String
    let color: Color

    var body: some View {
        VStack(spacing: 6) {
            Text(value)
                .font(.system(size: 22, weight: .bold))
                .foregroundColor(color)

            Text(label)
                .font(.system(size: 12))
                .foregroundColor(.white.opacity(0.7))
        }
        .frame(maxWidth: .infinity)
    }
}

struct LeaderboardRow: View {
    let rank: Int
    let entry: LeaderboardEntry

    var body: some View {
        HStack(spacing: 16) {
            // Rank
            ZStack {
                Circle()
                    .fill(rankColor)
                    .frame(width: 36, height: 36)

                Text("\(rank)")
                    .font(.system(size: 16, weight: .bold))
                    .foregroundColor(.white)
            }

            // Username
            VStack(alignment: .leading, spacing: 4) {
                Text(entry.username)
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundColor(.white)

                Text("\(entry.wins)W / \(entry.losses)L / \(entry.draws)D")
                    .font(.system(size: 12))
                    .foregroundColor(.white.opacity(0.7))
            }

            Spacer()

            // Win rate
            VStack(alignment: .trailing, spacing: 4) {
                Text(String(format: "%.0f%%", (entry.winRate ?? 0) * 100))
                    .font(.system(size: 18, weight: .bold))
                    .foregroundColor(.yellow)

                Text("Win Rate")
                    .font(.system(size: 10))
                    .foregroundColor(.white.opacity(0.5))
            }
        }
        .padding()
        .background(Color.white.opacity(0.1))
        .cornerRadius(12)
    }

    private var rankColor: Color {
        switch rank {
        case 1:
            return Color.yellow
        case 2:
            return Color.gray
        case 3:
            return Color(hex: "#CD7F32") // Bronze
        default:
            return Color.white.opacity(0.3)
        }
    }
}

#Preview {
    HighscoresView()
        .environmentObject(AuthViewModel())
        .environmentObject(GameViewModel())
}
