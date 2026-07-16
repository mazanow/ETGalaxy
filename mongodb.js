const { MongoClient } = require("mongodb");

const uri = process.env.MONGODB_URI;

if (!uri) {
  throw new Error("MONGODB_URI environment variable is not set.");
}

const client = new MongoClient(uri);

let db;
let players;

async function connectDB() {
  if (db) return;

  await client.connect();

  db = client.db("telegramBot");
  players = db.collection("players");

  // Create an index on username (optional)
  await players.createIndex({ username: 1 });

  console.log("✅ MongoDB connected");
}

// Add player if not exists
async function addPlayer(user) {
  await players.updateOne(
    { _id: user.id },
    {
      $setOnInsert: {
        name: user.first_name,
        username: user.username || "",
        dates: [],
        createdAt: new Date(),
      },
    },
    { upsert: true }
  );
}

// Add a date to player's array (no duplicates)
async function addDate(userId, date) {
  await players.updateOne(
    { _id: userId },
    {
      $addToSet: {
        dates: date,
      },
    }
  );
}

// Remove a date
async function removeDate(userId, date) {
  await players.updateOne(
    { _id: userId },
    {
      $pull: {
        dates: date,
      },
    }
  );
}

// Get one player
async function getPlayer(userId) {
  return await players.findOne({ _id: userId });
}

// Get all players
async function getPlayers() {
  return await players.find().toArray();
}

// Replace all dates
async function setDates(userId, dates) {
  await players.updateOne(
    { _id: userId },
    {
      $set: {
        dates,
      },
    }
  );
}

// Delete player
async function deletePlayer(userId) {
  await players.deleteOne({ _id: userId });
}

// Clear all players
async function clearPlayers() {
  await players.deleteMany({});
}

module.exports = {
  connectDB,
  addPlayer,
  addDate,
  removeDate,
  getPlayer,
  getPlayers,
  setDates,
  deletePlayer,
  clearPlayers,
};
