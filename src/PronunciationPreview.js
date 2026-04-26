import React from "react";
import { speakAsThoth, STAR_PRONUNCIATIONS } from "./thothSpeech";

/*
 * Dev-only preview screen for hearing how each star + constellation name
 * sounds when run through speakAsThoth. Visit /?pronounce to open it.
 *
 *  - "Guide"        the phonetic spelling Mars wrote down on paper
 *  - "Respelling"   what's currently in STAR_PRONUNCIATIONS (what's spoken)
 *  - Play           speaks the respelled version (what users hear)
 *  - Raw            speaks the original name with no respelling, for A/B
 */

// Phonetic guide Mars provided — display only, not used for synthesis.
const STAR_GUIDE = {
  "Betelgeuse": "Bettel-jooz",
  "Rigel": "RYE-jel",
  "Bellatrix": "BELL-uh-trix",
  "Sirius": "SEER-ee-us",
  "Adhara": "ad-HAR-uh",
  "Wezen": "WEZ-en",
  "Vega": "VAY-guh",
  "Sheliak": "SHELL-ee-yak",
  "Sulafat": "SOO-luh-faht",
  "Arcturus": "ark-TOOR-us",
  "Izar": "EYE-zar",
  "Muphrid": "MOO-frid",
  "Polaris": "poh-LAIR-iss",
  "Kochab": "KOH-kab",
  "Pherkad": "fair-KOD",
  "Aldebaran": "al-DEB-uh-ron",
  "Elnath": "EL-noth",
  "Alcyone": "al-SYE-oh-nee",
  "Capella": "kuh-PELL-uh",
  "Menkalinan": "men-KAH-lih-nan",
  "Mahasim": "muh-HAH-sim",
  "Procyon": "PRO-see-on",
  "Gomeisa": "go-MAY-suh",
  "Deneb": "DEN-eb",
  "Albireo": "al-BEER-ee-oh",
  "Sadr": "SAH-der",
  "Boötes": "boh-OH-teez",
};

const STARS = [
  "Betelgeuse", "Rigel", "Bellatrix",
  "Sirius", "Adhara", "Wezen",
  "Vega", "Sheliak", "Sulafat",
  "Arcturus", "Izar", "Muphrid",
  "Polaris", "Kochab", "Pherkad",
  "Aldebaran", "Elnath", "Alcyone",
  "Capella", "Menkalinan", "Mahasim",
  "Procyon", "Gomeisa", "Luyten's Star",
  "Deneb", "Albireo", "Sadr",
];

const CONSTELLATIONS = [
  "Orion",
  "Canis Major",
  "Canis Minor",
  "Taurus",
  "Auriga",
  "Lyra",
  "Cygnus",
  "Boötes",
  "Ursa Minor",
];

function Row({ name, guide, respelling }) {
  return (
    <tr>
      <td style={cell}>{name}</td>
      <td style={{ ...cell, color: "#888" }}>{guide || "—"}</td>
      <td style={{ ...cell, fontFamily: "monospace", color: "#0a7" }}>
        {respelling || "—"}
      </td>
      <td style={cell}>
        <button onClick={() => speakAsThoth(name)} style={btn}>▶ Play</button>
      </td>
      <td style={cell}>
        <button
          onClick={() => speakAsThoth(name, { applyPronunciations: false })}
          style={{ ...btn, background: "#eee" }}
        >
          ▶ Raw
        </button>
      </td>
    </tr>
  );
}

export default function PronunciationPreview() {
  const playAll = (items) => {
    let i = 0;
    const next = () => {
      if (i >= items.length) return;
      const name = items[i++];
      speakAsThoth(name);
      // give each name some breathing room
      setTimeout(next, 1400);
    };
    next();
  };

  return (
    <div style={{ padding: 24, fontFamily: "sans-serif", maxWidth: 900, margin: "0 auto" }}>
      <h1>Pronunciation Preview</h1>
      <p style={{ color: "#666" }}>
        Compare what the speech engine actually says against the phonetic guide.
        "Play" uses the respelling map (what users hear). "Raw" speaks the
        original name with no respelling, so you can hear the engine's default.
      </p>

      <h2>Stars</h2>
      <button onClick={() => playAll(STARS)} style={{ ...btn, marginBottom: 8 }}>
        ▶ Play all stars
      </button>
      <table style={table}>
        <thead>
          <tr>
            <th style={head}>Name</th>
            <th style={head}>Guide</th>
            <th style={head}>Respelling (spoken)</th>
            <th style={head}></th>
            <th style={head}></th>
          </tr>
        </thead>
        <tbody>
          {STARS.map((name) => (
            <Row
              key={name}
              name={name}
              guide={STAR_GUIDE[name]}
              respelling={STAR_PRONUNCIATIONS[name]}
            />
          ))}
        </tbody>
      </table>

      <h2 style={{ marginTop: 32 }}>Constellations</h2>
      <button onClick={() => playAll(CONSTELLATIONS)} style={{ ...btn, marginBottom: 8 }}>
        ▶ Play all constellations
      </button>
      <table style={table}>
        <thead>
          <tr>
            <th style={head}>Name</th>
            <th style={head}>Guide</th>
            <th style={head}>Respelling (spoken)</th>
            <th style={head}></th>
            <th style={head}></th>
          </tr>
        </thead>
        <tbody>
          {CONSTELLATIONS.map((name) => (
            <Row
              key={name}
              name={name}
              guide={STAR_GUIDE[name]}
              respelling={STAR_PRONUNCIATIONS[name]}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

const table = { width: "100%", borderCollapse: "collapse", marginBottom: 16 };
const head = { textAlign: "left", padding: "8px 12px", borderBottom: "2px solid #333", fontSize: 13 };
const cell = { padding: "8px 12px", borderBottom: "1px solid #ddd", fontSize: 14 };
const btn = {
  padding: "6px 12px",
  border: "1px solid #ccc",
  borderRadius: 6,
  background: "#fafafa",
  cursor: "pointer",
  fontSize: 13,
};
