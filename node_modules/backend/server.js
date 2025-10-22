require("dotenv").config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const { WebcastPushConnection } = require("tiktok-live-connector");
const fs = require("fs");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

const CONFIG_FILE = path.join(__dirname, "giveaway-config.json");
const PORT = process.env.PORT || 3001;

const frontendPath = path.join(__dirname, "frontend", "dist");
app.use(express.static(frontendPath));

app.get("/overlay", (req, res) => {
  res.sendFile(path.join(frontendPath, "index.html"));
});

app.get("/", (req, res) => res.send("TikTok Giveaway Backend is running!"));
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

// --- GIVEAWAY STATE ---
let participants = [];
let giveawayActive = false;
let currentWinner = null;

// Configurable entry options
let giveawayConfig = {
  enabled: { commands: true, gifts: true, likes: true },
  commands: ["!join", "!giveaway", "me"],
  gifts: ["Rose"],
  likeThreshold: 10,
};

// Try to load persisted config
try {
  if (fs.existsSync(CONFIG_FILE)) {
    const raw = fs.readFileSync(CONFIG_FILE, "utf8");
    const parsed = JSON.parse(raw);
    giveawayConfig = { ...giveawayConfig, ...parsed };
    console.log("✅ Loaded giveaway config from file.");
  }
} catch (err) {
  console.error("⚠️ Failed to load config:", err.message);
}

// Track likes per user
let userLikes = {};

// --- TIKTOK CONNECTION HANDLING ---
let tiktokConnections = {}; // key: username, value: connection

async function connectToTikTok(username) {
  if (tiktokConnections[username]) {
    console.log(`Already connected to @${username}`);
    return tiktokConnections[username];
  }

  console.log(`🔗 Connecting to TikTok live of @${username}...`);
  const connection = new WebcastPushConnection(username);

  try {
    await connection.connect();
    console.log(`✅ Connected to TikTok live of @${username}`);
  } catch (err) {
    console.error(`❌ Failed to connect to @${username}:`, err.message);
    return;
  }

  // Chat handler
  connection.on("chat", (chatData) => {
    const message = chatData.comment.trim().toLowerCase();
    const user = chatData.uniqueId;

    if (giveawayActive && giveawayConfig.enabled.commands) {
      if (
        giveawayConfig.commands.some((cmd) => cmd.toLowerCase() === message)
      ) {
        if (!participants.includes(user)) {
          participants.push(user);
          io.emit("participant-joined", user);
        }
      }
    }

    io.emit("new-chat", chatData);
  });

  // Gift handler
  connection.on("gift", (giftData) => {
    const user = giftData.uniqueId;
    const giftName = giftData.giftName;

    if (giveawayActive && giveawayConfig.enabled.gifts) {
      if (giveawayConfig.gifts.includes(giftName)) {
        if (!participants.includes(user)) {
          participants.push(user);
          io.emit("participant-joined", user);
        }
      }
    }

    io.emit("new-gift", giftData);
  });

  // Like handler
  connection.on("like", (likeData) => {
    if (!giveawayActive || !giveawayConfig.enabled.likes) return;

    const user = likeData.uniqueId;
    const count = likeData.likeCount || 1;

    userLikes[user] = (userLikes[user] || 0) + count;

    if (
      !participants.includes(user) &&
      userLikes[user] >= giveawayConfig.likeThreshold
    ) {
      participants.push(user);
      io.emit("participant-joined", user);
    }
  });

  tiktokConnections[username] = connection;
  return connection;
}

// --- SOCKET.IO EVENTS ---
io.on("connection", (socket) => {
  console.log("Frontend connected:", socket.id);

  // New event for overlay connection
  socket.on("connect-tiktok", async (username) => {
    const cleanName = username.replace(/^@/, "").trim();
    await connectToTikTok(cleanName);
  });

  // Send current state on connect
  socket.emit("giveaway-state", {
    active: giveawayActive,
    participants,
    winner: currentWinner,
    config: giveawayConfig,
  });

  socket.on("start-giveaway", () => {
    participants = [];
    userLikes = {};
    giveawayActive = true;
    currentWinner = null;
    io.emit("giveaway-started");
  });

  socket.on("draw-winner", () => {
    if (participants.length === 0) return;
    const winner =
      participants[Math.floor(Math.random() * participants.length)];
    currentWinner = winner;
    giveawayActive = false;
    io.emit("giveaway-winner", winner);
  });

  socket.on("reset-giveaway", () => {
    participants = [];
    giveawayActive = false;
    currentWinner = null;
    userLikes = {};
    io.emit("giveaway-reset");
  });

  // Config updates
  socket.on("update-giveaway-config", (newConfig) => {
    giveawayConfig = { ...giveawayConfig, ...newConfig };
    try {
      fs.writeFileSync(CONFIG_FILE, JSON.stringify(giveawayConfig, null, 2));
    } catch (err) {
      console.error("⚠️ Failed to save config:", err.message);
    }
    io.emit("giveaway-config-updated", giveawayConfig);
  });

  socket.on("request-giveaway-state", () => {
    socket.emit("giveaway-state", {
      active: giveawayActive,
      participants,
      winner: currentWinner,
      config: giveawayConfig,
    });
  });

  socket.on("disconnect", () =>
    console.log("Frontend disconnected:", socket.id)
  );
});

