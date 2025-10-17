const { getDatabase } = require('./database');

class GameStateService {
    constructor() {
        this.collectionName = 'active_games';
    }

    async getCollection() {
        const db = getDatabase();
        return db.collection(this.collectionName);
    }

    async ensureIndexes() {
        try {
            const collection = await this.getCollection();
            // Create unique index on roomCode for fast lookups
            await collection.createIndex({ roomCode: 1 }, { unique: true });
            // Create index on userId for "My Games" queries
            await collection.createIndex({ 'players.userId': 1 });
            // Create index on lastActivity for cleanup queries
            await collection.createIndex({ lastActivity: 1 });
            console.log('Game state indexes created successfully');
        } catch (error) {
            console.error('Error creating indexes:', error);
        }
    }

    async saveGame(roomCode, gameData) {
        try {
            const collection = await this.getCollection();

            const filter = { roomCode: roomCode };
            const update = {
                $set: {
                    ...gameData,
                    lastActivity: new Date()
                }
            };
            const options = { upsert: true };

            await collection.updateOne(filter, update, options);
            return true;
        } catch (error) {
            console.error('Error saving game state:', error);
            return false;
        }
    }

    async loadGame(roomCode) {
        try {
            const collection = await this.getCollection();
            const game = await collection.findOne({ roomCode: roomCode });
            return game;
        } catch (error) {
            console.error('Error loading game state:', error);
            return null;
        }
    }

    async updatePlayerStatus(roomCode, userId, socketId, lastSeen = new Date()) {
        try {
            const collection = await this.getCollection();

            // Update the specific player's socketId and lastSeen
            const result = await collection.updateOne(
                {
                    roomCode: roomCode,
                    'players.userId': userId
                },
                {
                    $set: {
                        'players.$.socketId': socketId,
                        'players.$.lastSeen': lastSeen,
                        lastActivity: new Date()
                    }
                }
            );

            return result.modifiedCount > 0;
        } catch (error) {
            console.error('Error updating player status:', error);
            return false;
        }
    }

    async markGameCompleted(roomCode) {
        try {
            const collection = await this.getCollection();

            await collection.updateOne(
                { roomCode: roomCode },
                {
                    $set: {
                        gameActive: false,
                        completedAt: new Date(),
                        lastActivity: new Date()
                    }
                }
            );

            return true;
        } catch (error) {
            console.error('Error marking game as completed:', error);
            return false;
        }
    }

    async deleteGame(roomCode) {
        try {
            const collection = await this.getCollection();
            const result = await collection.deleteOne({ roomCode: roomCode });
            return result.deletedCount > 0;
        } catch (error) {
            console.error('Error deleting game:', error);
            return false;
        }
    }

    async getUserGames(userId) {
        try {
            const collection = await this.getCollection();

            const games = await collection
                .find({
                    'players.userId': userId,
                    gameActive: true
                })
                .sort({ lastActivity: -1 })
                .toArray();

            return games;
        } catch (error) {
            console.error('Error getting user games:', error);
            return [];
        }
    }

    async cleanupOldGames() {
        try {
            const collection = await this.getCollection();
            const now = new Date();

            // Delete completed games older than 7 days
            const completedResult = await collection.deleteMany({
                gameActive: false,
                completedAt: { $lt: new Date(now - 7 * 24 * 60 * 60 * 1000) }
            });

            // Delete inactive games older than 30 days
            const inactiveResult = await collection.deleteMany({
                lastActivity: { $lt: new Date(now - 30 * 24 * 60 * 60 * 1000) }
            });

            // Clean default room more aggressively (24 hours of inactivity)
            const defaultResult = await collection.deleteMany({
                roomCode: 'default',
                lastActivity: { $lt: new Date(now - 24 * 60 * 60 * 1000) }
            });

            const totalDeleted = completedResult.deletedCount + inactiveResult.deletedCount + defaultResult.deletedCount;

            if (totalDeleted > 0) {
                console.log(`Cleanup: Deleted ${totalDeleted} old games (${completedResult.deletedCount} completed, ${inactiveResult.deletedCount} inactive, ${defaultResult.deletedCount} default room)`);
            }

            return totalDeleted;
        } catch (error) {
            console.error('Error cleaning up old games:', error);
            return 0;
        }
    }
}

module.exports = new GameStateService();
