/*
 * ============================================================
 * THOTH SPEECH — Text-to-Speech Utility
 * ============================================================
 *
 * Mars built this! Here's how it works:
 *
 * speakAsThoth(text)
 *   → Takes any string of text
 *   → Finds the "Superstar" voice (Mars's pick for Thoth)
 *   → If Superstar isn't available, falls back to "Good News"
 *   → If neither is found, uses the browser's default voice
 *   → Speaks the text out loud
 *
 * cancelThothSpeech()
 *   → Stops Thoth mid-sentence (used when new dialogue arrives
 *     before the old one finishes, so they don't overlap)
 *
 * WHY cancelThothSpeech EXISTS:
 * Imagine the kid clicks through dialogue fast. Without canceling,
 * you'd hear Thoth stacking sentences on top of each other like
 * a chaotic echo chamber. We cancel the old one before starting
 * the new one. Clean and tidy.
 *
 * BROWSER NOTE:
 * The Web Speech API is built into modern browsers — no API key,
 * no external service, no cost. But voices vary by browser and OS,
 * which is why we have the fallback chain.
 *
 * SUMMER PROJECT NOTE:
 * When you learn useEffect properly, come back and read how
 * App.js calls this. It'll click way more then!
 * ============================================================
 */

/**
 * Phonetic respellings for star names so the speech engine
 * pronounces them correctly. Only applied to the spoken text —
 * the on-screen spelling is unchanged.
 */
// Lowercase, no hyphens — caps + hyphens trip the engine into spelling out
// short tokens (e.g. "go-MAY-suh" → "G. O. Maysa"). Running syllables
// together makes each respelling a single unfamiliar word that gets sounded
// out phonetically.
export const STAR_PRONUNCIATIONS = {
  "Betelgeuse": "betteljooz",
  "Rigel": "ryejel",
  "Bellatrix": "belluhtrix",
  "Sirius": "seereeus",
  "Adhara": "adharuh",
  "Wezen": "wezen",
  "Vega": "vayguh",
  "Sheliak": "shelleeyak",
  "Sulafat": "sooluhfaht",
  "Arcturus": "arktoorus",
  "Izar": "eyezar",
  "Muphrid": "moofrid",
  "Polaris": "pohlairiss",
  "Kochab": "kohkab",
  "Pherkad": "fairkod",
  "Aldebaran": "aldebuhron",
  "Elnath": "elnoth",
  "Alcyone": "alsyohnee",
  "Capella": "kuhpelluh",
  "Menkalinan": "menkahlihnan",
  "Mahasim": "muhhahsim",
  "Procyon": "proseeon",
  "Gomeisa": "gomaysuh",
  "Deneb": "deneb",
  "Albireo": "albeereeoh",
  "Sadr": "sahder",
  "Boötes": "bohohteez",
};

function applyStarPronunciations(text) {
  let out = text;
  for (const [name, phonetic] of Object.entries(STAR_PRONUNCIATIONS)) {
    // Case-insensitive global replace. We don't use \b because some names
    // (e.g. Boötes) contain non-ASCII letters that break JS word boundaries.
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    out = out.replace(new RegExp(escaped, "gi"), phonetic);
  }
  return out;
}

// Visual "(1-9)" should voice as "1 through 9", not "1 9" / "1 minus 9"
function applySpeechReplacements(text) {
  return text.replace(/\((\d+)\s*-\s*(\d+)\)/g, "$1 through $2");
}

// Cache voices — getVoices() returns [] on first call in Chrome/Safari before
// the voiceschanged event fires, which would make the first Thoth line fall
// through to the browser default voice instead of Superstar.
let cachedVoices = [];
function loadVoices() {
  if (typeof speechSynthesis !== "undefined") {
    const v = speechSynthesis.getVoices();
    if (v.length > 0) cachedVoices = v;
  }
}
if (typeof speechSynthesis !== "undefined") {
  loadVoices();
  if (typeof speechSynthesis.addEventListener === "function") {
    speechSynthesis.addEventListener("voiceschanged", loadVoices);
  } else {
    speechSynthesis.onvoiceschanged = loadVoices;
  }
}

/**
 * Cancel any currently-speaking Thoth dialogue.
 * Called before each new speak() so lines don't pile up.
 */
export function cancelThothSpeech() {
  window.speechSynthesis.cancel();
}

/**
 * Unlock the Web Speech engine on iOS Safari. Must be called synchronously
 * inside a user gesture handler (e.g. the Start button click). Speaks a
 * silent placeholder utterance — after this, subsequent speak() calls
 * work even when fired from useEffect or async chains.
 */
export function primeSpeechEngine() {
  if (typeof speechSynthesis === "undefined") return;
  try {
    const u = new SpeechSynthesisUtterance(" ");
    u.volume = 0;
    speechSynthesis.speak(u);
  } catch (e) {
    // best-effort
  }
}

/**
 * Speak a line as Thoth.
 *
 * This is the function Mars wrote from scratch!
 * Primary voice: "Superstar" — pitch 1, rate 1.1
 * Fallback voice: "Good News" — pitch 0, rate 1.7
 * Last resort: browser default
 */
export function speakAsThoth(text, { applyPronunciations = true } = {}) {
  // Don't try to speak empty text
  if (!text || !text.trim()) return;

  // iOS Safari quirk: speechSynthesis.cancel() followed by immediate speak()
  // eats the first ~250ms of the new utterance — the kid hears the line
  // mid-word. Only cancel if actually mid-speech, and defer speak slightly
  // so the engine can settle.
  const wasBusy = window.speechSynthesis.speaking || window.speechSynthesis.pending;
  if (wasBusy) {
    cancelThothSpeech();
  }

  // Get all available voices from the browser — prefer cached voices since
  // getVoices() returns [] on first call in Chrome/Safari before the
  // voiceschanged event fires.
  const voices = cachedVoices.length > 0 ? cachedVoices : speechSynthesis.getVoices();

  // Create the utterance — the "package" of text to be spoken
  const withPronunciations = applyPronunciations ? applyStarPronunciations(text) : text;
  const spoken = applySpeechReplacements(withPronunciations);
  const u = new SpeechSynthesisUtterance(spoken);

  // Try to find Superstar (Mars's primary pick for Thoth)
  const superstar = voices.find(v => v.name === "Superstar");

  if (superstar) {
    // Superstar found — slay
    u.voice = superstar;
    u.pitch = 1;
    u.rate = 1.1;
  } else {
    // No Superstar — try Good News as backup
    const backup = voices.find(v => v.name === "Good News");
    if (backup) {
      u.voice = backup;
      u.pitch = 0;
      u.rate = 1.7;
    }
    // If neither found, browser uses its default voice — that's fine
  }

  // Speak! If we cancelled an in-progress utterance, give iOS Safari a
  // tick to clear its queue before starting the new one — otherwise the
  // start of the line gets eaten.
  if (wasBusy) {
    setTimeout(() => speechSynthesis.speak(u), 100);
  } else {
    speechSynthesis.speak(u);
  }
}
