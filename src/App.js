import { useState, useRef, useEffect } from "react";
import {
  processMessage,
  processCitySelection,
  processSkip,
  processScanComplete,
  getStarsForCity,
  EMOTICONS,
  INITIAL_STATE,
} from "./neboEngine";
import { STATE_NAMES, getCitiesForState, getCoordinates, DEFAULT_LOCATION } from "./usCities";
import "./App.css";

/*
 * ============================================================
 * NEBO — App
 * ============================================================
 *
 * Mars! Here's the updated flow:
 *
 * Phases:
 *   "idle"     → narrative text, waiting for hello
 *   "naming"   → Nebo peeking, waiting for name
 *   "chatting"  → normal yes/no conversation
 *   "picking"   → state/city dropdowns visible
 *   "scanning"  → star chart loading/displayed
 *
 * The Thoth emoticon now updates dynamically from the engine.
 * ============================================================
 */

function App() {
  const [phase, setPhase] = useState("idle");
  const [chatLog, setChatLog] = useState([]);
  const [gameState, setGameState] = useState(INITIAL_STATE);
  const [inputValue, setInputValue] = useState("");
  const [latestNebo, setLatestNebo] = useState("");
  const [emoticon, setEmoticon] = useState("");

  // City picker state
  const [selectedState, setSelectedState] = useState("");
  const [selectedCity, setSelectedCity] = useState("");

  // Star chart state
  const [starChartUrl, setStarChartUrl] = useState("");
  const [starChartLoading, setStarChartLoading] = useState(false);

  // Learn overlay state
  const [showLearnOverlay, setShowLearnOverlay] = useState(false);
  const [learnStars, setLearnStars] = useState([]);
  const [selectedStar, setSelectedStar] = useState(null);

  const chatEndRef = useRef(null);
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatLog]);

  // ---- Helper: apply engine result to UI state ----
  function applyResult(result, userText = null) {
    const lastNebo = [...result.messages].reverse().find((m) => m.nebo);
    if (lastNebo) setLatestNebo(lastNebo.nebo);

    const lastEmoticon = [...result.messages].reverse().find((m) => m.emoticon);
    if (lastEmoticon) setEmoticon(lastEmoticon.emoticon);

    setChatLog((prev) => [
      ...(userText ? [...prev, { type: "user", text: userText }] : prev),
      ...result.messages.map((m) => ({ type: "bot", thoth: m.thoth })),
    ]);

    setGameState(result.newState);

    // Phase transitions based on engine signals
    if (result.showCityPicker) {
      setPhase("picking");
    } else if (result.showScanResult) {
      triggerScan(result.newState);
    } else if (result.newState.stage === 1) {
      setPhase("naming");
    } else if (result.newState.stage >= 2) {
      setPhase("chatting");
    }
  }

  // ---- Trigger the star chart scan ----
  async function triggerScan(state) {
    setPhase("scanning");
    setStarChartLoading(true);

    // Look up coordinates
    let lat = DEFAULT_LOCATION.lat;
    let lon = DEFAULT_LOCATION.lon;

    if (state.city && state.city !== "New York City") {
      // Try to find in our database
      for (const stateName of STATE_NAMES) {
        const coords = getCoordinates(stateName, state.city);
        if (coords) {
          lat = coords.lat;
          lon = coords.lon;
          break;
        }
      }
    }

    // Get stars for the overlay
    const stars = getStarsForCity(state.city || "New York City", state.scanCount);
    setLearnStars(stars);

    // Call the Netlify function for the star chart
    try {
      const response = await fetch(
        `/.netlify/functions/star-scan?lat=${lat}&lon=${lon}`
      );

      if (response.ok) {
        const data = await response.json();
        setStarChartUrl(data.imageUrl);
      } else {
        // Fallback: use a placeholder
        console.warn("Star chart API failed, using fallback");
        setStarChartUrl("");
      }
    } catch (err) {
      console.warn("Star chart fetch failed:", err);
      setStarChartUrl("");
    }

    setStarChartLoading(false);

    // Tell the engine the scan is done
    const scanDone = processScanComplete(state);
    const lastNebo = [...scanDone.messages].reverse().find((m) => m.nebo);
    if (lastNebo) setLatestNebo(lastNebo.nebo);
    const lastEmoticon = [...scanDone.messages].reverse().find((m) => m.emoticon);
    if (lastEmoticon) setEmoticon(lastEmoticon.emoticon);

    setChatLog((prev) => [
      ...prev,
      ...scanDone.messages.map((m) => ({ type: "bot", thoth: m.thoth })),
    ]);
    setGameState(scanDone.newState);
  }

  // ---- Send text message ----
  function handleSend(text) {
    const trimmed = text.trim();
    if (!trimmed) return;
    setInputValue("");

    if (phase === "idle") {
      const result = processMessage("hello", INITIAL_STATE);
      setLatestNebo(result.messages[0]?.nebo || "");
      setEmoticon(result.messages[0]?.emoticon || EMOTICONS.neutral);
      setChatLog(result.messages.map((m) => ({ type: "bot", thoth: m.thoth })));
      setGameState(result.newState);
      setPhase("naming");
      return;
    }

    if (phase === "naming") {
      const result = processMessage(trimmed, gameState);
      applyResult(result, trimmed);
      return;
    }

    // Chatting or scanning — normal flow
    const result = processMessage(trimmed, gameState);
    applyResult(result, trimmed);
  }

  // ---- City picker handlers ----
  function handleStateChange(e) {
    setSelectedState(e.target.value);
    setSelectedCity(""); // Reset city when state changes
  }

  function handleCityChange(e) {
    setSelectedCity(e.target.value);
  }

  function handleCitySubmit() {
    if (!selectedCity || !selectedState) return;
    const result = processCitySelection(selectedCity, gameState);
    applyResult(result);
    setSelectedState("");
    setSelectedCity("");
  }

  function handleSkip() {
    const result = processSkip(gameState);
    applyResult(result);
    setSelectedState("");
    setSelectedCity("");
  }

  // ---- Learn overlay handlers ----
  function handleLearnOpen() {
    setShowLearnOverlay(true);
    setSelectedStar(null);
  }

  function handleStarSelect(star) {
    setSelectedStar(star);
  }

  function handleLearnClose() {
    setShowLearnOverlay(false);
    setSelectedStar(null);
  }

  function handleKeyDown(e) {
    if (e.key === "Enter") handleSend(inputValue);
  }

  const isActive = phase !== "idle";
  const cities = selectedState ? getCitiesForState(selectedState) : [];

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

      <img
        src="/assets/nebo.png"
        alt="Nebo the alien"
        className={`nebo-layer ${
          phase === "idle"   ? "nebo-idle" :
          phase === "naming" ? "nebo-peeking" :
                               "nebo-active"
        }`}
        draggable={false}
      />

      <img src="/assets/porthole_transp.png" alt="" className="full-layer porthole" draggable={false} />

      {/* Nebo speech bubble */}
      {isActive && latestNebo && (
        <div className="nebo-bubble">
          <p className="nebo-bubble-text">{latestNebo}</p>
        </div>
      )}

      {/* Star chart display — overlays above the panel when scanning */}
      {phase === "scanning" && (
        <div className="star-chart-area">
          {starChartLoading ? (
            <div className="star-chart-loading">
              <div className="scanner-beam" />
              <p className="scanner-text">Scanning the sky...</p>
            </div>
          ) : starChartUrl ? (
            <img
              src={starChartUrl}
              alt="Star chart of the sky above you"
              className="star-chart-image"
            />
          ) : (
            <div className="star-chart-placeholder">
              <p className="scanner-text">
                Nebo's scanner found stars above you!
              </p>
            </div>
          )}
          <button className="learn-button" onClick={handleLearnOpen}>
            Learn about these stars
          </button>
        </div>
      )}

      {/* Thoth panel */}
      <div className="thoth-panel">

        {/* Thoth avatar with dynamic emoticon */}
        <div className={`thoth-avatar ${isActive ? "thoth-avatar-active" : ""}`}>
          {isActive && (
            <span className="thoth-emoticon">{emoticon || EMOTICONS.neutral}</span>
          )}
        </div>

        {/* Panel content */}
        <div className="panel-content">

          {/* Idle: narrative text */}
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

          {/* City picker — shown at stage 3 */}
          {phase === "picking" && (
            <div className="city-picker">
              <div className="picker-row">
                <select
                  className="picker-select"
                  value={selectedState}
                  onChange={handleStateChange}
                >
                  <option value="">State...</option>
                  {STATE_NAMES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                <select
                  className="picker-select"
                  value={selectedCity}
                  onChange={handleCityChange}
                  disabled={!selectedState}
                >
                  <option value="">City...</option>
                  {cities.map((c) => (
                    <option key={c.city} value={c.city}>{c.city}</option>
                  ))}
                </select>
              </div>
              <div className="picker-buttons">
                <button
                  className="picker-submit"
                  onClick={handleCitySubmit}
                  disabled={!selectedCity}
                >
                  Launch Scanner
                </button>
                <button className="picker-skip" onClick={handleSkip}>
                  Skip
                </button>
              </div>
            </div>
          )}

          {/* Text input — hidden during city picking */}
          {phase !== "picking" && (
            <div className="input-area">
              <div className="text-input-row">
                <input
                  type="text"
                  className="chat-input"
                  placeholder={
                    phase === "idle" ? "Say hello..." :
                    phase === "naming" ? "Type your name..." :
                    "Type here..."
                  }
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
          )}

        </div>
      </div>

      {/* ============================================================
       * Learn Overlay — slides up from bottom
       * ============================================================ */}
      {showLearnOverlay && (
        <div className="learn-overlay" onClick={handleLearnClose}>
          <div className="learn-panel" onClick={(e) => e.stopPropagation()}>

            <button className="learn-close" onClick={handleLearnClose}>×</button>

            <h2 className="learn-title">
              {selectedStar ? selectedStar.name : "Stars Above You"}
            </h2>

            {!selectedStar ? (
              /* Star list */
              <div className="learn-star-list">
                <p className="learn-subtitle">
                  Nebo found these stars! Tap one to learn more.
                </p>
                {learnStars.map((star, i) => (
                  <button
                    key={i}
                    className="learn-star-button"
                    onClick={() => handleStarSelect(star)}
                  >
                    {star.name}
                  </button>
                ))}
              </div>
            ) : (
              /* Star detail */
              <div className="learn-star-detail">
                <p className="learn-fact">{selectedStar.fact}</p>
                <button
                  className="learn-back"
                  onClick={() => setSelectedStar(null)}
                >
                  ← Back to all stars
                </button>
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
}

export default App;