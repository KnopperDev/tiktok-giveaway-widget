import { useEffect, useState } from "react";
import { io } from "socket.io-client";

function App() {
  const [socket, setSocket] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [winner, setWinner] = useState(null);
  const [giveawayActive, setGiveawayActive] = useState(false);

  useEffect(() => {
    const s = io("http://localhost:3001");
    setSocket(s);

    s.on("participant-joined", (username) => {
      setParticipants((prev) => [...prev, username]);
    });

    s.on("giveaway-started", () => {
      setParticipants([]);
      setWinner(null);
      setGiveawayActive(true);
    });

    s.on("giveaway-winner", (username) => {
      setWinner(username);
      setGiveawayActive(false);
    });

    s.on("giveaway-reset", () => {
      setParticipants([]);
      setWinner(null);
      setGiveawayActive(false);
    });

    return () => s.disconnect();
  }, []);

  // UI
  return (
    <div style={{ fontFamily: "sans-serif", background: "#111", color: "white", padding: "2rem", height: "100vh" }}>
      <h1>🎁 TikTok Giveaway Widget</h1>

      {giveawayActive ? (
        <p>Giveaway is active — viewers can type <strong>!join</strong> in chat!</p>
      ) : (
        <p>No giveaway running.</p>
      )}

      <div style={{ marginTop: "2rem" }}>
        <h2>Participants ({participants.length})</h2>
        <ul>
          {participants.map((p, i) => (
            <li key={i}>{p}</li>
          ))}
        </ul>
      </div>

      {winner && (
        <div style={{ marginTop: "2rem", fontSize: "1.5rem", color: "gold" }}>
          🏆 Winner: <strong>{winner}</strong>
        </div>
      )}

      <div style={{ marginTop: "2rem" }}>
        <button onClick={() => socket.emit("start-giveaway")}>Start Giveaway</button>
        <button onClick={() => socket.emit("draw-winner")}>Draw Winner</button>
        <button onClick={() => socket.emit("reset-giveaway")}>Reset</button>
      </div>
    </div>
  );
}

export default App;
