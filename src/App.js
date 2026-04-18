import { useState } from "react";
import "./App.css";

/*
 * ============================================================
 * NEBO — Step 1: Layer Test
 * ============================================================
 * 
 * Mars! This first version does ONE thing:
 * Stack your art layers and make sure they look right.
 * 
 * We're NOT adding the chatbot yet. First we get the
 * visuals working, THEN we add the brains.
 * 
 * Hull first, comms later. Bit by bit!
 * ============================================================
 */

function App() {
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
      <img
        src="/assets/backwall.png"
        alt=""
        className="full-layer"
        draggable={false}
      />

      {/* LAYER 3: Front hull */}
      <img
        src="/assets/fronthull.png"
        alt=""
        className="full-layer"
        draggable={false}
      />

      {/* LAYER 4: Nebo */}
      <img
        src="/assets/nebo.png"
        alt="Nebo the alien"
        className="nebo-layer"
        draggable={false}
      />

      {/* LAYER 5: Porthole ring */}
      <img
        src="/assets/porthole_transp.png"
        alt=""
        className="full-layer"
        draggable={false}
      />

      {/* LAYER 6: Interface panel */}
      <img
        src="/assets/interface.png"
        alt=""
        className="full-layer"
        draggable={false}
      />

      {/* LAYER 7: Placeholder dialogue text */}
      <div className="dialogue-area">
        <p className="nebo-text">Uub… mee ba pfuu?</p>
        <p className="thoth-text">
          Hello. I'm the ship's computer, Thoth. That's Nebo.
          What's your name?
        </p>
      </div>

    </div>
  );
}

export default App;