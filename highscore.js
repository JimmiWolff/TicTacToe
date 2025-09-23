const { getDatabase } = require('./database');

class HighscoreService {
    constructor() {
        this.collectionName = 'highscores';
    }

    async getCollection() {
        const db = getDatabase();
        return db.collection(this.collectionName);
    }

    async updatePlayerScore(userId, username, gameResult) {
        try {
            const collection = await this.getCollection();

            const filter = { userId: userId };
            const update = {
                $set: {
                    username: username,
                    lastPlayed: new Date()
                },
                $inc: {}
            };

            if (gameResult === 'win') {
                update.$inc.wins = 1;
            } else if (gameResult === 'loss') {
                update.$inc.losses = 1;
            } else if (gameResult === 'draw') {
                update.$inc.draws = 1;
            }

            update.$inc.totalGames = 1;

            const options = { upsert: true, returnDocument: 'after' };
            const result = await collection.findOneAndUpdate(filter, update, options);

            return result;
        } catch (error) {
            console.error('Error updating player score:', error);
            throw error;
        }
    }

    async getPlayerStats(userId) {
        try {
            const collection = await this.getCollection();
            const player = await collection.findOne({ userId: userId });

            if (!player) {
                return {
                    userId: userId,
                    username: '',
                    wins: 0,
                    losses: 0,
                    draws: 0,
                    totalGames: 0,
                    winRate: 0
                };
            }

            const winRate = player.totalGames > 0 ?
                Math.round((player.wins / player.totalGames) * 100) : 0;

            return {
                ...player,
                winRate: winRate
            };
        } catch (error) {
            console.error('Error getting player stats:', error);
            throw error;
        }
    }

    async getTopPlayers(limit = 10) {
        try {
            const collection = await this.getCollection();

            const topPlayers = await collection
                .find({ totalGames: { $gt: 0 } })
                .sort({ wins: -1, winRate: -1 })
                .limit(limit)
                .toArray();

            return topPlayers.map(player => ({
                ...player,
                winRate: player.totalGames > 0 ?
                    Math.round((player.wins / player.totalGames) * 100) : 0
            }));
        } catch (error) {
            console.error('Error getting top players:', error);
            throw error;
        }
    }

    async getAllPlayersStats() {
        try {
            const collection = await this.getCollection();

            const allPlayers = await collection
                .find({ totalGames: { $gt: 0 } })
                .sort({ wins: -1 })
                .toArray();

            return allPlayers.map(player => ({
                ...player,
                winRate: player.totalGames > 0 ?
                    Math.round((player.wins / player.totalGames) * 100) : 0
            }));
        } catch (error) {
            console.error('Error getting all players stats:', error);
            throw error;
        }
    }

    async resetPlayerStats(userId) {
        try {
            const collection = await this.getCollection();

            const result = await collection.updateOne(
                { userId: userId },
                {
                    $set: {
                        wins: 0,
                        losses: 0,
                        draws: 0,
                        totalGames: 0,
                        lastReset: new Date()
                    }
                }
            );

            return result;
        } catch (error) {
            console.error('Error resetting player stats:', error);
            throw error;
        }
    }

    async deletePlayer(userId) {
        try {
            const collection = await this.getCollection();
            const result = await collection.deleteOne({ userId: userId });
            return result;
        } catch (error) {
            console.error('Error deleting player:', error);
            throw error;
        }
    }
}

module.exports = new HighscoreService();