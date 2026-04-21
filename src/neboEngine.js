/*
 * ============================================================
 * NEBO ENGINE v3 — The Fully Integrated Brain
 * ============================================================
 *
 * Mars! This is the big integration build. Everything wired together:
 *
 * NEW in v3:
 * - Star database v2: 27 verified stars, 3 per constellation
 * - Seasonal constellation picker (month-based visibility)
 * - Typo tolerance for star names (edit distance matching)
 * - Place name detection (handles "Nebraska" as a location answer)
 * - Repeat constellation tracking
 * - Loading screen facts (randomized, 2.5s cycle)
 * - Proper multi-word capitalization
 * - Nebo-speak goodbye
 *
 * STAGE MAP (unchanged):
 *   0 → Kid says hi (greeting)
 *   1 → Kid enters name
 *   2 → "Can you help?" (yes/no)
 *       → no → "Can you tell us where we landed?" (yes/no OR place name)
 *   3 → City picker (state/city dropdowns OR skip)
 *   4 → Scan result displayed
 *   5 → "Scan again?" / type star name
 *
 * BAIL-OUT STAGES:
 *   90 → Said no to everything
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

export function translateLine(text) {
  return text.replace(/[a-zA-Z]+/g, (m) => toNebo(m));
}

// ============================================================
// Proper capitalization for multi-word names
// "new york" → "New York", "los angeles" → "Los Angeles"
// ============================================================

function capitalizeWords(str) {
  return str
    .trim()
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

// ============================================================
// Typo tolerance — Levenshtein edit distance
// If the kid types "betelguse" we match to "Betelgeuse"
// ============================================================

function editDistance(a, b) {
  a = a.toLowerCase();
  b = b.toLowerCase();
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

/**
 * Find a fuzzy match in a list of names.
 * Returns the matched name or null.
 * Threshold scales with word length: short words need closer match.
 */
export function fuzzyMatch(input, names) {
  const lower = input.toLowerCase().trim();

  // Exact match first
  const exact = names.find((n) => n.toLowerCase() === lower);
  if (exact) return exact;

  // Fuzzy match
  let bestMatch = null;
  let bestDist = Infinity;

  for (const name of names) {
    const dist = editDistance(lower, name.toLowerCase());
    // Threshold: allow 1 error for short names, 2 for medium, 3 for long
    const threshold = name.length <= 4 ? 1 : name.length <= 7 ? 2 : 3;
    if (dist <= threshold && dist < bestDist) {
      bestDist = dist;
      bestMatch = name;
    }
  }

  return bestMatch;
}

// ============================================================
// Star Database v2 — 27 verified stars, 3 per constellation
// Sources: Wikipedia, Britannica, star-facts.com
// ============================================================

const STAR_DATABASE = [
  // ---- ORION (ori) ----
  {
    name: "Betelgeuse",
    constellation: "ori",
    fact: "Betelgeuse is a red supergiant star in the constellation Orion. It's so huge that if you put it where our Sun is, it would swallow up Mars! One day it will explode in a supernova.",
  },
  {
    name: "Rigel",
    constellation: "ori",
    fact: "Rigel is a blue supergiant in Orion. It's incredibly hot and shines about 120,000 times brighter than our Sun! It marks one of Orion's feet.",
  },
  {
    name: "Bellatrix",
    constellation: "ori",
    fact: "Bellatrix means 'female warrior' in Latin! It marks Orion's left shoulder and is about 250 light-years away. It's one of the closest bright stars in Orion.",
  },

  // ---- CANIS MAJOR (cma) ----
  {
    name: "Sirius",
    constellation: "cma",
    fact: "Sirius is the brightest star in the night sky! It's actually two stars orbiting each other, and it's only 8.6 light-years away — one of our closest neighbors.",
  },
  {
    name: "Adhara",
    constellation: "cma",
    fact: "Adhara is the second brightest star in the Great Dog constellation. About 4.7 million years ago, it was actually the brightest star in the entire sky!",
  },
  {
    name: "Wezen",
    constellation: "cma",
    fact: "Wezen is a supergiant star about 1,600 light-years away. It's so big that it's over 200 times wider than our Sun! Its name means 'the weight' in Arabic.",
  },

  // ---- LYRA (lyr) ----
  {
    name: "Vega",
    constellation: "lyr",
    fact: "Vega is one of the brightest stars you can see! It's about 25 light-years away, and thousands of years ago it used to be Earth's North Star. It will be again in about 12,000 years!",
  },
  {
    name: "Sheliak",
    constellation: "lyr",
    fact: "Sheliak is actually two stars so close together that they pull material off each other! They orbit each other every 13 days, and one star is shaped like an egg because of the pulling.",
  },
  {
    name: "Sulafat",
    constellation: "lyr",
    fact: "Sulafat is a blue-white giant star about 620 light-years away. Its name comes from Arabic and means 'the turtle.' It's the second brightest star in the Lyra constellation!",
  },

  // ---- BOÖTES (boo) ----
  {
    name: "Arcturus",
    constellation: "boo",
    fact: "Arcturus is a red giant star that shines with an orange glow. It's about 37 light-years away and is the brightest star in the northern half of the sky!",
  },
  {
    name: "Izar",
    constellation: "boo",
    fact: "Izar is one of the most beautiful double stars in the sky! Through a telescope, you can see it's actually two stars — one orange and one blue — right next to each other.",
  },
  {
    name: "Muphrid",
    constellation: "boo",
    fact: "Muphrid is almost the same distance from Earth as its neighbor Arcturus — about 37 light-years! The two stars are only 3.3 light-years apart from each other in space.",
  },

  // ---- URSA MINOR (umi) ----
  {
    name: "Polaris",
    constellation: "umi",
    fact: "Polaris is the North Star! Travelers have used it for hundreds of years to find their way. It sits almost exactly above Earth's North Pole and is actually a system of three stars.",
  },
  {
    name: "Kochab",
    constellation: "umi",
    fact: "Kochab used to be the North Star about 3,000 years ago, back when the ancient Egyptians were building temples! It's an orange giant about 131 light-years away.",
  },
  {
    name: "Pherkad",
    constellation: "umi",
    fact: "Pherkad and its neighbor Kochab are called 'the Guardians of the Pole' because they appear to circle around Polaris. Pherkad is about 487 light-years away!",
  },

  // ---- TAURUS (tau) ----
  {
    name: "Aldebaran",
    constellation: "tau",
    fact: "Aldebaran is an orange giant star that looks like the fiery eye of Taurus the Bull! It's about 65 light-years away, and its name means 'the follower' in Arabic.",
  },
  {
    name: "Elnath",
    constellation: "tau",
    fact: "Elnath marks the tip of one of the Bull's horns! It's about 134 light-years away and its name means 'the butting one' because the Bull is charging with its horns.",
  },
  {
    name: "Alcyone",
    constellation: "tau",
    fact: "Alcyone is the brightest star in the Pleiades, a famous cluster also called the Seven Sisters! It's actually four stars that look like one, about 440 light-years away.",
  },

  // ---- AURIGA (aur) ----
  {
    name: "Capella",
    constellation: "aur",
    fact: "Capella is actually four stars that look like one bright point of light! It's one of the brightest things you can see in the winter sky, about 43 light-years from Earth.",
  },
  {
    name: "Menkalinan",
    constellation: "aur",
    fact: "Menkalinan is two stars orbiting each other so closely that they eclipse each other every 4 days! Its name means 'shoulder of the charioteer' in Arabic.",
  },
  {
    name: "Mahasim",
    constellation: "aur",
    fact: "Mahasim is a binary star about 166 light-years away. Its name means 'the wrist' because it marks the wrist of Auriga, the Charioteer constellation!",
  },

  // ---- CANIS MINOR (cmi) ----
  {
    name: "Procyon",
    constellation: "cmi",
    fact: "Procyon means 'before the dog' because it rises just before Sirius, the Dog Star! It's one of our closest neighbors at only 11 light-years away.",
  },
  {
    name: "Gomeisa",
    constellation: "cmi",
    fact: "Gomeisa is a blue-white star about 162 light-years away. Its funny name means 'the bleary-eyed one' in Arabic! It's the second brightest star in the Little Dog.",
  },
  {
    name: "Luyten's Star",
    constellation: "cmi",
    fact: "Luyten's Star is a tiny red dwarf only 12 light-years away — super close! Scientists found planets orbiting it, and one might be in the zone where liquid water could exist!",
  },

  // ---- CYGNUS (cyg) ----
  {
    name: "Deneb",
    constellation: "cyg",
    fact: "Deneb is so far away — about 2,600 light-years — that the light you see left the star before the pyramids were built! It's one of the most powerful stars we know.",
  },
  {
    name: "Albireo",
    constellation: "cyg",
    fact: "Albireo is one of the most beautiful sights through a telescope — it looks like one star but is actually a gold star and a blue star right next to each other!",
  },
  {
    name: "Sadr",
    constellation: "cyg",
    fact: "Sadr sits right at the heart of Cygnus the Swan, where the wings cross the body. It's a supergiant star about 1,800 light-years away and its name means 'the chest' in Arabic.",
  },
];

// ============================================================
// Seasonal constellation visibility (US, ~40°N)
// Sources: constellation-guide.com, starwalk.space
// ============================================================

const SEASONAL_CONSTELLATIONS = {
  1:  ["ori", "cma", "cmi", "tau", "aur", "umi"],
  2:  ["ori", "cma", "cmi", "tau", "aur", "umi"],
  3:  ["ori", "cma", "cmi", "tau", "aur", "umi"],
  4:  ["cmi", "aur", "boo", "umi"],
  5:  ["boo", "lyr", "umi"],
  6:  ["boo", "lyr", "cyg", "umi"],
  7:  ["boo", "lyr", "cyg", "umi"],
  8:  ["lyr", "cyg", "umi"],
  9:  ["lyr", "cyg", "umi"],
  10: ["cyg", "umi"],
  11: ["ori", "tau", "aur", "cyg", "umi"],
  12: ["ori", "cma", "tau", "aur", "umi"],
};

export function getVisibleConstellations() {
  const month = new Date().getMonth() + 1;
  return SEASONAL_CONSTELLATIONS[month] || ["umi"];
}

/**
 * Pick a constellation for a city, filtered by season.
 * Avoids repeats if seenConstellations is provided.
 */
export function pickConstellation(city, scanCount = 0, seenConstellations = []) {
  const visible = getVisibleConstellations();

  // Filter out already-seen constellations
  const unseen = visible.filter((c) => !seenConstellations.includes(c));

  // If all seen, return null (triggers "that's all for this month" message)
  if (unseen.length === 0) return null;

  // Hash city + scanCount to pick deterministically
  const str = city.toLowerCase() + String(scanCount);
  const h = hashStr(str);
  return unseen[h % unseen.length];
}

/**
 * Get the 3 stars for a given constellation ID.
 */
export function getStarsForConstellation(constellationId) {
  return STAR_DATABASE.filter((s) => s.constellation === constellationId);
}

// Constellation display names for the "all seen" message
const CONSTELLATION_NAMES = {
  ori: "Orion",
  cma: "Canis Major",
  cmi: "Canis Minor",
  tau: "Taurus",
  aur: "Auriga",
  lyr: "Lyra",
  cyg: "Cygnus",
  boo: "Boötes",
  umi: "Ursa Minor",
};

export function getConstellationName(id) {
  return CONSTELLATION_NAMES[id] || id;
}

// ============================================================
// Loading screen facts
// Sources: rewritten from NatGeo Kids space facts
// Randomized, shown every 2.5s during star chart loading
// ============================================================

export const LOADING_FACTS = [
  "You could fit one million Earths inside the Sun!",
  "Scientists found evidence of water on Mars!",
  "Comets are made of sand, ice, and carbon dioxide — leftovers from when our solar system was born.",
  "Jupiter, Saturn, Uranus, and Neptune have no solid ground — you couldn't walk on them!",
  "Flying a plane to Pluto would take over 800 years!",
  "There are about 500,000 pieces of space junk orbiting Earth right now.",
  "A car-sized asteroid enters Earth's atmosphere about once a year — but it burns up before reaching us!",
  "The tallest mountain we know of is on an asteroid called Vesta — three times taller than Mount Everest!",
  "There are more stars in the universe than grains of sand on all Earth's beaches.",
  "Sunsets on Mars look blue!",
];

export function getShuffledFacts() {
  const shuffled = [...LOADING_FACTS];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
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
  5: { nebo: "…?", thoth: "Try typing one of the star names above, or say yes to scan again!", emoticon: EMOTICONS.happy },
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
 *   subStage: null,
 *   seenConstellations: [],   // tracks which constellations kid has seen
 *   currentConstellation: null, // current constellation ID
 * }
 */

export function processMessage(input, state) {
  const { stage, kidName, city, scanCount = 0, subStage, seenConstellations = [] } = state;
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
            thoth: "Oh Nebo's so glad and so am I! We're trying to launch our star scanner. Do you know what city we landed in?",
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
      const neboGoodbye = translateLine("Okay bye then");
      return {
        messages: [
          {
            nebo: neboGoodbye,
            thoth: "Alright, well, if you see any nice humans who can help, send them our way. Goodbye.",
            emoticon: EMOTICONS.blank,
          },
        ],
        newState: { ...state, stage: 90, subStage: null },
        expectingInput: null,
      };
    }

    // NEW: Check if they typed a place name instead of yes/no
    if (intent === "other") {
      const cleaned = input.replace(/[^a-zA-Z\s'-]/g, "").trim();
      if (cleaned.length >= 2 && !isBad(cleaned)) {
        // Treat it as a location — launch scanner directly!
        const capitalized = capitalizeWords(cleaned);
        return processCitySelection(capitalized, { ...state, subStage: null });
      }
    }

    return {
      messages: [FALLBACK_RESPONSES["2no"]],
      newState: state,
      expectingInput: "yesno",
    };
  }

  // ---- Stage 3: city picker ----
  if (stage === 3) {
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

    const capitalized = capitalizeWords(cityName);
    return processCitySelection(capitalized, state);
  }

  // ---- Stage 5: scan results — type star name or yes/no ----
  if (stage === 5) {
    if (intent === "yes") {
      // Check if all constellations have been seen
      const nextConstellation = pickConstellation(
        city || "New York City",
        scanCount + 1,
        seenConstellations
      );

      if (nextConstellation === null) {
        // All constellations seen this month!
        const seenNames = seenConstellations.map((c) => getConstellationName(c)).join(", ");
        return {
          messages: [
            {
              nebo: translateLine("We saw them all!"),
              thoth: `That's all the constellations you can see this month! Want to look back at any of them? ${seenNames}`,
              emoticon: EMOTICONS.excited,
            },
          ],
          newState: { ...state, seenConstellations: [] }, // reset so they can revisit
          expectingInput: "text",
        };
      }

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

    // Check if they typed a star name (with typo tolerance)
    if (intent === "other") {
      const currentStars = state.currentConstellation
        ? getStarsForConstellation(state.currentConstellation)
        : [];
      const starNames = currentStars.map((s) => s.name);
      const matched = fuzzyMatch(input.trim(), starNames);

      if (matched) {
        const star = currentStars.find((s) => s.name === matched);
        return {
          messages: [
            {
              nebo: toNebo(matched) + "!",
              thoth: star.fact + " Want to scan again?",
              emoticon: EMOTICONS.excited,
            },
          ],
          newState: state,
          expectingInput: "text",
          starFactShown: true,
        };
      }

      // Not a star name, not yes/no — nudge them
      return {
        messages: [FALLBACK_RESPONSES[5]],
        newState: state,
        expectingInput: "text",
      };
    }

    return {
      messages: [FALLBACK_RESPONSES[5]],
      newState: state,
      expectingInput: "text",
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
// City selection handler
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
// Skip handler
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
// Scan complete handler
// ============================================================

export function processScanComplete(state, stars, constellationId) {
  const starNames = stars.map((s) => s.name).join(", ");

  // Track this constellation as seen
  const seen = [...(state.seenConstellations || [])];
  if (constellationId && !seen.includes(constellationId)) {
    seen.push(constellationId);
  }

  return {
    messages: [
      {
        nebo: "Wii paapmiipniip~!",
        thoth: `Learning about the stars will help us get home! Which star do you want to learn more about? ${starNames}`,
        emoticon: EMOTICONS.excited,
      },
    ],
    newState: {
      ...state,
      stage: 5,
      seenConstellations: seen,
      currentConstellation: constellationId,
    },
    expectingInput: "text",
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
  seenConstellations: [],
  currentConstellation: null,
};