/*
 * ============================================================
 * NEBO ENGINE v2 — The Brain (Streamlined)
 * ============================================================
 *
 * Mars! This is the streamlined conversation flow from your
 * Nebo.md design doc. Way tighter — kids get to the scanner
 * in ~4 exchanges instead of 8.
 *
 * NEW in v2:
 * - Thoth emoticons change with the conversation mood
 * - scanCount so rescanning gives a different star each time
 * - Cleaner stage flow matching your original design
 *
 * STAGE MAP:
 *   0 → Kid says hi (greeting)
 *   1 → Kid enters name
 *   2 → "Can you help?" (yes/no)
 *       → no → "Can you tell us where we landed?" (yes/no)
 *   3 → City picker (state/city dropdowns OR skip)
 *   4 → Scan result displayed
 *   5 → "Scan again?" (yes/no)
 *
 * BAIL-OUT STAGES (dead ends from "no" responses):
 *   90 → Said no to helping AND no to telling location
 *   91 → Conversation ended gracefully
 * ============================================================
 */

// ============================================================
// Nebo Translator — Bouba, not kiki
// ============================================================

const ONSET = ["b", "p", "m", "n", "w", "br", "pl", "pf", "bl", ""];
const VOWEL = ["uu", "oo", "aa", "ii", "ee", "o", "u", "a", "i"];
const CODA  = ["p", "m", "n", "b", "tz", "", "", "", "", "", "", ""];
const FLAIR = ["~", "~", "", "", "", "", "", ""];

const BLOCKLIST = [
  "ass", "damn", "hell", "shit", "piss", "fuck", "crap", "dick",
  "cock", "poop", "poo", "pee", "butt", "tit", "tits", "boob", "bitch",
  "slut", "whore", "cunt", "fag", "nig", "cum", "jizz", "wank",
  "anus", "porn", "sexy", "nude", "dumb", "stupid",
  "fuk", "fuc", "sht", "dik", "kok", "pnus", "bewb",
  "pp", "peep", "weew", "poopu", "poopoo", "peepee",
];

function hashStr(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function pick(arr, seed) {
  return arr[seed % arr.length];
}

function isBad(s) {
  const lower = s.toLowerCase();
  return BLOCKLIST.some((bad) => lower.includes(bad));
}

function buildNeboWord(clean, salt) {
  const syllableCount = clean.length <= 3 ? 1 : clean.length <= 6 ? 2 : 3;
  let result = "";
  for (let i = 0; i < syllableCount; i++) {
    const seed = hashStr(clean + salt + String(i));
    result += pick(ONSET, seed) + pick(VOWEL, seed >> 3) + pick(CODA, seed >> 5);
  }
  return result;
}

function toNebo(word) {
  const clean = word.toLowerCase().replace(/[^a-z]/g, "");
  if (!clean) return word;

  const h = hashStr(clean);

  let result = "";
  for (let attempt = 0; attempt < 10; attempt++) {
    const salt = attempt === 0 ? "" : `_salt${attempt}`;
    result = buildNeboWord(clean, salt);
    if (!isBad(result)) break;
  }

  if (word[0] === word[0].toUpperCase() && word[0] !== word[0].toLowerCase()) {
    result = result[0].toUpperCase() + result.slice(1);
  }

  result += pick(FLAIR, h >> 2);

  return result;
}

// ============================================================
// Star Database — curated facts for the demo
// AstronomyAPI gives us the chart image; these give us
// kid-friendly facts for the "Learn about these stars" overlay.
// ============================================================

const STAR_DATABASE = [
  {
    name: "Sirius",
    constellation: "cma",
    fact: "Sirius is the brightest star in the night sky! It's actually two stars orbiting each other, and it's only 8.6 light-years away from Earth.",
  },
  {
    name: "Vega",
    constellation: "lyr",
    fact: "Vega is one of the brightest stars you can see! It's about 25 light-years away, and thousands of years ago, it used to be Earth's North Star.",
  },
  {
    name: "Arcturus",
    constellation: "boo",
    fact: "Arcturus is a red giant star — that means it's old and very big! It shines with an orange glow and is about 37 light-years from Earth.",
  },
  {
    name: "Betelgeuse",
    constellation: "ori",
    fact: "Betelgeuse is a supergiant star in the constellation Orion. It's so big that if you put it where our Sun is, it would swallow up Mars! One day it might explode into a supernova.",
  },
  {
    name: "Polaris",
    constellation: "umi",
    fact: "Polaris is the North Star! Travelers have used it for hundreds of years to find their way. It sits almost exactly above Earth's North Pole.",
  },
  {
    name: "Rigel",
    constellation: "ori",
    fact: "Rigel is a blue supergiant in the constellation Orion. It's incredibly hot and shines about 120,000 times brighter than our Sun!",
  },
  {
    name: "Aldebaran",
    constellation: "tau",
    fact: "Aldebaran is an orange giant star that looks like the fiery eye of Taurus the Bull! It's about 65 light-years away from us.",
  },
  {
    name: "Capella",
    constellation: "aur",
    fact: "Capella is actually four stars that look like one bright point of light! It's one of the brightest things you can see in the winter sky.",
  },
  {
    name: "Procyon",
    constellation: "cmi",
    fact: "Procyon means 'before the dog' because it rises just before Sirius, the Dog Star! It's one of our closest stellar neighbors at only 11 light-years away.",
  },
  {
    name: "Deneb",
    constellation: "cyg",
    fact: "Deneb is so far away — about 2,600 light-years — that the light you see from it left the star before the pyramids were built! It's one of the most luminous stars we know.",
  },
];

// Use scanCount to give a different star each rescan
export function getStarForCity(city, scanCount = 0) {
  const h = hashStr(city.toLowerCase() + String(scanCount));
  return STAR_DATABASE[h % STAR_DATABASE.length];
}

// Get 3-4 stars for the "Learn about these stars" overlay
export function getStarsForCity(city, scanCount = 0) {
  const stars = [];
  const used = new Set();
  for (let i = 0; i < 4; i++) {
    const h = hashStr(city.toLowerCase() + String(scanCount) + String(i));
    const idx = h % STAR_DATABASE.length;
    if (!used.has(idx)) {
      used.add(idx);
      stars.push(STAR_DATABASE[idx]);
    }
  }
  // Ensure at least 3
  if (stars.length < 3) {
    for (let j = 0; j < STAR_DATABASE.length && stars.length < 3; j++) {
      if (!used.has(j)) {
        used.add(j);
        stars.push(STAR_DATABASE[j]);
      }
    }
  }
  return stars;
}

function isDaytime() {
  const hour = new Date().getHours();
  return hour >= 7 && hour <= 19;
}

// ============================================================
// Thoth Emoticons
// ============================================================

export const EMOTICONS = {
  neutral:  "o_0",
  worried:  "~_~",
  sad:      ">_<",
  happy:    "◕ヮ◕",
  chill:    "´ー｀",
  blank:    "ー_ー",
  excited:  "^O^",
  scanning: "◎_◎",
};

// ============================================================
// Intent detection
// ============================================================

const YES_WORDS = [
  "yes", "yeah", "yep", "yup", "ya", "ye", "yea", "sure",
  "ok", "okay", "yah", "yas", "yess", "yesss", "totally",
  "absolutely", "definitely", "of course", "duh", "mhm",
  "uh huh", "si", "oui",
];

const NO_WORDS = [
  "no", "nah", "nope", "nay", "never", "not really", "no way",
  "noo", "nooo", "noooo", "nahh", "nuh uh",
];

const GREETING_WORDS = [
  "hi", "hello", "hey", "heya", "hiya", "yo", "sup", "howdy",
  "hiii", "hiiii", "hellooo", "heyyy", "heyy",
  "greetings", "whats up", "what's up",
];

function detectIntent(input) {
  const lower = input.toLowerCase().trim();

  if (GREETING_WORDS.some((g) => lower === g || lower.startsWith(g + " ") || lower.startsWith(g + "!"))) {
    return "greeting";
  }
  if (YES_WORDS.some((y) => lower === y || lower.startsWith(y + " ") || lower.startsWith(y + "!"))) {
    return "yes";
  }
  if (NO_WORDS.some((n) => lower === n || lower.startsWith(n + " ") || lower.startsWith(n + "!"))) {
    return "no";
  }
  return "other";
}

// ============================================================
// Fallback responses
// ============================================================

const FALLBACK_RESPONSES = {
  0: { nebo: "…?", thoth: "Nebo's a little confused. Try saying hello!", emoticon: EMOTICONS.neutral },
  1: { nebo: "…?", thoth: "Nebo wants to know your name! Just type it in.", emoticon: EMOTICONS.worried },
  2: { nebo: "…?", thoth: "Can you help us? You can say yes or no.", emoticon: EMOTICONS.worried },
  "2no": { nebo: "…?", thoth: "Can you at least tell us where we landed? Yes or no?", emoticon: EMOTICONS.sad },
  3: { nebo: "…?", thoth: "Pick your state and city so Nebo can scan the sky above you!", emoticon: EMOTICONS.worried },
  5: { nebo: "…?", thoth: "Want to scan for another star? You can say yes or no.", emoticon: EMOTICONS.happy },
};

// ============================================================
// Main processor
// ============================================================
/*
 * state = {
 *   stage: 0,
 *   kidName: "",
 *   city: "",
 *   scanCount: 0,
 *   subStage: null,   // for branching within a stage
 * }
 *
 * Returns: {
 *   messages: [{ nebo, thoth, emoticon }, ...],
 *   newState: { stage, kidName, city, scanCount, subStage },
 *   expectingInput: "text" | "yesno" | "city" | null,
 *   showCityPicker: true/false,
 *   showScanResult: true/false,
 * }
 */

export function processMessage(input, state) {
  const { stage, kidName, city, scanCount = 0, subStage } = state;
  const intent = detectIntent(input);

  // ---- Stage 0: waiting for greeting ----
  if (stage === 0) {
    return {
      messages: [
        {
          nebo: "Uub… mee ba pfuu?",
          thoth: "Hello? Who's there? Who are you?",
          emoticon: EMOTICONS.neutral,
        },
      ],
      newState: { ...state, stage: 1 },
      expectingInput: "text",
    };
  }

  // ---- Stage 1: name entry ----
  if (stage === 1) {
    let name = input.replace(/[^a-zA-Z\s'-]/g, "").trim();
    name = name ? name.split(/\s+/)[0] : "";
    name = name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();

    if (!name) {
      return {
        messages: [FALLBACK_RESPONSES[1]],
        newState: state,
        expectingInput: "text",
      };
    }

    if (isBad(name)) {
      return {
        messages: [
          {
            nebo: "Nib otz~!",
            thoth: "Hmm, Nebo doesn't think that's your real name. Can you try again?",
            emoticon: EMOTICONS.sad,
          },
        ],
        newState: state,
        expectingInput: "text",
      };
    }

    const neboName = toNebo(name);

    return {
      messages: [
        {
          nebo: `${neboName}! ${neboName}~!`,
          thoth: `Hello ${name}! This is Nebo, and I'm Thoth, the ship's computer. We just crashed here on Earth. Can you help?`,
          emoticon: EMOTICONS.worried,
        },
      ],
      newState: { ...state, stage: 2, kidName: name, subStage: null },
      expectingInput: "yesno",
    };
  }

  // ---- Stage 2: "Can you help?" ----
  if (stage === 2 && subStage !== "no_followup") {
    if (intent === "yes") {
      return {
        messages: [
          {
            nebo: "Pfa!",
            thoth: `Oh Nebo's so glad and so am I! We're trying to launch our star scanner. Do you know what city we landed in?`,
            emoticon: EMOTICONS.happy,
          },
        ],
        newState: { ...state, stage: 3 },
        expectingInput: "city",
        showCityPicker: true,
      };
    }

    if (intent === "no") {
      return {
        messages: [
          {
            nebo: "Nib otz~! Plaabpfaab~!",
            thoth: "Oh no. Can you at least tell us where we landed?",
            emoticon: EMOTICONS.sad,
          },
        ],
        newState: { ...state, stage: 2, subStage: "no_followup" },
        expectingInput: "yesno",
      };
    }

    return {
      messages: [FALLBACK_RESPONSES[2]],
      newState: state,
      expectingInput: "yesno",
    };
  }

  // ---- Stage 2 (no followup): "Can you at least tell us where we landed?" ----
  if (stage === 2 && subStage === "no_followup") {
    if (intent === "yes") {
      return {
        messages: [
          {
            nebo: "Noowoo!",
            thoth: "Thank you! What city are we in?",
            emoticon: EMOTICONS.happy,
          },
        ],
        newState: { ...state, stage: 3, subStage: null },
        expectingInput: "city",
        showCityPicker: true,
      };
    }

    if (intent === "no") {
      return {
        messages: [
          {
            nebo: "Naa~…",
            thoth: "Alright, well, if you see any nice humans who can help, send them our way. Goodbye.",
            emoticon: EMOTICONS.blank,
          },
        ],
        newState: { ...state, stage: 90, subStage: null },
        expectingInput: null,
      };
    }

    return {
      messages: [FALLBACK_RESPONSES["2no"]],
      newState: state,
      expectingInput: "yesno",
    };
  }

  // ---- Stage 3: city picker ----
  // This is mostly handled by the UI (dropdowns + skip button),
  // but if someone types a city name, we handle it here too.
  if (stage === 3) {
    // The UI will call processCity() directly for dropdown selections.
    // This handles free-text fallback.
    const cityName = input.replace(/[^a-zA-Z\s'-]/g, "").trim();
    if (!cityName) {
      return {
        messages: [FALLBACK_RESPONSES[3]],
        newState: state,
        expectingInput: "city",
        showCityPicker: true,
      };
    }

    if (isBad(cityName)) {
      return {
        messages: [
          {
            nebo: "Nib otz~!",
            thoth: "That doesn't look like a real city name. Can you try again?",
            emoticon: EMOTICONS.sad,
          },
        ],
        newState: state,
        expectingInput: "city",
        showCityPicker: true,
      };
    }

    // Use it as-is
    const capitalizedCity = cityName.charAt(0).toUpperCase() + cityName.slice(1).toLowerCase();
    return processCitySelection(capitalizedCity, state);
  }

  // ---- Stage 5: scan again? ----
  if (stage === 5) {
    if (intent === "yes") {
      return {
        messages: [
          {
            nebo: "Miinii~!",
            thoth: "Scanning the sky again...",
            emoticon: EMOTICONS.scanning,
          },
        ],
        newState: { ...state, stage: 4, scanCount: scanCount + 1 },
        expectingInput: null,
        showScanResult: true,
      };
    }

    if (intent === "no") {
      return {
        messages: [
          {
            nebo: "Naa~…",
            thoth: "That's okay! The stars will always be here. Come back anytime you want to explore.",
            emoticon: EMOTICONS.chill,
          },
        ],
        newState: { ...state, stage: 91 },
        expectingInput: null,
      };
    }

    return {
      messages: [FALLBACK_RESPONSES[5]],
      newState: state,
      expectingInput: "yesno",
    };
  }

  // ---- Dead-end stages ----
  if (stage === 90 || stage === 91) {
    return {
      messages: [
        {
          nebo: "…",
          thoth: stage === 90
            ? "Nebo's waiting for a nice human to come by. Say hi to start over!"
            : "The stars will always be here! Say hi to explore again.",
          emoticon: stage === 90 ? EMOTICONS.blank : EMOTICONS.chill,
        },
      ],
      newState: { ...INITIAL_STATE },
      expectingInput: "text",
    };
  }

  // Catch-all
  return {
    messages: [{ nebo: "…?", thoth: "Nebo's confused. Try again!", emoticon: EMOTICONS.neutral }],
    newState: state,
    expectingInput: "text",
  };
}

// ============================================================
// City selection handler — called by the UI when dropdowns are used
// ============================================================

export function processCitySelection(cityName, state) {
  const timeMsg = isDaytime()
    ? "Even though it's daytime, the stars are still shining bright above us. It's just hard to see them without a special scanner!"
    : "The stars are shining bright above us!";

  return {
    messages: [
      {
        nebo: "Miinii~!",
        thoth: `Great, launching the scanner above ${cityName} now! ${timeMsg}`,
        emoticon: EMOTICONS.scanning,
      },
    ],
    newState: { ...state, stage: 4, city: cityName, subStage: null },
    expectingInput: null,
    showScanResult: true,
  };
}

// ============================================================
// Skip handler — called when kid hits the SKIP button
// ============================================================

export function processSkip(state) {
  return {
    messages: [
      {
        nebo: "Noowoo!",
        thoth: "All good, we can launch the scanner without it.",
        emoticon: EMOTICONS.chill,
      },
    ],
    newState: { ...state, stage: 4, city: "New York City", subStage: null },
    expectingInput: null,
    showScanResult: true,
  };
}

// ============================================================
// Scan complete handler — called after the star chart loads
// ============================================================

export function processScanComplete(state) {
  const { kidName } = state;
  const nameGreeting = kidName ? `${kidName}, look! ` : "Look! ";

  return {
    messages: [
      {
        nebo: "Wii paapmiipniip~!",
        thoth: `${nameGreeting}Nebo found some stars above you! Tap "Learn about these stars" to explore them. Want to scan again?`,
        emoticon: EMOTICONS.excited,
      },
    ],
    newState: { ...state, stage: 5 },
    expectingInput: "yesno",
  };
}

// ============================================================
// Export initial state
// ============================================================

export const INITIAL_STATE = {
  stage: 0,
  kidName: "",
  city: "",
  scanCount: 0,
  subStage: null,
};