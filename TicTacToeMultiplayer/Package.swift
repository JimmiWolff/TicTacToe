// swift-tools-version:5.9
import PackageDescription

let package = Package(
    name: "TicTacToeMultiplayer",
    platforms: [
        .iOS(.v15)
    ],
    products: [
        .library(
            name: "TicTacToeMultiplayer",
            targets: ["TicTacToeMultiplayer"]),
    ],
    dependencies: [
        .package(url: "https://github.com/socketio/socket.io-client-swift", from: "16.1.0"),
        .package(url: "https://github.com/auth0/Auth0.swift", from: "2.5.0")
    ],
    targets: [
        .target(
            name: "TicTacToeMultiplayer",
            dependencies: [
                .product(name: "SocketIO", package: "socket.io-client-swift"),
                .product(name: "Auth0", package: "Auth0.swift")
            ]),
    ]
)
