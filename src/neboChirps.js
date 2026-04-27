/*
 * ============================================================
 * NEBO CHIRP ENGINE — Bubbly Alien Voice Synthesizer
 * ============================================================
 *
 * Mars! This generates Nebo's "voice" — soft, bubbly chirps
 * that map to what he's saying without being actual language.
 *
 * HOW IT WORKS:
 * - Uses the Web Audio API (built into every browser, no install)
 * - Creates sine wave tones (the smoothest, roundest sound)
 * - Each "chirp" is a short tone that slides up or down in pitch
 * - Multiple chirps play in sequence to form a "sentence"
 *
 * HOW IT MAPS TO NEBO'S DIALOGUE:
 * - Text length → number of chirps (longer text = more chirps)
 * - Emoticon/mood → frequency range and behavior:
 *     happy/excited → higher pitch, upward slides, faster
 *     worried/sad   → lower pitch, downward slides, slower
 *     neutral       → mid-range, gentle movement
 *
 * THINK OF IT LIKE:
 * Each mood is a "key" on a piano. Happy Nebo plays in the
 * high keys, worried Nebo plays in the low keys. The text
 * length determines how many notes he plays.
 *
 * SUMMER PROJECT NOTE:
 * The Web Audio API is the same tech used in browser-based
 * synthesizers and music apps. When you get to your Arduino
 * projects, you'll see similar concepts — oscillators,
 * frequencies, waveforms. It's all connected!
 * ============================================================
 */

// We keep one AudioContext around and reuse it
let audioContext = null;

// Track the current chirp sequence so we can cancel it
let currentChirpTimeout = null;
let isChirping = false;

/**
 * Get or create the AudioContext.
 * Browsers require a user gesture before audio can play,
 * so we create it lazily (on first use, after kid has clicked).
 */
function getAudioContext() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  // Resume if suspended (browsers pause it until user interacts)
  if (audioContext.state === "suspended") {
    audioContext.resume();
  }
  return audioContext;
}

/**
 * Wait for the AudioContext to actually be in the "running" state.
 * iOS auto-suspends contexts after ~30s of inactivity; resume() returns
 * a Promise that only resolves once the transition completes. Scheduling
 * audio events while still suspended can silently drop them, so we await
 * here before any playback path.
 */
async function ensureRunning(ctx) {
  if (ctx.state === "suspended") {
    try {
      await ctx.resume();
    } catch (e) {
      // best-effort
    }
  }
}

/**
 * Unlock audio playback on iOS Safari. Must be called synchronously
 * inside a user gesture handler (e.g. the Start button click) — after
 * that, audio works from anywhere including useEffect and async chains.
 *
 * Plays a brief silent oscillator (non-zero duration) which iOS Safari
 * recognizes as real audio playback, satisfying the gesture-required rule.
 */
export function unlockAudio() {
  try {
    const ctx = getAudioContext();

    // Brief silent oscillator — more reliable than a 1-sample buffer.
    // iOS Safari needs the audio source to have non-trivial duration.
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    gain.gain.value = 0;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(0);
    osc.stop(ctx.currentTime + 0.05);

    if (ctx.state === "suspended") {
      ctx.resume();
    }
  } catch (e) {
    // best-effort — failure here doesn't block app
  }
}

/**
 * Mood profiles — each mood defines how Nebo's chirps sound.
 *
 * freqLow/freqHigh: the pitch range (in Hz) chirps are picked from
 * slideDirection: do chirps slide up, down, or randomly?
 * speed: how fast chirps play (lower = faster)
 * gain: volume (0 to 1)
 */
const MOOD_PROFILES = {
  happy: {
    freqLow: 600,
    freqHigh: 900,
    slideDirection: "up",
    speed: 100,
    gain: 0.15,
    chirpDuration: 0.1,
  },
  excited: {
    freqLow: 700,
    freqHigh: 1100,
    slideDirection: "up",
    speed: 75,
    gain: 0.15,
    chirpDuration: 0.08,
  },
  worried: {
    freqLow: 350,
    freqHigh: 550,
    slideDirection: "down",
    speed: 140,
    gain: 0.12,
    chirpDuration: 0.14,
  },
  sad: {
    freqLow: 280,
    freqHigh: 450,
    slideDirection: "down",
    speed: 170,
    gain: 0.10,
    chirpDuration: 0.16,
  },
  neutral: {
    freqLow: 450,
    freqHigh: 700,
    slideDirection: "random",
    speed: 120,
    gain: 0.13,
    chirpDuration: 0.12,
  },
  scanning: {
    freqLow: 500,
    freqHigh: 850,
    slideDirection: "up",
    speed: 90,
    gain: 0.14,
    chirpDuration: 0.1,
  },
  chill: {
    freqLow: 400,
    freqHigh: 600,
    slideDirection: "random",
    speed: 150,
    gain: 0.11,
    chirpDuration: 0.14,
  },
};

/**
 * Map emoticon strings to mood profile keys.
 * These match the EMOTICONS object in neboEngine.js
 */
function emotionToMood(emoticon) {
  const map = {
    "◕ヮ◕": "happy",
    "^O^": "excited",
    "~_~": "worried",
    ">_<": "sad",
    "o_0": "neutral",
    "◎_◎": "scanning",
    "★‿★": "scanning",
    "´ー｀": "chill",
    "ー_ー": "neutral",
  };
  return map[emoticon] || "neutral";
}

/**
 * Play a single chirp — one bubbly blip.
 *
 * This is the core sound unit. It creates a sine wave tone
 * that starts at one frequency and slides to another,
 * with a gentle volume fade-in and fade-out so it sounds
 * smooth and round, not clicky.
 */
function playChirp(ctx, startFreq, endFreq, duration, gain, startTime) {
  // Create the oscillator (the thing that makes sound)
  const osc = ctx.createOscillator();
  osc.type = "sine"; // Smooth and round — the bubbly sound

  // Set the starting pitch and slide to the ending pitch
  osc.frequency.setValueAtTime(startFreq, startTime);
  osc.frequency.exponentialRampToValueAtTime(endFreq, startTime + duration);

  // Create a gain node (volume control)
  const gainNode = ctx.createGain();

  // Fade in quickly, hold, fade out — this makes it sound soft
  // instead of a harsh click-on click-off
  gainNode.gain.setValueAtTime(0, startTime);
  gainNode.gain.linearRampToValueAtTime(gain, startTime + duration * 0.15);
  gainNode.gain.setValueAtTime(gain, startTime + duration * 0.6);
  gainNode.gain.linearRampToValueAtTime(0, startTime + duration);

  // Connect: oscillator → volume → speakers
  osc.connect(gainNode);
  gainNode.connect(ctx.destination);

  // Start and stop
  osc.start(startTime);
  osc.stop(startTime + duration + 0.01);
}

/**
 * Calculate how many chirps to play based on Nebo's text.
 * Longer text = more chirps, but we cap it so it doesn't
 * go on forever.
 */
function getChirpCount(neboText) {
  if (!neboText) return 3;

  // Count "syllables" by counting vowel-like clusters in the nebo text
  const syllables = neboText.replace(/[^a-zA-Z]/g, "").length;

  // Map to chirp count: roughly 1 chirp per 2-3 characters
  // Min 2, max 12
  const count = Math.max(2, Math.min(12, Math.ceil(syllables / 2.5)));
  return count;
}

/**
 * Generate a random frequency within a range.
 */
function randFreq(low, high) {
  return low + Math.random() * (high - low);
}

/**
 * Play a sequence of chirps as Nebo's "voice."
 *
 * Returns a Promise that resolves when all chirps are done,
 * so we can wait for Nebo to finish before Thoth speaks.
 *
 * @param {string} neboText - Nebo's translated text (determines length)
 * @param {string} emoticon - The emoticon string (determines mood)
 * @returns {Promise} - Resolves when chirps finish
 */
export function playNeboChirps(neboText, emoticon) {
  return new Promise(async (resolve) => {
    // Cancel any chirps already playing
    cancelNeboChirps();
    isChirping = true;

    const ctx = getAudioContext();
    // iOS may have auto-suspended the context — wait for it to actually
    // be running before scheduling chirps, otherwise events get dropped.
    await ensureRunning(ctx);

    const mood = emotionToMood(emoticon);
    const profile = MOOD_PROFILES[mood];
    const chirpCount = getChirpCount(neboText);

    const now = ctx.currentTime;
    let totalDuration = 0;

    for (let i = 0; i < chirpCount; i++) {
      // Pick a random starting frequency in the mood's range
      const startFreq = randFreq(profile.freqLow, profile.freqHigh);

      // Determine slide direction
      let endFreq;
      const slideAmount = 50 + Math.random() * 150; // How far to slide

      if (profile.slideDirection === "up") {
        endFreq = startFreq + slideAmount;
      } else if (profile.slideDirection === "down") {
        endFreq = startFreq - slideAmount;
      } else {
        // Random — sometimes up, sometimes down
        endFreq = Math.random() > 0.5
          ? startFreq + slideAmount
          : startFreq - slideAmount;
      }

      // Make sure frequency doesn't go below 100Hz (too low to hear well)
      endFreq = Math.max(100, endFreq);

      // Add a little random variation to timing so it feels organic
      const jitter = Math.random() * 20; // 0-20ms (always positive)
      const chirpStart = now + i * (profile.speed / 1000) + jitter / 1000;
      const chirpDuration = profile.chirpDuration + Math.random() * 0.04;

      playChirp(ctx, startFreq, endFreq, chirpDuration, profile.gain, chirpStart);

      totalDuration = (i * profile.speed) + profile.chirpDuration * 1000;
    }

    // Add a small buffer after the last chirp, then resolve
    const finishDelay = totalDuration + 200; // 200ms pause after chirps end

    currentChirpTimeout = setTimeout(() => {
      isChirping = false;
      resolve();
    }, finishDelay);
  });
}

/**
 * Cancel any currently-playing chirp sequence.
 */
export function cancelNeboChirps() {
  if (currentChirpTimeout) {
    clearTimeout(currentChirpTimeout);
    currentChirpTimeout = null;
  }
  isChirping = false;
  // Note: individual chirps that are already scheduled in the AudioContext
  // will finish naturally (they're very short), so this mainly prevents
  // new chirps from being scheduled and resolves the promise early.
}

/**
 * Check if Nebo is currently chirping.
 */
export function isNeboChirping() {
  return isChirping;
}

// ============================================================
// SCAN PINGS — Periodic sonar-style pings during star scanning
// ============================================================

let scanPingInterval = null;
let scanPingCount = 0;

/**
 * Play a single scanner ping. Driven by the beam's CSS animation
 * events in App.js so the sound is always in sync with the visual.
 */
export async function playScanPing() {
  const ctx = getAudioContext();
  // Same iOS auto-suspend defense as the chirps — without this, the first
  // ping after a long pause on the loading screen gets silently dropped.
  await ensureRunning(ctx);
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  osc.type = "triangle";

  const baseFreq = 220 + (scanPingCount % 3) * 30;
  const endFreq = baseFreq + 60;

  osc.frequency.setValueAtTime(baseFreq, now);
  osc.frequency.exponentialRampToValueAtTime(endFreq, now + 0.15);

  const gainNode = ctx.createGain();
  gainNode.gain.setValueAtTime(0, now);
  gainNode.gain.linearRampToValueAtTime(0.08, now + 0.03);
  gainNode.gain.setValueAtTime(0.08, now + 0.1);
  gainNode.gain.linearRampToValueAtTime(0, now + 0.4);

  osc.connect(gainNode);
  gainNode.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 0.45);

  scanPingCount++;
}

export function startScanPings() {
  scanPingCount = 0;
}

export function stopScanPings() {
  if (scanPingInterval) {
    clearInterval(scanPingInterval);
    scanPingInterval = null;
  }
  scanPingCount = 0;
}