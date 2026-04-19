/*
 * ============================================================
 * NEBO ENGINE — The Brain
 * ============================================================
 *
 * Mars! This is all the conversation logic from your Lambda,
 * ported to JavaScript so it runs right in the browser.
 *
 * Same translator, same script, same blocklist, same stages.
 * Think of it like moving Nebo's brain from the server
 * into the ship itself. No radio needed — he thinks locally now.
 *
 * This file exports ONE main function: processMessage(input, state)
 * You give it what the kid said + where we are in the conversation,
 * and it gives you back Nebo's response + the new state.
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

  // Preserve capitalization
  if (word[0] === word[0].toUpperCase() && word[0] !== word[0].toLowerCase()) {
    result = result[0].toUpperCase() + result.slice(1);
  }

  // Occasional flair
  result += pick(FLAIR, h >> 2);

  return result;
}

// ============================================================
// Star Database
// ============================================================

const STAR_DATABASE = [
  {
    name: "Sirius",
    fact: "Sirius is the brightest star in the night sky! It's actually two stars orbiting each other, and it's only 8.6 light-years away from Earth.",
  },
  {
    name: "Vega",
    fact: "Vega is one of the brightest stars you can see! It's about 25 light-years away, and thousands of years ago, it used to be Earth's North Star.",
  },
  {
    name: "Arcturus",
    fact: "Arcturus is a red giant star — that means it's old and very big! It shines with an orange glow and is about 37 light-years from Earth.",
  },
  {
    name: "Betelgeuse",
    fact: "Betelgeuse is a supergiant star in the constellation Orion. It's so big that if you put it where our Sun is, it would swallow up Mars! One day it might explode into a supernova.",
  },
  {
    name: "Polaris",
    fact: "Polaris is the North Star! Travelers have used it for hundreds of years to find their way. It sits almost exactly above Earth's North Pole.",
  },
  {
    name: "Rigel",
    fact: "Rigel is a blue supergiant in the constellation Orion. It's incredibly hot and shines about 120,000 times brighter than our Sun!",
  },
  {
    name: "Aldebaran",
    fact: "Aldebaran is an orange giant star that looks like the fiery eye of Taurus the Bull! It's about 65 light-years away from us.",
  },
  {
    name: "Capella",
    fact: "Capella is actually four stars that look like one bright point of light! It's one of the brightest things you can see in the winter sky.",
  },
  {
    name: "Procyon",
    fact: "Procyon means 'before the dog' because it rises just before Sirius, the Dog Star! It's one of our closest stellar neighbors at only 11 light-years away.",
  },
  {
    name: "Deneb",
    fact: "Deneb is so far away — about 2,600 light-years — that the light you see from it left the star before the pyramids were built! It's one of the most luminous stars we know.",
  },
];

function getStarForCity(city) {
  const h = hashStr(city.toLowerCase());
  return STAR_DATABASE[h % STAR_DATABASE.length];
}

function isDaytime() {
  const now = new Date();
  const hour = now.getHours(); // Uses the kid's local time — way better than UTC guessing!
  return hour >= 7 && hour <= 19;
}

// ============================================================
// Script — all the conversation lines
// ============================================================

const SCRIPT = {
  0: {
    any: {
      nebo: "Uub… mee ba pfuu?",
      thoth: "Hello. I'm the ship's computer, Thoth. That's Nebo. What's your name?",
    },
  },
  // Stage 1: name entry — handled by the processMessage logic
  2: {
    yes: {
      nebo: "Noowoo!",
      thoth: "That's good to hear. We're lost on Earth. We crashed here when a comet hit our ship. Did you see the comet?",
    },
    no: {
      nebo: "Nib otz~! Plaabpfaab~!",
      thoth: "Oh no. We were hoping to meet a nice human since we crashed here on Earth. A comet hit our ship. Did you see the comet?",
    },
  },
  3: {
    yes: {
      nebo: "Pfuu nop?! Wubru~ nop uub brobplob uubbuub?",
      thoth: "Nebo wants to know what it looked like. He's an astronomer, which means he studies the stars. But he didn't see the comet coming. Do you look at the stars?",
    },
    no: {
      nebo: "Uub ub wii pleepfee! Wii pleepfee bruu mobnob~.",
      thoth: "Nebo says it was very scary and bright. He's an astronomer, which means he studies the stars. But he didn't see the comet coming. Do you look at the stars?",
    },
  },
  4: {
    yes: {
      nebo: "Na pliibpfiib pubuu a popbop~. Bipi brutz boouu~ iiblii a popbop~ mimnim~ bluup?",
      thoth: "Nebo loves star-watching. He always wants to learn more about the stars. Do you want to learn more about the stars with him?",
    },
    no: {
      nebo: "Na pliibpfiib pubuu a popbop~. Bipi brutz boouu~ iiblii a popbop~ mimnim~ bluup?",
      thoth: "Nebo loves star-watching. He always wants to learn more about the stars. Do you want to learn more about the stars with him?",
    },
  },
  5: {
    yes: {
      nebo: "Pfa! Wii blaaaabii~!",
      thoth: "Nebo's happy to hear that. Where are you? Type your city name so Nebo can scan the sky above you!",
    },
    no: {
      nebo: "Naa~…",
      thoth: "Well, we're always here if you change your mind. We need to learn more about the stars if we are ever going to complete our mission and return home.",
    },
  },
  8: {
    yes: {
      nebo: "Miinii~!",
      thoth: "Scanning the sky again...",
    },
    no: {
      nebo: "Naa~…",
      thoth: "That's okay! The stars will always be here. Come back anytime you want to explore.",
    },
  },
};

const FALLBACK_RESPONSES = {
  0: { nebo: "…?", thoth: "Nebo's a little confused. Try saying hello!" },
  1: { nebo: "…?", thoth: "Nebo wants to know your name! Just type it in." },
  2: { nebo: "…?", thoth: "Nebo didn't quite catch that. Are you a nice human? You can say yes or no." },
  3: { nebo: "…?", thoth: "Nebo's still wondering — did you see the comet? You can say yes or no." },
  4: { nebo: "…?", thoth: "Nebo wants to know — do you look at the stars? You can say yes or no." },
  5: { nebo: "…?", thoth: "Do you want to learn more about the stars with Nebo? You can say yes or no." },
  6: { nebo: "…?", thoth: "Type your city name so Nebo can scan the sky above you!" },
  7: { nebo: "…?", thoth: "Nebo's scanner is warming up. Hang tight!" },
  8: { nebo: "…?", thoth: "Want to scan for another star? You can say yes or no." },
};

// ============================================================
// Intent detection — figuring out what the kid meant
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

  // Check greetings first
  if (GREETING_WORDS.some((g) => lower === g || lower.startsWith(g + " ") || lower.startsWith(g + "!"))) {
    return "greeting";
  }

  // Check yes
  if (YES_WORDS.some((y) => lower === y || lower.startsWith(y + " ") || lower.startsWith(y + "!"))) {
    return "yes";
  }

  // Check no
  if (NO_WORDS.some((n) => lower === n || lower.startsWith(n + " ") || lower.startsWith(n + "!"))) {
    return "no";
  }

  // Anything else could be a name or city
  return "other";
}

// ============================================================
// Build scan response
// ============================================================

function buildScanResponse(city, kidName) {
  const star = getStarForCity(city);
  const neboStar = toNebo(star.name);

  const timeMsg = isDaytime()
    ? "Even though it's daytime, the stars are still shining bright above us. It's just hard to see them without a special scanner!"
    : "Even if you can't see them all clearly, the stars are shining bright above us!";

  const nameGreeting = kidName ? `Look, ${kidName}! ` : "";

  return {
    messages: [
      { nebo: "Miinii~!", thoth: `Scanning the sky above ${city}... ${timeMsg}` },
      { nebo: `${neboStar}!`, thoth: `${nameGreeting}Right now above you, the brightest star is ${star.name}. ${star.fact}` },
      { nebo: "Wii paapmiipniip~!", thoth: "Want to scan for another star?" },
    ],
    starName: star.name,
  };
}

// ============================================================
// Main processor — THE function your React app calls
// ============================================================
/*
 * Mars! This is the heart of it all.
 *
 * state = {
 *   stage: 0,        // where we are in the conversation
 *   kidName: "",      // the kid's name (once they tell us)
 *   city: "",         // the kid's city (once they tell us)
 * }
 *
 * Returns: {
 *   messages: [{ nebo: "...", thoth: "..." }, ...],
 *   newState: { stage, kidName, city },
 *   expectingInput: "yesno" | "text" | "city" | null,
 * }
 */

export function processMessage(input, state) {
  const { stage, kidName, city } = state;
  const intent = detectIntent(input);

  // ---- Stage 0: waiting for a greeting ----
  if (stage === 0) {
    if (intent === "greeting" || intent === "other") {
      return {
        messages: [SCRIPT[0].any],
        newState: { ...state, stage: 1 },
        expectingInput: "text",
      };
    }
    return {
      messages: [FALLBACK_RESPONSES[0]],
      newState: state,
      expectingInput: "text",
    };
  }

  // ---- Stage 1: waiting for the kid's name ----
  if (stage === 1) {
    // Whatever they type is their name
    let name = input.replace(/[^a-zA-Z\s]/g, "").trim();
    name = name ? name.split(" ")[0] : ""; // Take first word only
    name = name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();

    if (!name) {
      return {
        messages: [FALLBACK_RESPONSES[1]],
        newState: state,
        expectingInput: "text",
      };
    }

    // Blocklist check!
    if (isBad(name)) {
      return {
        messages: [
          {
            nebo: "Nib otz~!",
            thoth: "Hmm, Nebo doesn't think that's your real name. Can you try again?",
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
          thoth: `Nebo says hello, ${name}! He wants to know — are you a nice human?`,
        },
      ],
      newState: { ...state, stage: 2, kidName: name },
      expectingInput: "yesno",
    };
  }

  // ---- Stages 2–5: yes/no conversation flow ----
  if (stage >= 2 && stage <= 5) {
    if (intent === "yes" || intent === "no") {
      const stageData = SCRIPT[stage];
      const response = stageData[intent];

      // Stage 5 "yes" means they want to scan — ask for city
      if (stage === 5 && intent === "yes") {
        return {
          messages: [response],
          newState: { ...state, stage: 6 },
          expectingInput: "city",
        };
      }

      // Stage 5 "no" means they're done — stay at 5
      if (stage === 5 && intent === "no") {
        return {
          messages: [response],
          newState: { ...state, stage: 5 },
          expectingInput: null,
        };
      }

      return {
        messages: [response],
        newState: { ...state, stage: stage + 1 },
        expectingInput: "yesno",
      };
    }

    // Kid said something unexpected
    return {
      messages: [FALLBACK_RESPONSES[stage]],
      newState: state,
      expectingInput: "yesno",
    };
  }

  // ---- Stage 6: waiting for city name ----
  if (stage === 6) {
    const cityName = input.replace(/[^a-zA-Z\s]/g, "").trim();

    if (!cityName) {
      return {
        messages: [FALLBACK_RESPONSES[6]],
        newState: state,
        expectingInput: "city",
      };
    }

    if (isBad(cityName)) {
      return {
        messages: [
          {
            nebo: "Nib otz~!",
            thoth: "That doesn't look like a real city name. Can you try again?",
          },
        ],
        newState: state,
        expectingInput: "city",
      };
    }

    const capitalizedCity =
      cityName.charAt(0).toUpperCase() + cityName.slice(1).toLowerCase();
    const scanResult = buildScanResponse(capitalizedCity, kidName);

    return {
      messages: scanResult.messages,
      newState: { ...state, stage: 8, city: capitalizedCity },
      expectingInput: "yesno",
    };
  }

  // ---- Stage 8: scan again? ----
  if (stage === 8) {
    if (intent === "yes") {
      // Rescan with same city
      const scanResult = buildScanResponse(city || "New York", kidName);
      return {
        messages: scanResult.messages,
        newState: { ...state, stage: 8 },
        expectingInput: "yesno",
      };
    }

    if (intent === "no") {
      return {
        messages: [SCRIPT[8].no],
        newState: { ...state, stage: 8 },
        expectingInput: null,
      };
    }

    return {
      messages: [FALLBACK_RESPONSES[8]],
      newState: state,
      expectingInput: "yesno",
    };
  }

  // Fallback for any weird state
  return {
    messages: [{ nebo: "…?", thoth: "Nebo's confused. Try again!" }],
    newState: state,
    expectingInput: "text",
  };
}

// Export the initial state so App.js can use it
export const INITIAL_STATE = {
  stage: 0,
  kidName: "",
  city: "",
};
