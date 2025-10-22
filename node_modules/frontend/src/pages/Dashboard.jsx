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

  // Local editing state so we don't immediately push changes until user clicks Save
  const [editingConfig, setEditingConfig] = useState(config);

  // Sync editingConfig when main config updates from server
  useEffect(() => setEditingConfig(config), [config]);

  if (!socket) return <p>Connecting...</p>;

  const applyConfig = () => {
    const merged = { ...config, ...editingConfig };
    setConfig(merged);
    socket.emit("update-giveaway-config", merged);
  };

  const cancelEdit = () => setEditingConfig(config);

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
              checked={editingConfig.enabled.commands}
              onChange={(e) => setEditingConfig({ ...editingConfig, enabled: { ...editingConfig.enabled, commands: e.target.checked } })}
            />{" "}
            Enable Commands
          </label>
          {editingConfig.enabled.commands && (
            <input
              type="text"
              value={editingConfig.commands.join(", ")}
              onChange={(e) => setEditingConfig({ ...editingConfig, commands: e.target.value.split(",").map((s) => s.trim()) })}
            />
          )}
        </div>

        <div className="mt-8">
          <label>
            <input
              type="checkbox"
              checked={editingConfig.enabled.gifts}
              onChange={(e) => setEditingConfig({ ...editingConfig, enabled: { ...editingConfig.enabled, gifts: e.target.checked } })}
            />{" "}
            Enable Gifts
          </label>
          {editingConfig.enabled.gifts && (
            <input
              type="text"
              value={editingConfig.gifts.join(", ")}
              onChange={(e) => setEditingConfig({ ...editingConfig, gifts: e.target.value.split(",").map((s) => s.trim()) })}
            />
          )}
        </div>

        <div className="mt-8">
          <label>
            <input
              type="checkbox"
              checked={editingConfig.enabled.likes}
              onChange={(e) => setEditingConfig({ ...editingConfig, enabled: { ...editingConfig.enabled, likes: e.target.checked } })}
            />{" "}
            Enable Likes
          </label>
          {editingConfig.enabled.likes && (
            <input
              type="number"
              value={editingConfig.likeThreshold}
              min={1}
              onChange={(e) => setEditingConfig({ ...editingConfig, likeThreshold: parseInt(e.target.value) || 1 })}
            />
          )}
        </div>

        <div className="config-actions">
          <button className="save-btn" onClick={applyConfig}>💾 Save Config</button>
          <button className="cancel-btn" onClick={cancelEdit}>↩️ Cancel</button>
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
