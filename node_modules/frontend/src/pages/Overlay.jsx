import React, { useEffect, useState, useRef } from "react";
import { useSocket } from "../context/useSocket";
import { Wheel } from "react-custom-roulette";
import "./Overlay.scss";

export default function Overlay() {
  const socket = useSocket();

  const [participants, setParticipants] = useState([]);
  const participantsRef = useRef([]);
  const [winner, setWinner] = useState(null);
  const [giveawayActive, setGiveawayActive] = useState(false);
  const [mustSpin, setMustSpin] = useState(false);
  const [prizeNumber, setPrizeNumber] = useState(0);

  useEffect(() => {
    if (!socket) return;

    socket.emit("request-giveaway-state");

    socket.on("giveaway-state", ({ active, participants: p, winner: w }) => {
      const list = p || [];
      setGiveawayActive(active);
      setParticipants(list);
      participantsRef.current = list;
      setWinner(w);
    });

    socket.on("participant-joined", (username) => {
      setParticipants((prev) => {
        const next = [...prev, username];
        participantsRef.current = next;
        return next;
      });
    });

    socket.on("giveaway-started", () => {
      participantsRef.current = [];
      setParticipants([]);
      setWinner(null);
      setGiveawayActive(true);
      setMustSpin(false);
    });

    socket.on("giveaway-winner", (username) => {
      const current = participantsRef.current || [];
      if (current.length === 0) {
        setWinner(username);
        return;
      }

      const index = current.indexOf(username);
      if (index >= 0) {
        setPrizeNumber(index);    // final index
        setWinner(null);          // hide winner until spin finishes

        // trigger spin on next frame to avoid backwards jump
        requestAnimationFrame(() => setMustSpin(true));
      } else {
        setWinner(username);
      }
    });

    socket.on("giveaway-reset", () => {
      participantsRef.current = [];
      setParticipants([]);
      setWinner(null);
      setGiveawayActive(false);
      setMustSpin(false);
    });

    return () => {
      socket.off("giveaway-state");
      socket.off("participant-joined");
      socket.off("giveaway-started");
      socket.off("giveaway-winner");
      socket.off("giveaway-reset");
    };
  }, [socket]);

  if (!socket) return <p>Connecting...</p>;

  const wheelData =
    participants.length > 0
      ? participants.map((name) => ({ option: name }))
      : [{ option: "Waiting for participants..." }];

  return (
    <div className="overlay-root">
      <h1>Giveaway Wheel</h1>
      {giveawayActive ? <p>Giveaway is live! Viewers type !join to enter.</p> : <p>Waiting for giveaway to start...</p>}

      <div className="overlay-wheel">
        <div className="wheel-decoration top-left">✨</div>
        <div className="wheel-decoration top-right">🎊</div>
        <div className="wheel-decoration bottom-left">🎉</div>
        <div className="wheel-decoration bottom-right">✨</div>

        <div className="wheel-container">
          {wheelData.length > 0 && (
            <Wheel
              mustStartSpinning={mustSpin && participants.length > 0}
              prizeNumber={prizeNumber}
              data={wheelData}
              backgroundColors={[
                "#667eea", // Purple-blue
                "#f093fb", // Pink
                "#4facfe", // Sky blue
                "#ffd700", // Gold
                "#43e97b", // Green
                "#fa709a", // Rose
                "#764ba2", // Deep purple
                "#f5576c", // Coral red
              ]}
              textColors={["#ffffff"]}
              outerBorderColor="#667eea"
              outerBorderWidth={8}
              innerBorderColor="#ffffff"
              innerBorderWidth={4}
              radiusLineColor="#ffffff"
              radiusLineWidth={2}
              fontSize={16}
              textDistance={60}
              spinDuration={0.5}
              startingOptionIndex={0}
              perpendicularText={false}
              pointerProps={{
                style: { display: 'none' }
              }}
              onStopSpinning={() => {
                setMustSpin(false);
                if (participantsRef.current.length > 0) {
                  setWinner(participantsRef.current[prizeNumber]);
                }
              }}
            />
          )}
        </div>

        <div className="wheel-pointer">▼</div>
      </div>

      {winner && (
        <div className="overlay-winner">
          Winner: <strong>{winner}</strong>
        </div>
      )}
    </div>
  );
}
