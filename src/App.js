import { useState, useRef, useEffect, useCallback } from "react";
import {
  processMessage,
  processCitySelection,
  processSkip,
  processScanComplete,
  pickConstellation,
  getStarsForConstellation,
  getConstellationName,
  getShuffledFacts,
  fuzzyMatch,
  translateLine,
  EMOTICONS,
  INITIAL_STATE,
} from "./neboEngine";
import { STATE_NAMES, getCitiesForState, getCoordinates, DEFAULT_LOCATION } from "./usCities";
import { speakAsThoth, cancelThothSpeech } from "./thothSpeech";
import { playNeboChirps, cancelNeboChirps, startScanPings, stopScanPings, playScanPing } from "./neboChirps";  // ← NEW: Nebo's voice!
import "./App.css";

/*
 * ============================================================
 * NEBO — App v4 (Audio Integration)
 * ============================================================
 *
 * Changes from v3:
 * - ★ Thoth speech (Web Speech API / Polly-ready)
 * - ★ Nebo chirps (Web Audio API synthesizer)
 * - ★ Sequential audio: Nebo chirps first → Thoth speaks after
 * - Dialogue tweaks (scanner launch, back-to-constellation)
 * ============================================================
 */

// Fallback star chart URL — cached Orion chart in case API is slow/down
const FALLBACK_CHART_URL = "/assets/fallback-starchart.png";

// API timeout in milliseconds
const API_TIMEOUT = 20000;

// Common city abbreviations/shorthands
const CITY_SHORTHANDS = {
  "la": "Los Angeles", "nyc": "New York City", "sf": "San Francisco",
  "atl": "Atlanta", "chi": "Chicago", "phx": "Phoenix", "philly": "Philadelphia",
  "dc": "Washington", "nola": "New Orleans", "lv": "Las Vegas", "kc": "Kansas City",
  "stl": "St. Louis", "slc": "Salt Lake City", "det": "Detroit", "bos": "Boston",
  "pdx": "Portland", "sea": "Seattle", "den": "Denver", "hou": "Houston",
  "dal": "Dallas", "sa": "San Antonio", "sd": "San Diego", "tb": "Tampa",
  "jax": "Jacksonville", "mem": "Memphis", "nash": "Nashville", "cle": "Cleveland",
  "pgh": "Pittsburgh", "mke": "Milwaukee", "mpls": "Minneapolis", "indy": "Indianapolis",
};

function expandCityShorthand(input) {
  const lower = input.toLowerCase().trim();
  return CITY_SHORTHANDS[lower] || null;
}

function App() {
  const [phase, setPhase] = useState("title");
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

  // Loading facts state
  const [loadingFact, setLoadingFact] = useState("");
  const loadingFactsRef = useRef([]);
  const loadingIntervalRef = useRef(null);

  // Scanner state
  const [scannerDialogue, setScannerDialogue] = useState("");
  const [scannerSpeech, setScannerSpeech] = useState("");
  const [scannerStars, setScannerStars] = useState([]);
  const [scannerConstellationName, setScannerConstellationName] = useState("");
  const [showingFact, setShowingFact] = useState(false);
  const [selectedStarName, setSelectedStarName] = useState("");

  // Desktop detection for auto-focus
  const isDesktop = typeof window !== "undefined" && window.innerWidth > 768;

  const chatEndRef = useRef(null);
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatLog]);

  // ============================================================
  // ★ THOTH SPEECH — Chat log
  // ============================================================
  // Watches chatLog. When a new Thoth message appears, speaks it.
  // NOTE: Thoth's text only gets added to chatLog AFTER Nebo's
  // chirps finish (see applyResult), so the timing is:
  // Nebo chirps → Thoth text appears → Thoth speaks
  // ============================================================
  useEffect(() => {
    const last = chatLog[chatLog.length - 1];
    if (last && last.type === "bot") {
      speakAsThoth(last.thoth);
    }
  }, [chatLog]);

  // ============================================================
  // ★ THOTH SPEECH — Scanner dialogue
  // ============================================================
  useEffect(() => {
    if (scannerSpeech) {
      speakAsThoth(scannerSpeech);
    }
  }, [scannerSpeech]);

  // ============================================================
  // ★ CLEANUP — Stop all audio when leaving the page
  // ============================================================
  useEffect(() => {
    return () => {
      cancelThothSpeech();
      cancelNeboChirps();
      stopScanPings();
    };
  }, []);

  // ---- Start loading facts rotation ----
  const startLoadingFacts = useCallback(() => {
    const facts = getShuffledFacts();
    loadingFactsRef.current = facts;
    let index = 0;
    setLoadingFact(facts[0]);

    function scheduleNext() {
      const currentFact = facts[index];
      const delay = currentFact.length > 80 ? 5500 : 4000;
      loadingIntervalRef.current = setTimeout(() => {
        index = (index + 1) % facts.length;
        setLoadingFact(facts[index]);
        scheduleNext();
      }, delay);
    }
    scheduleNext();
  }, []);

  const stopLoadingFacts = useCallback(() => {
    if (loadingIntervalRef.current) {
      clearTimeout(loadingIntervalRef.current);
      loadingIntervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => stopLoadingFacts();
  }, [stopLoadingFacts]);

  // ============================================================
  // ★ SEQUENTIAL AUDIO — The heart of the Nebo/Thoth performance
  // ============================================================
  //
  // This is the key change. Instead of dumping everything at once:
  //
  // 1. Add user's message to chat (if any)
  // 2. Update Nebo's bubble + emoticon
  // 3. Play Nebo's chirps (mapped to mood + text length)
  // 4. Wait for chirps to finish
  // 5. THEN add Thoth's text to chatLog (which triggers speech)
  // 6. Update game state and phase
  //
  // Mars — this uses async/await. "await" just means "pause here
  // until this thing finishes." Summer topic!
  // ============================================================
  async function applyResult(result, userText = null) {
    // Step 1: Add user's message to chat immediately (if they typed something)
    if (userText) {
      setChatLog((prev) => [...prev, { type: "user", text: userText }]);
    }

    // Step 2: Update Nebo's bubble and emoticon right away
    const lastNebo = [...result.messages].reverse().find((m) => m.nebo);
    if (lastNebo) setLatestNebo(lastNebo.nebo);

    const lastEmoticon = [...result.messages].reverse().find((m) => m.emoticon);
    const currentEmoticon = lastEmoticon ? lastEmoticon.emoticon : emoticon;
    if (lastEmoticon) setEmoticon(lastEmoticon.emoticon);

    // Step 3: Play Nebo's chirps and wait for them to finish
    if (lastNebo && lastNebo.nebo) {
      await playNeboChirps(lastNebo.nebo, currentEmoticon);
    }

    // Step 4: NOW add Thoth's text to chatLog (triggers speech via useEffect)
    setChatLog((prev) => [
      ...prev,
      ...result.messages.map((m) => ({ type: "bot", thoth: m.thoth })),
    ]);

    // Step 5: Update game state
    setGameState(result.newState);

    // Step 6: Phase transitions
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
    setScannerSpeech("");
    setStarChartUrl("");
    setShowingFact(false);

    // Cancel any ongoing audio
    cancelThothSpeech();
    cancelNeboChirps();

    startLoadingFacts();
    startScanPings();  // ★ Sonar pings while scanning

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

    const constellationId = pickConstellation(
      state.city || "New York City",
      state.scanCount,
      state.seenConstellations || []
    );

    const chartConstellation = constellationId || "umi";
    const stars = getStarsForConstellation(chartConstellation);
    setScannerStars(stars);
    setScannerConstellationName(getConstellationName(chartConstellation));

    // ★ Minimum loading time so kids see a few space facts
    // The API fetch and the timer run in parallel — we wait for BOTH
    const minLoadingTime = new Promise((resolve) => setTimeout(resolve, 8000));

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), API_TIMEOUT);

      const response = await fetch(
        `https://neboscanner.netlify.app/.netlify/functions/star-scan?lat=${lat}&lon=${lon}&constellation=${chartConstellation}`,
        { signal: controller.signal }
      );

      clearTimeout(timeout);

      if (response.ok) {
        const data = await response.json();
        setStarChartUrl(data.imageUrl || FALLBACK_CHART_URL);
      } else {
        console.warn("Star chart API failed, using fallback");
        setStarChartUrl(FALLBACK_CHART_URL);
      }
    } catch (err) {
      if (err.name === "AbortError") {
        console.warn("Star chart API timed out, using fallback");
      } else {
        console.warn("Star chart fetch failed:", err);
      }
      setStarChartUrl(FALLBACK_CHART_URL);
    }

    // Wait for minimum loading time even if API was fast
    await minLoadingTime;

    stopLoadingFacts();
    stopScanPings();  // ★ Stop sonar pings
    setStarChartLoading(false);

    const scanDone = processScanComplete(state, stars, chartConstellation);
    const lastNebo = [...scanDone.messages].reverse().find((m) => m.nebo);
    if (lastNebo) setLatestNebo(lastNebo.nebo);
    const lastEmoticon = [...scanDone.messages].reverse().find((m) => m.emoticon);
    if (lastEmoticon) setEmoticon(lastEmoticon.emoticon);

    // ★ Play Nebo's chirps before showing scanner dialogue
    if (lastNebo && lastNebo.nebo) {
      const currentEmoticon = lastEmoticon ? lastEmoticon.emoticon : EMOTICONS.excited;
      await playNeboChirps(lastNebo.nebo, currentEmoticon);
    }

    const constellationAnnouncement = `We've located the constellation ${getConstellationName(chartConstellation)}!`;
    const starPickerLine = scanDone.messages.map((m) => m.thoth).join(" ");
    setScannerDialogue(starPickerLine);
    setScannerSpeech(`${constellationAnnouncement} ${starPickerLine}`);

    setGameState(scanDone.newState);
  }

  // ---- Send text message ----
  function handleSend(text) {
    let trimmed = text.trim();
    if (!trimmed) return;
    setInputValue("");

    const expanded = expandCityShorthand(trimmed);
    if (expanded && (gameState.stage === 2 || gameState.stage === 3)) {
      trimmed = expanded;
    }

    if (phase === "idle") {
      // ★ First message — play chirps then show Thoth's greeting
      const result = processMessage("hello", INITIAL_STATE);
      const neboText = result.messages[0]?.nebo || "";
      const emoText = result.messages[0]?.emoticon || EMOTICONS.neutral;

      setLatestNebo(neboText);
      setEmoticon(emoText);
      setPhase("naming");

      // Play chirps, then add Thoth's text
      playNeboChirps(neboText, emoText).then(() => {
        setChatLog(result.messages.map((m) => ({ type: "bot", thoth: m.thoth })));
        setGameState(result.newState);
      });
      return;
    }

    if (phase === "naming") {
      const result = processMessage(trimmed, gameState);
      applyResult(result, trimmed);
      return;
    }

    // Scanning phase — star name, yes/no, or random input
    if (phase === "scanning") {
      const starNames = scannerStars.map((s) => s.name);
      const matchedStar = fuzzyMatch(trimmed, starNames);

      if (matchedStar) {
        const star = scannerStars.find((s) => s.name === matchedStar);
        setScannerDialogue(star.fact);
        setScannerSpeech(star.fact);
        setSelectedStarName(star.name);
        setEmoticon(EMOTICONS.excited);
        setShowingFact(true);
        setGameState((prev) => ({ ...prev, stage: 5 }));
        return;
      }

      const result = processMessage(trimmed, gameState);

      if (result.showScanResult) {
        triggerScan(result.newState);
        return;
      }

      if (result.newState.stage !== 5 && result.newState.stage !== 4) {
        const lastNebo = [...result.messages].reverse().find((m) => m.nebo);
        if (lastNebo) setLatestNebo(lastNebo.nebo);
        const lastEmoticon = [...result.messages].reverse().find((m) => m.emoticon);
        if (lastEmoticon) setEmoticon(lastEmoticon.emoticon);

        // ★ Sequential: chirps first, then Thoth
        const neboText = lastNebo ? lastNebo.nebo : "";
        const emoText = lastEmoticon ? lastEmoticon.emoticon : emoticon;

        if (neboText) {
          playNeboChirps(neboText, emoText).then(() => {
            setChatLog((prev) => [
              ...prev,
              { type: "user", text: trimmed },
              ...result.messages.map((m) => ({ type: "bot", thoth: m.thoth })),
            ]);
          });
        } else {
          setChatLog((prev) => [
            ...prev,
            { type: "user", text: trimmed },
            ...result.messages.map((m) => ({ type: "bot", thoth: m.thoth })),
          ]);
        }

        setGameState(result.newState);
        setPhase("chatting");
        return;
      }

      // Scanner dialogue update — with chirps
      const thothLine = result.messages.map((m) => m.thoth).join(" ");
      const lastNebo2 = [...result.messages].reverse().find((m) => m.nebo);
      const lastEmoticon2 = [...result.messages].reverse().find((m) => m.emoticon);
      if (lastEmoticon2) setEmoticon(lastEmoticon2.emoticon);
      if (lastNebo2) setLatestNebo(lastNebo2.nebo);

      const neboText = lastNebo2 ? lastNebo2.nebo : "";
      const emoText = lastEmoticon2 ? lastEmoticon2.emoticon : emoticon;

      if (neboText) {
        playNeboChirps(neboText, emoText).then(() => {
          setScannerDialogue(thothLine);
          setScannerSpeech(thothLine);
        });
      } else {
        setScannerDialogue(thothLine);
        setScannerSpeech(thothLine);
      }

      setGameState(result.newState);
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

  const isActive = phase !== "title" && phase !== "idle" && phase !== "scanning" && phase !== "goodbye";
  const cities = selectedState ? getCitiesForState(selectedState) : [];

  // ---- Goodbye handler ----
  async function handleGoodbye() {
    cancelThothSpeech();
    cancelNeboChirps();
    stopScanPings();

    // Nebo says goodbye first
    const neboGoodbye = translateLine("Goodbye friend!");
    setLatestNebo(neboGoodbye);
    setEmoticon(EMOTICONS.happy);

    // Play Nebo's goodbye chirps
    await playNeboChirps(neboGoodbye, EMOTICONS.happy);

    // Thoth says goodbye
    setChatLog((prev) => [
      ...prev,
      { type: "bot", thoth: "Goodbye! The stars will always shine bright for you." },
    ]);

    // Give Thoth a moment to speak, then fade
    setTimeout(() => {
      setPhase("goodbye");
    }, 3000);
  }

  // ---- Scanner navigation handlers ----
  function handleBackToConstellation() {
    setShowingFact(false);
    setScannerDialogue("Let's learn about another star!");
    setScannerSpeech("Let's learn about another star!");
  }

  function handleNewScan() {
    setShowingFact(false);
    triggerScan({ ...gameState, scanCount: gameState.scanCount + 1 });
  }

  function handleCloseScanner() {
    cancelThothSpeech();
    cancelNeboChirps();
    stopScanPings();
    setShowingFact(false);
    setPhase("hub");
    setLatestNebo(translateLine("We did it!"));
    setEmoticon(EMOTICONS.happy);
    setChatLog((prev) => [
      ...prev,
      { type: "bot", thoth: "Thanks for helping us map the stars! What do you want to do next?" },
    ]);
  }

  // ---- Hub handlers ----
  function handleHubNasa() {
    window.open("https://apod.nasa.gov/apod/", "_blank");
  }

  function handleHubLearn() {
    window.open("https://www.natgeokids.com/uk/discover/science/space/", "_blank");
  }

  function handleHubGoodbye() {
    handleGoodbye();
  }

  return (
    <div className="nebo-container">

      {/* ============================================================
       * TITLE SCREEN — logo + twinkling stars + CTA
       * ============================================================ */}
      {phase === "title" && (
        <div className="title-screen">
          <div className="title-stars">
            {Array.from({ length: 40 }).map((_, i) => (
              <div
                key={i}
                className="title-star"
                style={{
                  width: 1.5 + Math.random() * 2.5,
                  height: 1.5 + Math.random() * 2.5,
                  top: `${Math.random() * 100}%`,
                  left: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 3}s`,
                  animationDuration: `${2 + Math.random() * 3}s`,
                }}
              />
            ))}
          </div>
          <img src="/assets/nebologo.png" alt="Nebo!" className="title-logo" draggable={false} />
          <button className="title-button" onClick={() => setPhase("idle")}>
            Let's get <strong>star</strong>ted!
          </button>
        </div>
      )}

      {/* ============================================================
       * SHIP LAYERS — always rendered
       * ============================================================ */}
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
      <img src="/assets/fronthull.png" alt="" className="full-layer fronthull" draggable={false} />

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
       * SCANNER OVERLAY
       * ============================================================ */}
      {phase === "scanning" && (
        <>
          <button className="scanner-close-button" onClick={handleCloseScanner}>
            close scanner
          </button>

          <div className="scanner-overlay">
            <div className="scanner-header">
            <h1 className="scanner-title">Star Scanner</h1>
            <p className="scanner-subtitle">
              {starChartLoading
                ? `Scanning the skies above ${gameState.city || "us"}...`
                : `We've located the constellation ${scannerConstellationName}!`
              }
            </p>
          </div>

          <div className={`scanner-results-box ${starChartLoading ? "loading" : ""}`}>
            {starChartLoading ? (
              <div className="scanner-loading">
                <div
                  className="scanner-beam"
                  onAnimationStart={playScanPing}
                  onAnimationIteration={playScanPing}
                />
                <p className="scanner-beam-text">{loadingFact || "Scanning the sky..."}</p>
              </div>
            ) : starChartUrl ? (
              <img
                src={starChartUrl}
                alt="Star chart of the sky above you"
                onError={() => setStarChartUrl(FALLBACK_CHART_URL)}
              />
            ) : (
              <p className="scanner-results-placeholder">
                Nebo's scanner found stars above you!
              </p>
            )}
          </div>

          <div className="scanner-thoth-section">
            <div className="scanner-thoth-avatar">
              <span className="scanner-thoth-emoticon">
                {emoticon || EMOTICONS.excited}
              </span>
            </div>
            <div className="scanner-thoth-body">
              <p className="scanner-thoth-text">
                {showingFact && selectedStarName && (
                  <strong className="scanner-star-name">{selectedStarName}: </strong>
                )}
                {scannerDialogue || "Nebo loves looking at the stars..."}
              </p>
            </div>
          </div>

          {showingFact ? (
            <div className="scanner-nav-buttons">
              <button className="scanner-nav-button" onClick={handleBackToConstellation}>
                Back
              </button>
              <button className="scanner-nav-button" onClick={handleNewScan}>
                New Scan
              </button>
            </div>
          ) : !starChartLoading && (
            <div className="scanner-star-buttons">
              {scannerStars.map((star, i) => (
                <button
                  key={i}
                  className="scanner-star-button"
                  onClick={() => {
                    setScannerDialogue(star.fact);
                    setScannerSpeech(star.fact);
                    setSelectedStarName(star.name);
                    setEmoticon(EMOTICONS.excited);
                    setShowingFact(true);
                    setGameState((prev) => ({ ...prev, stage: 5 }));
                  }}
                >
                  {star.name}
                </button>
              ))}
            </div>
          )}
        </div>
        </>
      )}

      {/* ============================================================
       * THOTH PANEL — conversation view
       * ============================================================ */}
      {phase !== "title" && phase !== "scanning" && (
        <div className="thoth-panel">

          <div className={`thoth-avatar ${isActive ? "thoth-avatar-active" : ""}`}>
            {isActive && (
              <span className="thoth-emoticon">{emoticon || EMOTICONS.neutral}</span>
            )}
          </div>

          <div className="panel-content">

            {phase === "idle" && (
              <div className="narrative-block">
                <p className="narrative-text">
                  You find a spaceship, and a mysterious glowing creature peeking out at you.
                </p>
                <p className="narrative-prompt">Say hello?</p>
              </div>
            )}

            {isActive && (
              <div className="chat-log-wrapper">
                {chatLog.length > 1 && <div className="chat-fade-top" />}
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

            {phase === "hub" && (
              <div className="hub-buttons">
                <button className="hub-button" onClick={handleHubNasa}>
                  Get the NASA Photo of the Day
                </button>
                <button className="hub-button" onClick={handleHubLearn}>
                  Learn about space
                </button>
                <button className="hub-button hub-button-goodbye" onClick={handleHubGoodbye}>
                  Say Goodbye
                </button>
              </div>
            )}

            {phase !== "picking" && phase !== "hub" && (
              <div className="input-area">
                {gameState.stage === 90 || gameState.stage === 91 ? (
                  <button className="goodbye-button" onClick={handleGoodbye}>
                    Goodbye
                  </button>
                ) : (
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
                      autoFocus={isDesktop}
                    />
                    <button className="send-button" onClick={() => handleSend(inputValue)}>
                      →
                    </button>
                  </div>
                )}
              </div>
            )}

          </div>
        </div>
      )}

      {/* ============================================================
       * GOODBYE — fade to black overlay
       * ============================================================ */}
      {phase === "goodbye" && (
        <div className="goodbye-overlay" />
      )}

    </div>
  );
}

export default App;