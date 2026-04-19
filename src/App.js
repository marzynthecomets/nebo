import { useState, useRef, useEffect } from "react";
import { processMessage, INITIAL_STATE } from "./neboEngine";
import "./App.css";

function App() {
  // "idle" | "naming" | "chatting"
  const [phase, setPhase] = useState("idle");
  const [chatLog, setChatLog] = useState([]);
  const [gameState, setGameState] = useState(INITIAL_STATE);
  const [inputValue, setInputValue] = useState("");
  const [latestNebo, setLatestNebo] = useState("");

  const chatEndRef = useRef(null);
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatLog]);

  function handleSend(text) {
    const trimmed = text.trim();
    if (!trimmed) return;
    setInputValue("");

    // IDLE: any input triggers greeting — Nebo peeks, Thoth speaks
    if (phase === "idle") {
      const result = processMessage("hello", INITIAL_STATE);
      setLatestNebo(result.messages[0]?.nebo || "");
      setChatLog(result.messages.map((m) => ({ type: "bot", thoth: m.thoth })));
      setGameState(result.newState);
      setPhase("naming");
      return;
    }

    // NAMING: this input is the kid's name — NOW Nebo comes out fully
    if (phase === "naming") {
      const result = processMessage(trimmed, gameState);
      const lastNebo = [...result.messages].reverse().find((m) => m.nebo);
      if (lastNebo) setLatestNebo(lastNebo.nebo);
      setChatLog((prev) => [
        ...prev,
        { type: "user", text: trimmed },
        ...result.messages.map((m) => ({ type: "bot", thoth: m.thoth })),
      ]);
      setGameState(result.newState);
      setPhase("chatting");
      return;
    }

    // CHATTING: normal flow
    const result = processMessage(trimmed, gameState);
    const lastNebo = [...result.messages].reverse().find((m) => m.nebo);
    if (lastNebo) setLatestNebo(lastNebo.nebo);
    setChatLog((prev) => [
      ...prev,
      { type: "user", text: trimmed },
      ...result.messages.map((m) => ({ type: "bot", thoth: m.thoth })),
    ]);
    setGameState(result.newState);
  }

  function handleKeyDown(e) {
    if (e.key === "Enter") handleSend(inputValue);
  }

  const isActive = phase !== "idle";

  return (
    <div className="nebo-container">

      {/* LAYER 1: Sky */}
      <div className="sky-layer">
        <div className="stars">
          {Array.from({ length: 25 }).map((_, i) => (
            <div
              key={i}
              className="star"
              style={{
                width: 2 + Math.random() * 2,
                height: 2 + Math.random() * 2,
                top: `${5 + Math.random() * 40}%`,
                left: `${10 + Math.random() * 80}%`,
                animationDelay: `${Math.random() * 3}s`,
                animationDuration: `${2 + Math.random() * 3}s`,
              }}
            />
          ))}
        </div>
      </div>

      <img src="/assets/backwall.png" alt="" className="full-layer" draggable={false} />
      <img src="/assets/fronthull.png" alt="" className="full-layer" draggable={false} />

      {/* Nebo:
          idle    = deeply hidden, just top of head peeking
          naming  = peeking (same as idle, hasn't earned a name yet)
          chatting = rises up into full view */}
      <img
        src="/assets/nebo.png"
        alt="Nebo the alien"
        className={`nebo-layer ${
          phase === "chatting" ? "nebo-active" :
          phase === "naming"   ? "nebo-peeking" :
                                 "nebo-idle"
        }`}
        draggable={false}
      />

      <img src="/assets/porthole_transp.png" alt="" className="full-layer" draggable={false} />

      {/* Nebo speech bubble — back up high, overlapping porthole is fine */}
      {isActive && latestNebo && (
        <div className="nebo-bubble">
          <p className="nebo-bubble-text">{latestNebo}</p>
        </div>
      )}

      {/* Thoth panel */}
      <div className="thoth-panel">

        {/* ^O^ avatar — overlaps top-left corner of panel */}
        <div className={`thoth-avatar ${isActive ? "thoth-avatar-active" : ""}`}>
          {isActive && <span className="thoth-emoticon">^O^</span>}
        </div>

        {/* Panel content */}
        <div className="panel-content">

          {/* Idle: narrative text, "Say hello?" on its own line */}
          {phase === "idle" && (
            <div className="narrative-block">
              <p className="narrative-text">
                You find a spaceship, and a mysterious glowing creature looks out at you.
              </p>
              <p className="narrative-prompt">Say hello?</p>
            </div>
          )}

          {/* Active: chat log */}
          {isActive && (
            <div className="chat-log-wrapper">
              <div className="chat-fade-top" />
              <div className="chat-log">
                {chatLog.map((entry, i) =>
                  entry.type === "user"
                    ? <p key={i} className="user-text">{entry.text}</p>
                    : <p key={i} className="thoth-text">{entry.thoth}</p>
                )}
                <div ref={chatEndRef} />
              </div>
            </div>
          )}

          {/* Input — always visible */}
          <div className="input-area">
            <div className="text-input-row">
              <input
                type="text"
                className="chat-input"
                placeholder="Type here..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                autoFocus
              />
              <button className="send-button" onClick={() => handleSend(inputValue)}>
                →
              </button>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}

export default App;