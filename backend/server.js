require("dotenv").config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const { WebcastPushConnection } = require("tiktok-live-connector");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

const PORT = process.env.PORT || 3001;
const TIKTOK_USERNAME = process.env.TIKTOK_USERNAME || "YOUR_TIKTOK_USERNAME";

app.get("/", (req, res) => res.send("TikTok Giveaway Backend is running!"));
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

// --- GIVEAWAY STATE ---
let participants = [];
let giveawayActive = false;
let currentWinner = null;

// Configurable entry options
let giveawayConfig = {
  enabled: { commands: true, gifts: true, likes: true },
  commands: ["!join", "!giveaway"], // case-insensitive
  gifts: ["Rose", "Diamond"], // names of gifts that count
  likeThreshold: 10, // number of likes to enter
};

// Track likes per user
let userLikes = {};

// Connect to TikTok
const tiktokConnection = new WebcastPushConnection(TIKTOK_USERNAME);
tiktokConnection.connect().then(() => {
  console.log(`Connected to TikTok live stream of @${TIKTOK_USERNAME}!`);
});

// --- LISTEN TO TIKTOK EVENTS ---
tiktokConnection.on("chat", (chatData) => {
  const message = chatData.comment.trim().toLowerCase();
  const user = chatData.uniqueId;

  // Commands entry
  if (giveawayActive && giveawayConfig.enabled.commands) {
    if (giveawayConfig.commands.some((cmd) => cmd.toLowerCase() === message)) {
      if (!participants.includes(user)) {
        participants.push(user);
        io.emit("participant-joined", user);
      }
    }
  }

  io.emit("new-chat", chatData);
});

tiktokConnection.on("gift", (giftData) => {
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

tiktokConnection.on("like", (likeData) => {
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

// --- SOCKET.IO EVENTS ---
io.on("connection", (socket) => {
  console.log("Frontend connected:", socket.id);

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

  // Allow frontend to update config
  socket.on("update-config", (newConfig) => {
    giveawayConfig = { ...giveawayConfig, ...newConfig };
    io.emit("config-updated", giveawayConfig);
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

