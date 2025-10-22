import { useEffect, useState } from "react";
import { useSocket } from "../context/useSocket";
import "./Dashboard.scss";

export default function Dashboard() {
  const socket = useSocket();
  const [participants, setParticipants] = useState([]);
  const [winner, setWinner] = useState(null);
  const [active, setActive] = useState(false);
  const [config, setConfig] = useState({
    enabled: { commands: true, gifts: true, likes: true },
    commands: ["!join", "!giveaway"],
    gifts: ["Rose"],
    likeThreshold: 10,
  });

  useEffect(() => {
    if (!socket) return;

    socket.emit("request-giveaway-state");

    socket.on("giveaway-state", ({ active, participants: p, winner: w, config: c }) => {
      setActive(active);
      setParticipants(p);
      setWinner(w);
      if (c) setConfig(c);
    });

    socket.on("participant-joined", (username) => setParticipants((prev) => [...prev, username]));
    socket.on("giveaway-started", () => {
      setActive(true);
      setParticipants([]);
      setWinner(null);
    });
    socket.on("giveaway-winner", (username) => {
      setWinner(username);
      setActive(false);
    });
    socket.on("giveaway-reset", () => {
      setActive(false);
      setParticipants([]);
      setWinner(null);
    });

    socket.on("giveaway-config-updated", (c) => setConfig(c));

    return () => {
      socket.off("giveaway-state");
      socket.off("participant-joined");
      socket.off("giveaway-started");
      socket.off("giveaway-winner");
      socket.off("giveaway-reset");
      socket.off("giveaway-config-updated");
    };
  }, [socket]);

  if (!socket) return <p>Connecting...</p>;

  const updateConfig = (newConfig) => {
    const merged = { ...config, ...newConfig };
    setConfig(merged);
    socket.emit("update-giveaway-config", merged);
  };

  return (
    <div className="dashboard">
      <h1>🎛️ Giveaway Dashboard</h1>
      <p>Status: {active ? "🟢 Active" : "🔴 Inactive"}</p>

      <div className="controls">
        <button onClick={() => socket.emit("start-giveaway")}>Start Giveaway</button>
        <button onClick={() => socket.emit("draw-winner")} disabled={!active || participants.length === 0}>
          Draw Winner
        </button>
        <button onClick={() => socket.emit("reset-giveaway")}>Reset</button>
      </div>

      {/* Configurable entry options */}
      <div className="config">
        <h2>Entry Options</h2>

        <div>
          <label>
            <input
              type="checkbox"
              checked={config.enabled.commands}
              onChange={(e) => updateConfig({ enabled: { ...config.enabled, commands: e.target.checked } })}
            />{" "}
            Enable Commands
          </label>
          {config.enabled.commands && (
            <input
              type="text"
              value={config.commands.join(", ")}
              onChange={(e) => updateConfig({ commands: e.target.value.split(",").map((s) => s.trim()) })}
            />
          )}
        </div>

        <div className="mt-8">
          <label>
            <input
              type="checkbox"
              checked={config.enabled.gifts}
              onChange={(e) => updateConfig({ enabled: { ...config.enabled, gifts: e.target.checked } })}
            />{" "}
            Enable Gifts
          </label>
          {config.enabled.gifts && (
            <input
              type="text"
              value={config.gifts.join(", ")}
              onChange={(e) => updateConfig({ gifts: e.target.value.split(",").map((s) => s.trim()) })}
            />
          )}
        </div>

        <div className="mt-8">
          <label>
            <input
              type="checkbox"
              checked={config.enabled.likes}
              onChange={(e) => updateConfig({ enabled: { ...config.enabled, likes: e.target.checked } })}
            />{" "}
            Enable Likes
          </label>
          {config.enabled.likes && (
            <input
              type="number"
              value={config.likeThreshold}
              min={1}
              onChange={(e) => updateConfig({ likeThreshold: parseInt(e.target.value) || 1 })}
            />
          )}
        </div>
      </div>
      <div className="participants">
        <h2>Participants ({participants.length})</h2>
        <ul>
          {participants.map((p, i) => (
            <li key={i}>{p}</li>
          ))}
        </ul>
      </div>

      {winner && (
        <div className="winner">
          🏆 Winner: {winner}
        </div>
      )}
    </div>
  );
}
