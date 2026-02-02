import SwiftUI
import UIKit

struct SettingsView: View {
    @EnvironmentObject var authViewModel: AuthViewModel
    @EnvironmentObject var gameViewModel: GameViewModel
    @Environment(\.dismiss) var dismiss

    @State private var newUsername = ""
    @State private var selectedColorX: Color
    @State private var selectedColorO: Color
    @State private var showingColorPickerX = false
    @State private var showingColorPickerO = false

    init() {
        _selectedColorX = State(initialValue: Color(hex: "#e74c3c"))
        _selectedColorO = State(initialValue: Color(hex: "#3498db"))
    }

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
                        // Username section
                        VStack(alignment: .leading, spacing: 12) {
                            Text("Username")
                                .font(.system(size: 18, weight: .semibold))
                                .foregroundColor(.white)

                            HStack(spacing: 12) {
                                TextField("", text: $newUsername)
                                    .placeholder(when: newUsername.isEmpty) {
                                        Text(authViewModel.username)
                                            .foregroundColor(.white.opacity(0.5))
                                    }
                                    .font(.system(size: 16))
                                    .foregroundColor(.white)
                                    .padding()
                                    .background(Color.white.opacity(0.15))
                                    .cornerRadius(10)

                                Button(action: updateUsername) {
                                    Text("Update")
                                        .font(.system(size: 14, weight: .semibold))
                                        .foregroundColor(Color(hex: "#667eea"))
                                        .padding(.horizontal, 16)
                                        .padding(.vertical, 14)
                                        .background(Color.white)
                                        .cornerRadius(10)
                                }
                                .disabled(newUsername.isEmpty)
                            }
                        }
                        .padding(.horizontal)

                        Divider()
                            .background(Color.white.opacity(0.3))
                            .padding(.horizontal)

                        // Piece colors section
                        VStack(alignment: .leading, spacing: 16) {
                            Text("Piece Colors")
                                .font(.system(size: 18, weight: .semibold))
                                .foregroundColor(.white)

                            // X color
                            ColorPickerRow(
                                symbol: "X",
                                color: $selectedColorX,
                                canEdit: canEditColor("X"),
                                onChange: { updateColor(piece: "X", color: $0) }
                            )

                            // O color
                            ColorPickerRow(
                                symbol: "O",
                                color: $selectedColorO,
                                canEdit: canEditColor("O"),
                                onChange: { updateColor(piece: "O", color: $0) }
                            )

                            if !canEditColor("X") && !canEditColor("O") {
                                Text("You can only change your own piece color")
                                    .font(.system(size: 12))
                                    .foregroundColor(.white.opacity(0.6))
                            }
                        }
                        .padding(.horizontal)

                        Spacer(minLength: 40)
                    }
                    .padding(.top, 20)
                }
            }
            .navigationTitle("Settings")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") {
                        dismiss()
                    }
                    .foregroundColor(.white)
                }
            }
        }
        .onAppear {
            updateColorsFromState()
        }
    }

    private func canEditColor(_ piece: String) -> Bool {
        gameViewModel.myPlayer?.displaySymbol == piece
    }

    private func updateColorsFromState() {
        if let xColor = gameViewModel.gameState.pieceColors?.X {
            selectedColorX = Color(hex: xColor)
        }
        if let oColor = gameViewModel.gameState.pieceColors?.O {
            selectedColorO = Color(hex: oColor)
        }
    }

    private func updateUsername() {
        guard !newUsername.isEmpty else { return }
        authViewModel.changeUsername(newUsername)
        newUsername = ""
    }

    private func updateColor(piece: String, color: Color) {
        let hexColor = color.toHex()
        gameViewModel.changeColor(piece: piece, color: hexColor)
    }
}

struct ColorPickerRow: View {
    let symbol: String
    @Binding var color: Color
    let canEdit: Bool
    let onChange: (Color) -> Void

    var body: some View {
        HStack {
            Text(symbol)
                .font(.system(size: 28, weight: .bold))
                .foregroundColor(color)
                .frame(width: 50)

            Text("Player \(symbol)")
                .font(.system(size: 16))
                .foregroundColor(.white)

            Spacer()

            if canEdit {
                ColorPicker("", selection: $color)
                    .labelsHidden()
                    .onChange(of: color) { newValue in
                        onChange(newValue)
                    }
            } else {
                Circle()
                    .fill(color)
                    .frame(width: 30, height: 30)
                    .overlay(
                        Circle()
                            .stroke(Color.white.opacity(0.3), lineWidth: 2)
                    )
            }
        }
        .padding()
        .background(Color.white.opacity(0.1))
        .cornerRadius(12)
    }
}

// Color to hex extension
extension Color {
    func toHex() -> String {
        let uiColor = UIColor(self)
        var red: CGFloat = 0
        var green: CGFloat = 0
        var blue: CGFloat = 0
        var alpha: CGFloat = 0

        uiColor.getRed(&red, green: &green, blue: &blue, alpha: &alpha)

        return String(
            format: "#%02X%02X%02X",
            Int(red * 255),
            Int(green * 255),
            Int(blue * 255)
        )
    }
}

#Preview {
    SettingsView()
        .environmentObject(AuthViewModel())
        .environmentObject(GameViewModel())
}
