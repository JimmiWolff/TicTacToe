import SwiftUI

@main
struct TicTacToeMultiplayerApp: App {
    @StateObject private var authViewModel = AuthViewModel()
    @StateObject private var gameViewModel = GameViewModel()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(authViewModel)
                .environmentObject(gameViewModel)
        }
    }
}
