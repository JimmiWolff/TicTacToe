const { MongoClient, ServerApiVersion } = require('mongodb');

const uri = "mongodb+srv://wolff13_db_user:mb0BbpNr4RAXRuMu@cluster0.d3pdxn1.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

let client;
let db;

const connectToDatabase = async () => {
    try {
        if (!client) {
            client = new MongoClient(uri, {
                serverApi: {
                    version: ServerApiVersion.v1,
                    strict: true,
                    deprecationErrors: true,
                }
            });

            await client.connect();
            console.log("Connected to MongoDB Atlas!");

            db = client.db('tictactoe_game');
        }
        return db;
    } catch (error) {
        console.error("Error connecting to MongoDB:", error);
        throw error;
    }
};

const getDatabase = () => {
    if (!db) {
        throw new Error('Database not initialized. Call connectToDatabase first.');
    }
    return db;
};

const closeConnection = async () => {
    if (client) {
        await client.close();
        client = null;
        db = null;
        console.log("MongoDB connection closed");
    }
};

module.exports = {
    connectToDatabase,
    getDatabase,
    closeConnection
};