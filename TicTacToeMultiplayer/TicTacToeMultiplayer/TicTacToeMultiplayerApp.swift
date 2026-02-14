import SwiftUI

@main
struct TicTacToeMultiplayerApp: App {
    @StateObject private var authViewModel = AuthViewModel()
    @StateObject private var gameViewModel = GameViewModel()

    init() {
        // Connect the view models so game state can clear on logout
        let authVM = AuthViewModel()
        let gameVM = GameViewModel()
        _authViewModel = StateObject(wrappedValue: authVM)
        _gameViewModel = StateObject(wrappedValue: gameVM)
        gameVM.setAuthViewModel(authVM)
    }

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(authViewModel)
                .environmentObject(gameViewModel)
        }
    }
}
