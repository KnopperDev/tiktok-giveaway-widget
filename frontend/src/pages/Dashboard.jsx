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

  const [editingConfig, setEditingConfig] = useState(config);
  const [tiktokUsername, setTiktokUsername] = useState(""); // for overlay link
  const [showOverlayLink, setShowOverlayLink] = useState(false);

  useEffect(() => {
    if (!socket) return;

    socket.emit("request-giveaway-state");

    socket.on("giveaway-state", ({ active, participants: p, winner: w, config: c }) => {
      setActive(active);
      setParticipants(p || []);
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

  useEffect(() => setEditingConfig(config), [config]);

  if (!socket) return <p>Connecting...</p>;

  const applyConfig = () => {
    const merged = { ...config, ...editingConfig };
    setConfig(merged);
    socket.emit("update-giveaway-config", merged);
  };

  const cancelEdit = () => setEditingConfig(config);

  const overlayLink =
    tiktokUsername.trim() !== ""
      ? `${window.location.origin}/overlay?username=${encodeURIComponent(tiktokUsername.trim())}`
      : "";

  const generateOverlayLink = () => {
    if (tiktokUsername.trim() === "") {
      alert("⚠️ Please enter your TikTok username first!");
      return;
    }
    setShowOverlayLink(true);
  };

  const copyOverlayLink = () => {
    if (!overlayLink) return;
    navigator.clipboard.writeText(overlayLink);
    alert("✅ Overlay link copied! You can now paste it into OBS or TikTok Live Studio.");
  };

  const testOverlay = () => {
    if (!overlayLink) return;
    window.open(overlayLink, "_blank");
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

      {/* Overlay link section */}
      <div className="overlay-link-section">
        <h2>🖥️ Overlay Link for OBS / TikTok Live Studio</h2>
        <label>Enter your TikTok username:</label>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <input
            type="text"
            value={tiktokUsername}
            onChange={(e) => setTiktokUsername(e.target.value)}
            placeholder="e.g. @streamer123 or streamer123"
            style={{ flex: 1 }}
          />
          <button onClick={generateOverlayLink} className="generate-link-btn">
            🔗 Generate Link
          </button>
        </div>
        {showOverlayLink && overlayLink && (
          <>
            <input type="text" readOnly value={overlayLink} className="overlay-url-input" />
            <div className="button-group">
              <button onClick={copyOverlayLink} className="copy-link-btn">
                📋 Copy Link
              </button>
              <button onClick={testOverlay} className="test-overlay-btn">
                🎬 Test Overlay
              </button>
            </div>
            <p className="help-text">
              Paste this link into your streaming software as a <strong>Browser Source</strong>.
            </p>
          </>
        )}
      </div>

      {/* Configurable entry options */}
      <div className="config">
        <h2>Entry Options</h2>

        <div>
          <label>
            <input
              type="checkbox"
              checked={editingConfig.enabled.commands}
              onChange={(e) =>
                setEditingConfig({
                  ...editingConfig,
                  enabled: { ...editingConfig.enabled, commands: e.target.checked },
                })
              }
            />{" "}
            Enable Commands
          </label>
          {editingConfig.enabled.commands && (
            <input
              type="text"
              value={editingConfig.commands.join(", ")}
              onChange={(e) =>
                setEditingConfig({
                  ...editingConfig,
                  commands: e.target.value.split(",").map((s) => s.trim()),
                })
              }
            />
          )}
        </div>

        <div className="mt-8">
          <label>
            <input
              type="checkbox"
              checked={editingConfig.enabled.gifts}
              onChange={(e) =>
                setEditingConfig({
                  ...editingConfig,
                  enabled: { ...editingConfig.enabled, gifts: e.target.checked },
                })
              }
            />{" "}
            Enable Gifts
          </label>
          {editingConfig.enabled.gifts && (
            <input
              type="text"
              value={editingConfig.gifts.join(", ")}
              onChange={(e) =>
                setEditingConfig({
                  ...editingConfig,
                  gifts: e.target.value.split(",").map((s) => s.trim()),
                })
              }
            />
          )}
        </div>

        <div className="mt-8">
          <label>
            <input
              type="checkbox"
              checked={editingConfig.enabled.likes}
              onChange={(e) =>
                setEditingConfig({
                  ...editingConfig,
                  enabled: { ...editingConfig.enabled, likes: e.target.checked },
                })
              }
            />{" "}
            Enable Likes
          </label>
          {editingConfig.enabled.likes && (
            <input
              type="number"
              value={editingConfig.likeThreshold}
              min={1}
              onChange={(e) =>
                setEditingConfig({
                  ...editingConfig,
                  likeThreshold: parseInt(e.target.value) || 1,
                })
              }
            />
          )}
        </div>

        <div className="config-actions">
          <button className="save-btn" onClick={applyConfig}>
            💾 Save Config
          </button>
          <button className="cancel-btn" onClick={cancelEdit}>
            ↩️ Cancel
          </button>
        </div>
      </div>

      {/* Participants */}
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
          🏆 Winner: <strong>{winner}</strong>
        </div>
      )}
    </div>
  );
}
