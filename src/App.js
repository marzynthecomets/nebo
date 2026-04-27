import { useState, useRef, useEffect, useCallback } from "react";
import {
  processMessage,
  processStateSelection,
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
import { STATE_NAMES, getStateCoordinates, DEFAULT_LOCATION } from "./usCities";
import { speakAsThoth, cancelThothSpeech } from "./thothSpeech";
import { playNeboChirps, cancelNeboChirps, startScanPings, stopScanPings, playScanPing } from "./neboChirps";
import "./App.css";

/*
 * ============================================================
 * NEBO — App v5 (COPPA Compliance)
 * ============================================================
 *
 * Changes from v4:
 * - ★ Removed name entry phase (COPPA)
 * - ★ State-only picker (no city — COPPA)
 * - ★ Removed city shorthands, selectedCity state
 * - ★ Uses state capital coordinates for API
 * - ★ Updated dialogue and placeholder text
 * ============================================================
 */

// Fallback star chart URL
const FALLBACK_CHART_URL = `${process.env.PUBLIC_URL}/assets/fallback-starchart.png`;

// API timeout in milliseconds
const API_TIMEOUT = 30000;

function App() {
  const [phase, setPhase] = useState("title");
  const [chatLog, setChatLog] = useState([]);
  const [gameState, setGameState] = useState(INITIAL_STATE);
  const [inputValue, setInputValue] = useState("");
  const [latestNebo, setLatestNebo] = useState("");
  const [emoticon, setEmoticon] = useState("");

  // State picker (was state + city)
  const [selectedState, setSelectedState] = useState("");

  // Star chart state
  const [starChartUrl, setStarChartUrl] = useState("");
  const [starChartLoading, setStarChartLoading] = useState(false);

  // Loading facts state
  const [loadingFact, setLoadingFact] = useState("");
  const loadingFactsRef = useRef([]);
  const loadingIntervalRef = useRef(null);

  // Lock to prevent double-click on plea/bortle/ready/waiting buttons from
  // firing handlePlea twice with stale gameState
  const isHandlingChoiceRef = useRef(false);

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

  // ★ THOTH SPEECH — Chat log
  useEffect(() => {
    const last = chatLog[chatLog.length - 1];
    if (last && last.type === "bot") {
      speakAsThoth(last.thoth);
    }
  }, [chatLog]);

  // ★ THOTH SPEECH — Scanner dialogue
  useEffect(() => {
    if (scannerSpeech) {
      speakAsThoth(scannerSpeech);
    }
  }, [scannerSpeech]);

  // ★ CLEANUP
  useEffect(() => {
    return () => {
      cancelThothSpeech();
      cancelNeboChirps();
      stopScanPings();
    };
  }, []);

  // Pre-warm the Netlify function so the kid's first scan doesn't cold-start.
  // Fires a paramless fetch — the function returns 400 instantly without
  // calling AstronomyAPI (no quota used), but the Node runtime is now hot.
  useEffect(() => {
    fetch("https://neboscanner.netlify.app/.netlify/functions/star-scan")
      .catch(() => {});
  }, []);

  // ---- Loading facts rotation ----
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

  // ★ SEQUENTIAL AUDIO
  async function applyResult(result, userText = null) {
    if (userText) {
      setChatLog((prev) => [...prev, { type: "user", text: userText }]);
    }

    const lastNebo = [...result.messages].reverse().find((m) => m.nebo);
    if (lastNebo) setLatestNebo(lastNebo.nebo);

    const lastEmoticon = [...result.messages].reverse().find((m) => m.emoticon);
    const currentEmoticon = lastEmoticon ? lastEmoticon.emoticon : emoticon;
    if (lastEmoticon) setEmoticon(lastEmoticon.emoticon);

    if (lastNebo && lastNebo.nebo) {
      await playNeboChirps(lastNebo.nebo, currentEmoticon);
    }

    setChatLog((prev) => [
      ...prev,
      ...result.messages.map((m) => ({ type: "bot", thoth: m.thoth })),
    ]);

    setGameState(result.newState);

    if (result.triggerGoodbye) {
      handleGoodbye();
      return;
    }

    if (result.showCityPicker) {
      setPhase("picking");
    } else if (result.showPleaButtons) {
      setPhase("pleading");
    } else if (result.showBortleButtons) {
      setPhase("bortle");
    } else if (result.showReadyButtons) {
      setPhase("ready");
    } else if (result.showWaitingButtons) {
      setPhase("waiting");
    } else if (result.showScanResult) {
      triggerScan(result.newState);
    } else if (result.newState.stage >= 1) {
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

    cancelThothSpeech();
    cancelNeboChirps();

    startLoadingFacts();
    startScanPings();

    // Use state capital coordinates, or default
    let lat = DEFAULT_LOCATION.lat;
    let lon = DEFAULT_LOCATION.lon;

    if (state.location) {
      const coords = getStateCoordinates(state.location);
      if (coords) {
        lat = coords.lat;
        lon = coords.lon;
      }
    }

    const constellationId = pickConstellation(
      state.location || "New York",
      state.scanCount,
      state.seenConstellations || []
    );

    const chartConstellation = constellationId || "umi";
    const stars = getStarsForConstellation(chartConstellation);
    setScannerStars(stars);
    setScannerConstellationName(getConstellationName(chartConstellation));

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

    await minLoadingTime;

    stopLoadingFacts();
    stopScanPings();
    setStarChartLoading(false);

    const scanDone = processScanComplete(state, stars, chartConstellation);
    const lastNebo = [...scanDone.messages].reverse().find((m) => m.nebo);
    if (lastNebo) setLatestNebo(lastNebo.nebo);
    const lastEmoticon = [...scanDone.messages].reverse().find((m) => m.emoticon);
    if (lastEmoticon) setEmoticon(lastEmoticon.emoticon);

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

    if (phase === "idle") {
      // ★ First message — greeting, no name step
      const result = processMessage("hello", INITIAL_STATE);
      const neboText = result.messages[0]?.nebo || "";
      const emoText = result.messages[0]?.emoticon || EMOTICONS.neutral;

      setLatestNebo(neboText);
      setEmoticon(emoText);
      setPhase("chatting");

      playNeboChirps(neboText, emoText).then(() => {
        setChatLog(result.messages.map((m) => ({ type: "bot", thoth: m.thoth })));
        setGameState(result.newState);
      });
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

      // Scanner dialogue update
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

  // ---- State picker handler ----
  function handleStateChange(e) {
    setSelectedState(e.target.value);
  }

  function handleStateSubmit() {
    if (!selectedState) return;
    const result = processStateSelection(selectedState, gameState);
    applyResult(result);
    setSelectedState("");
  }

  function handleSkip() {
    const result = processSkip(gameState);
    applyResult(result);
    setSelectedState("");
  }

  async function handlePlea(answer, label) {
    if (isHandlingChoiceRef.current) return;
    isHandlingChoiceRef.current = true;
    try {
      const result = processMessage(answer, gameState);
      await applyResult(result, label);
    } finally {
      isHandlingChoiceRef.current = false;
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter") handleSend(inputValue);
  }

  const isActive = phase !== "title" && phase !== "idle" && phase !== "scanning" && phase !== "goodbye";

  // ---- Goodbye handler ----
  async function handleGoodbye() {
    cancelThothSpeech();
    cancelNeboChirps();
    stopScanPings();

    const neboGoodbye = translateLine("Goodbye friend!");
    setLatestNebo(neboGoodbye);
    setEmoticon(EMOTICONS.happy);

    await playNeboChirps(neboGoodbye, EMOTICONS.happy);

    setChatLog((prev) => [
      ...prev,
      { type: "bot", thoth: "Goodbye! The stars will always shine bright for you." },
    ]);

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
    setChatLog([
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

      {/* TITLE SCREEN */}
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
          <img src={`${process.env.PUBLIC_URL}/assets/nebologo.png`} alt="Nebo!" className="title-logo" draggable={false} />
          <button className="title-button" onClick={() => setPhase("idle")}>
            Let's get <strong>star</strong>ted!
          </button>
        </div>
      )}

      {/* SHIP LAYERS */}
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

      <img src={`${process.env.PUBLIC_URL}/assets/backwall.png`} alt="" className="full-layer" draggable={false} />
      <img src={`${process.env.PUBLIC_URL}/assets/fronthull.png`} alt="" className="full-layer fronthull" draggable={false} />

      <img
        src={`${process.env.PUBLIC_URL}/assets/nebo.png`}
        alt="Nebo the alien"
        className={`nebo-layer ${
          phase === "idle"     ? "nebo-idle" :
          phase === "scanning" ? "nebo-scanning" :
                                 "nebo-active"
        }`}
        draggable={false}
      />

      <img src={`${process.env.PUBLIC_URL}/assets/porthole_transp.png`} alt="" className="full-layer porthole" draggable={false} />

      {/* Nebo speech bubble */}
      {isActive && latestNebo && (
        <div className="nebo-bubble">
          <p className="nebo-bubble-text">{latestNebo}</p>
        </div>
      )}

      {/* SCANNER OVERLAY */}
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
                ? `Scanning the skies above ${gameState.location || "us"}...`
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

      {/* THOTH PANEL */}
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
                <select
                  className="picker-select"
                  value={selectedState}
                  onChange={handleStateChange}
                >
                  <option value="">Pick a state...</option>
                  {STATE_NAMES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                <div className="picker-buttons">
                  <button
                    className="picker-submit"
                    onClick={handleStateSubmit}
                    disabled={!selectedState}
                  >
                    Enter
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

            {phase === "pleading" && (
              <div className="picker-buttons picker-buttons-equal">
                <button className="picker-submit" onClick={() => handlePlea("yes", "Okay, fine")}>
                  Okay, fine
                </button>
                <button className="picker-skip" onClick={() => handlePlea("no", "No, goodbye")}>
                  No, goodbye
                </button>
              </div>
            )}

            {phase === "bortle" && (
              <div className="picker-buttons picker-buttons-equal">
                <button className="picker-submit" onClick={() => handlePlea("yes", "Yes!")}>
                  Yes!
                </button>
                <button className="picker-skip" onClick={() => handlePlea("no", "No!")}>
                  No!
                </button>
              </div>
            )}

            {phase === "ready" && (
              <div className="picker-buttons">
                <button className="picker-submit" onClick={() => handlePlea("yes", "Launch Scanner")}>
                  Launch Scanner
                </button>
                <button className="picker-skip" onClick={() => handlePlea("no", "Not yet")}>
                  Not yet
                </button>
              </div>
            )}

            {phase === "waiting" && (
              <div className="picker-buttons">
                <button className="picker-submit" onClick={() => handlePlea("yes", "Launch Scanner")}>
                  Launch Scanner
                </button>
                <button className="picker-skip" onClick={() => handlePlea("no", "Exit")}>
                  Exit
                </button>
              </div>
            )}

            {phase !== "picking" && phase !== "hub" && phase !== "pleading" && phase !== "bortle" && phase !== "ready" && phase !== "waiting" && (
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
                        phase === "idle" ? "Say hello..." : "Type here..."
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

      {/* GOODBYE */}
      {phase === "goodbye" && (
        <div className="goodbye-overlay" />
      )}

    </div>
  );
}

export default App;