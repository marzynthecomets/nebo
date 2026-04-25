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
 * Cancel any currently-speaking Thoth dialogue.
 * Called before each new speak() so lines don't pile up.
 */
export function cancelThothSpeech() {
  window.speechSynthesis.cancel();
}

/**
 * Speak a line as Thoth.
 *
 * This is the function Mars wrote from scratch!
 * Primary voice: "Superstar" — pitch 1, rate 1.1
 * Fallback voice: "Good News" — pitch 0, rate 1.7
 * Last resort: browser default
 */
export function speakAsThoth(text) {
  // Don't try to speak empty text
  if (!text || !text.trim()) return;

  // Cancel anything currently being spoken
  cancelThothSpeech();

  // Get all available voices from the browser
  const voices = speechSynthesis.getVoices();

  // Create the utterance — the "package" of text to be spoken
  const u = new SpeechSynthesisUtterance(text);

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

  // Speak!
  speechSynthesis.speak(u);
}
