const express = require('express')
const app = express()
const port = process.env.PORT || 4000 

const TelegramBot = require("node-telegram-bot-api");
const cron = require("node-cron");
const fs = require("fs");
const { log } = require("console");

const TOKEN = process.env.BOT_TOKEN;
const CHAT_ID = process.env.CHAT_ID;

const bot = new TelegramBot(TOKEN, { polling: true });

const FILE = "./data.json";

let data = {
  players: [], // { "name": "Test", "username": "test", "id": 12345 }
  history: {},
  declinedHistory: {},
  votes: {},
  assigned: null,
  confirmed: false,
  currentPollId: null,
};

// Load file safely
if (fs.existsSync(FILE)) {
  try {
    data = JSON.parse(fs.readFileSync(FILE));
  } catch (e) {
    console.error("⚠️ Failed to load data.json, using defaults");
  }
}

// ---- SAVE ----
function save() {
  // console.log("💾 SAVING FILE");
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2)); //JSON.stringify(value, replacer, space)
}

// ---- HELPERS ----
function formatDate() {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, "0")}-${String(
    d.getMonth() + 1,
  ).padStart(2, "0")}-${d.getFullYear()}`;
}

function tag(user) {
  return user.username
    ? `@${user.username}`
    : `<a href="tg://user?id=${user.id}">${user.first_name}</a>`;
}

// ---- Add a user if not on player list ----
function addPlayer(user) {
  if (!data.players.some((p) => p.id === user.id)) {
    // check if already stored
   // data.players.push({
  //    name: user.first_name,
  //    username: user.username,
  //    id: user.id,
  //  });
  //  save();

        const mention = user.username
  ? `@${user.username}`
  : `<a href="tg://user?id=${user.id}">${user.first_name}</a>`;

await bot.sendMessage(
  CHAT_ID,
  `🎉 Welcome ${mention}!

You are assigned to take the 🥅 goal and 🧊 cooler today.

If you have any issues, please contact the coordinator.`,
  {
    parse_mode: "HTML",
  }
  );
  }
}

// ---- getEligible Using Fair ROTATION LOGIC (least contributions first) ----
function getEligible() {
  return data.players
    .filter((player) => data.votes[player.id] === "IN") // ✅ only IN
    .map((player) => ({
      ...player,
      count: data.history[player.id]?.length || 0,
    }))
    .sort((a, b) => a.count - b.count);
}

function resetDailyState() {
  // console.log("🔄 RESET CALLED");
  data.votes = {};
  data.assigned = null;
  data.confirmed = false;
  data.currentPollId = null;
  // console.log("STATE AFTER RESET:", data);
}

(async () => {
  data.history.forEach((p) => {
  bot.sendMessage(chatId, `${tag(p)} (${p.count})`);
});
  
cron.schedule(
  '59 11 * * 1,5',
  async () => {
    //Day of week → Monday (1), Friday (5). Hour → 11 AM Minute → 52 Month (every) Day of month (every)
    try {
      data.players = data.players || [];
      data.history = data.history || {};
      data.declinedHistory = data.declinedHistory || {};

      // ✅ RESET EVERYTHING related to the last poll
      resetDailyState();

      const poll = await bot.sendPoll(
        CHAT_ID,
        "Today’s soccer game: 6:00 PM \nLocation: J. J High School \nPlease come up with Yellow/Blue vest or two different jersey.",
        ["In @ 6:00 PM", "In @ 6:30 PM", "May be", "Out"],
        { is_anonymous: false },
      );
      data.currentPollId = poll.poll.id;
    } catch (err) {
      console.error(err);
    }
  },
  { timezone: "America/Chicago" },
);

// ---- POLL ANSWERS ----
bot.on("poll_answer", (answer) => {
  if (answer.poll_id !== data.currentPollId) return;
  const userId = answer.user.id;
  if (!userId) return;
  addPlayer(answer.user); // ✅ Add player if not exists

  const option = answer.option_ids[0];
  data.votes[userId] = option === 0 ? "IN" : "OUT";

  save();
});

app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})
