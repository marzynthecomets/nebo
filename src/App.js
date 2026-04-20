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
 * NEBO — App v3 (Figma-accurate)
 * ============================================================
 *
 * Mars! Key structural change:
 *
 * The ship layers (sky, backwall, fronthull, porthole) ALWAYS
 * render — they're never removed from the DOM. During the
 * scanning phase:
 *   - Nebo gets className "nebo-scanning" (moves to top-right)
 *   - The Thoth panel is hidden
 *   - The speech bubble is hidden
 *   - A .scanner-overlay sits on top of the ship layers
 *     with near-opaque black, containing the scanner UI
 *
 * This matches your Figma where the hull edges peek through.
 *
 * Phases:
 *   "idle"     → narrative text, waiting for hello
 *   "naming"   → Nebo peeking, waiting for name
 *   "chatting" → normal yes/no conversation
 *   "picking"  → state/city dropdowns visible
 *   "scanning" → scanner overlay on top of ship
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

  // Learn state (star facts shown inline in scanner dialogue)
  const [learnStars, setLearnStars] = useState([]);

  // Scanner tray dialogue (separate from main chatLog)
  const [scannerDialogue, setScannerDialogue] = useState("");

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
    setScannerDialogue("");

    // Look up coordinates
    let lat = DEFAULT_LOCATION.lat;
    let lon = DEFAULT_LOCATION.lon;

    if (state.city && state.city !== "New York City") {
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

    // Set scanner dialogue — exact copy from Figma design,
    // plus list the star names so the kid knows what to type
    const starNames = stars.map((s) => s.name).join(", ");
    setScannerDialogue(
      `Learning about the stars will help us get home! Which star do you want to learn more about? ${starNames}`
    );

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

    // Scanning phase — kid can type a star name OR yes/no
    if (phase === "scanning") {
      // First, check if they typed a star name
      const matchedStar = learnStars.find(
        (s) => s.name.toLowerCase() === trimmed.toLowerCase()
      );

      if (matchedStar) {
        // Show the star fact in the scanner dialogue
        setScannerDialogue(matchedStar.fact + " Want to scan again?");
        setEmoticon(EMOTICONS.excited);
        // Move to stage 5 so yes/no works for "scan again?"
        setGameState((prev) => ({ ...prev, stage: 5 }));
        return;
      }

      // Otherwise, check for yes/no (scan again / exit)
      const result = processMessage(trimmed, gameState);

      // If rescan triggered, stay in scanner
      if (result.showScanResult) {
        triggerScan(result.newState);
        return;
      }

      // Otherwise exit scanner → back to chatting
      const lastNebo = [...result.messages].reverse().find((m) => m.nebo);
      if (lastNebo) setLatestNebo(lastNebo.nebo);
      const lastEmoticon = [...result.messages].reverse().find((m) => m.emoticon);
      if (lastEmoticon) setEmoticon(lastEmoticon.emoticon);

      setChatLog((prev) => [
        ...prev,
        { type: "user", text: trimmed },
        ...result.messages.map((m) => ({ type: "bot", thoth: m.thoth })),
      ]);
      setGameState(result.newState);
      setPhase("chatting");
      return;
    }

    // Chatting or picking — normal flow
    const result = processMessage(trimmed, gameState);
    applyResult(result, trimmed);
  }

  // ---- City picker handlers ----
  function handleStateChange(e) {
    setSelectedState(e.target.value);
    setSelectedCity("");
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

  function handleKeyDown(e) {
    if (e.key === "Enter") handleSend(inputValue);
  }

  // "Active" means we show the Thoth panel with chat — NOT during scanning
  const isActive = phase !== "idle" && phase !== "scanning";
  const cities = selectedState ? getCitiesForState(selectedState) : [];

  return (
    <div className="nebo-container">

      {/* ============================================================
       * SHIP LAYERS — always rendered, even during scanning
       * The scanner overlay sits on top with near-opaque black
       * so the hull edges peek through at the sides.
       * ============================================================ */}

      {/* Sky */}
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

      {/* Nebo — class changes based on phase */}
      <img
        src="/assets/nebo.png"
        alt="Nebo the alien"
        className={`nebo-layer ${
          phase === "idle"     ? "nebo-idle" :
          phase === "naming"   ? "nebo-peeking" :
          phase === "scanning" ? "nebo-scanning" :
                                 "nebo-active"
        }`}
        draggable={false}
      />

      <img src="/assets/porthole_transp.png" alt="" className="full-layer porthole" draggable={false} />

      {/* Nebo speech bubble — hidden during scanning */}
      {isActive && latestNebo && (
        <div className="nebo-bubble">
          <p className="nebo-bubble-text">{latestNebo}</p>
        </div>
      )}

      {/* ============================================================
       * SCANNER OVERLAY — only during scanning phase
       * Sits on top of ship layers (z-index 15)
       * ============================================================ */}
      {phase === "scanning" && (
        <div className="scanner-overlay">
          {/* Header */}
          <div className="scanner-header">
            <h1 className="scanner-title">Star Scanner</h1>
            <p className="scanner-subtitle">
              Scanning the skies above {gameState.city || "New York City"}...
            </p>
          </div>

          {/* API results box */}
          <div className="scanner-results-box">
            {starChartLoading ? (
              <div className="scanner-loading">
                <div className="scanner-beam" />
                <p className="scanner-beam-text">Scanning the sky...</p>
              </div>
            ) : starChartUrl ? (
              <img
                src={starChartUrl}
                alt="Star chart of the sky above you"
              />
            ) : (
              <p className="scanner-results-placeholder">
                Nebo's scanner found stars above you!
              </p>
            )}
          </div>

          {/* Thoth dialogue section */}
          <div className="scanner-thoth-section">
            <div className="scanner-thoth-avatar">
              <span className="scanner-thoth-emoticon">
                {emoticon || EMOTICONS.excited}
              </span>
            </div>
            <div className="scanner-thoth-body">
              <p className="scanner-thoth-label">Thoth:</p>
              <p className="scanner-thoth-text">
                {scannerDialogue || "Scanning the sky above you..."}
              </p>
            </div>
          </div>

          {/* Input — for "scan again?" yes/no */}
          <div className="scanner-input-area">
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
      )}

      {/* ============================================================
       * THOTH PANEL — conversation view (idle, naming, chatting, picking)
       * Hidden during scanning (scanner overlay replaces it)
       * ============================================================ */}
      {phase !== "scanning" && (
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
                {chatLog.length > 4 && <div className="chat-fade-top" />}
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

            {/* City picker — shown during picking phase */}
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
      )}


    </div>
  );
}

export default App;