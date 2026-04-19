import { useState, useRef, useEffect } from "react";
import { processMessage, INITIAL_STATE } from "./neboEngine";
import "./App.css";

/*
 * ============================================================
 * NEBO — Full Conversation UI
 * ============================================================
 *
 * Mars! Here's what changed from the layer test:
 *
 * - The dialogue area now shows a REAL conversation history
 * - There's a text input for typing + yes/no buttons
 * - A "Start" button kicks off the conversation
 * - neboEngine.js handles all the conversation logic
 *
 * The layers, animations, and styling are all the same.
 * We just added brains to the beauty!
 * ============================================================
 */

function App() {
  // ---- State ----
  const [started, setStarted] = useState(false);
  const [chatLog, setChatLog] = useState([]);
  const [gameState, setGameState] = useState(INITIAL_STATE);
  const [inputValue, setInputValue] = useState("");
  const [expectingInput, setExpectingInput] = useState(null);

  // Auto-scroll to bottom of chat
  const chatEndRef = useRef(null);
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatLog]);

  // ---- Start the conversation ----
  function handleStart() {
    setStarted(true);
    const result = processMessage("hello", INITIAL_STATE);
    setChatLog(result.messages.map((m) => ({ type: "bot", ...m })));
    setGameState(result.newState);
    setExpectingInput(result.expectingInput);
  }

  // ---- Send a message ----
  function handleSend(text) {
    if (!text.trim()) return;

    // Add the kid's message to the chat log
    const newLog = [...chatLog, { type: "user", text: text.trim() }];

    // Process through the engine
    const result = processMessage(text.trim(), gameState);

    // Add Nebo's response(s) to the log
    const botMessages = result.messages.map((m) => ({ type: "bot", ...m }));

    setChatLog([...newLog, ...botMessages]);
    setGameState(result.newState);
    setExpectingInput(result.expectingInput);
    setInputValue("");
  }

  // ---- Handle text input submit ----
  function handleKeyDown(e) {
    if (e.key === "Enter") {
      handleSend(inputValue);
    }
  }

  // ---- Render ----
  return (
    <div className="nebo-container">

      {/* LAYER 1: Animated star sky */}
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

      {/* LAYER 2: Back wall */}
      <img src="/assets/backwall.png" alt="" className="full-layer" draggable={false} />

      {/* LAYER 3: Front hull */}
      <img src="/assets/fronthull.png" alt="" className="full-layer" draggable={false} />

      {/* LAYER 4: Nebo */}
      <img src="/assets/nebo.png" alt="Nebo the alien" className="nebo-layer" draggable={false} />

      {/* LAYER 5: Porthole ring */}
      <img src="/assets/porthole_transp.png" alt="" className="full-layer" draggable={false} />

      {/* LAYER 6: Interface panel */}
      <img src="/assets/interface.png" alt="" className="full-layer" draggable={false} />

      {/* LAYER 7: Dialogue + Input Area */}
      <div className="dialogue-area">

        {/* Before the conversation starts — show the start button */}
        {!started && (
          <div className="start-screen">
            <button className="start-button" onClick={handleStart}>
              ✦ Begin Transmission ✦
            </button>
          </div>
        )}

        {/* Conversation has started — show chat */}
        {started && (
          <>
            {/* Chat log */}
            <div className="chat-log">
              {chatLog.map((entry, i) => {
                if (entry.type === "user") {
                  return (
                    <p key={i} className="user-text">
                      {entry.text}
                    </p>
                  );
                }
                // Bot message — has nebo + thoth lines
                return (
                  <div key={i} className="bot-message">
                    <p className="nebo-text">{entry.nebo}</p>
                    <p className="thoth-text">{entry.thoth}</p>
                  </div>
                );
              })}
              <div ref={chatEndRef} />
            </div>

            {/* Input area */}
            {expectingInput && (
              <div className="input-area">
                {/* Yes/No buttons for yes/no questions */}
                {expectingInput === "yesno" && (
                  <div className="yesno-buttons">
                    <button className="yn-button yes-btn" onClick={() => handleSend("yes")}>
                      Yes
                    </button>
                    <button className="yn-button no-btn" onClick={() => handleSend("no")}>
                      No
                    </button>
                  </div>
                )}

                {/* Text input for name, city, or free text */}
                {(expectingInput === "text" || expectingInput === "city") && (
                  <div className="text-input-row">
                    <input
                      type="text"
                      className="chat-input"
                      placeholder={
                        expectingInput === "city"
                          ? "Type your city..."
                          : "Type here..."
                      }
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyDown={handleKeyDown}
                      autoFocus
                    />
                    <button className="send-button" onClick={() => handleSend(inputValue)}>
                      ▲
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Conversation ended */}
            {!expectingInput && started && (
              <div className="end-message">
                <button className="start-button" onClick={() => {
                  setChatLog([]);
                  setGameState(INITIAL_STATE);
                  setStarted(false);
                  setExpectingInput(null);
                }}>
                  ✦ New Transmission ✦
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default App;