const AVATAR_ROOT = "./assets/avatars";

function media(id, { portrait = id, gif = id, poster = gif, fullbody = id } = {}) {
  return {
    headshot: portrait ? `${AVATAR_ROOT}/portraits/${portrait}.png` : null,
    gif: gif ? `${AVATAR_ROOT}/GIFs/${gif}.gif` : null,
    poster: poster ? `${AVATAR_ROOT}/posters/${poster}.webp` : null,
    fullbody: fullbody ? `${AVATAR_ROOT}/figures/${fullbody}.webp` : null,
  };
}

/**
 * Character identities with artwork supplied by the project. Aliases are
 * matched as complete names after case, accent, whitespace, and punctuation
 * normalization; they are never used as substring searches.
 */
export const CHARACTERS = [
  { id: "aiden", name: "Aiden Pearce", aliases: [], ...media("aiden") },
  { id: "almualim", name: "Al Mualim", aliases: ["Al-Mualim"], ...media("almualim") },
  {
    id: "altair",
    name: "Altaïr Ibn-La'Ahad",
    aliases: ["Altair Ibn-La'Ahad", "Altaïr Ibn-La’Ahad", "Altaïr"],
    ...media("altair"),
  },
  { id: "arno", name: "Arno Victor Dorian", aliases: ["Arno Dorian"], ...media("arno") },
  { id: "aya", name: "Aya", aliases: ["Amunet"], ...media("aya") },
  { id: "basim", name: "Basim Ibn Ishaq", aliases: ["Basim"], ...media("basim") },
  { id: "bayek", name: "Bayek of Siwa", aliases: ["Bayek"], ...media("bayek") },
  {
    id: "connor",
    name: "Ratonhnhaké:ton",
    displayName: "Connor",
    aliases: ["Connor", "Connor Kenway", "Ratonhnhake:ton"],
    ...media("connor"),
  },
  { id: "desmond", name: "Desmond Miles", aliases: ["Desmond"], ...media("desmond") },
  { id: "edward", name: "Edward Kenway", aliases: [], ...media("edward") },
  { id: "eivor", name: "Eivor Varinsdottir", aliases: ["Eivor"], ...media("eivor") },
  { id: "ezio", name: "Ezio Auditore da Firenze", aliases: ["Ezio Auditore"], ...media("ezio") },
  {
    id: "eviefrye",
    name: "Evie Frye",
    aliases: ["Evie"],
    ...media("eviefrye", { portrait: "fryetwins", gif: "fryetwins" }),
  },
  {
    id: "jacobfrye",
    name: "Jacob Frye",
    aliases: ["Jacob"],
    ...media("jacobfrye", { portrait: "fryetwins", gif: "fryetwins" }),
  },
  { id: "haytham", name: "Haytham Kenway", aliases: ["Haytham"], ...media("haytham") },
  { id: "hytham", name: "Hytham", aliases: [], ...media("hytham") },
  { id: "juno", name: "Juno", aliases: [], ...media("juno") },
  { id: "jupiter", name: "Jupiter", aliases: [], ...media("jupiter", { gif: null }) },
  { id: "kassandra", name: "Kassandra", aliases: [], ...media("kassandra") },
  { id: "layla", name: "Layla Hassan", aliases: ["Layla"], ...media("layla") },
  { id: "minerva", name: "Minerva", aliases: [], ...media("minerva") },
  {
    id: "naoe",
    name: "Fujibayashi Naoe",
    aliases: ["Naoe", "Naoe Fujibayashi"],
    ...media("naoe"),
  },
  { id: "reda", name: "Reda", aliases: [], ...media("reda", { gif: null }) },
  { id: "yasuke", name: "Yasuke", aliases: [], ...media("yasuke") },
];

function normalizeName(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("en")
    .replace(/[\p{P}\p{S}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

const CHARACTER_BY_NAME = new Map();

for (const character of CHARACTERS) {
  for (const name of [character.name, ...character.aliases]) {
    const key = normalizeName(name);
    const existing = CHARACTER_BY_NAME.get(key);
    if (existing && existing.id !== character.id) {
      throw new Error(`Character alias collision: ${name}`);
    }
    CHARACTER_BY_NAME.set(key, character);
  }
}

function characterNames(value) {
  return String(value ?? "")
    .split(/\s*(?:;|,|&)\s*/)
    .map((name) => name.trim())
    .filter(Boolean);
}

/** Return every named participant for a facet, canonicalizing known aliases. */
export function characterLabelsForEvent(event) {
  const labels = [];
  const seen = new Set();

  for (const sourceName of characterNames(event?.character)) {
    const character = CHARACTER_BY_NAME.get(normalizeName(sourceName));
    const label = character?.name ?? sourceName;
    const key = normalizeName(label);
    if (seen.has(key)) continue;
    seen.add(key);
    labels.push(label);
  }

  return labels;
}

/** Return all explicitly named characters for one event, in source order. */
export function charactersForEvent(event) {
  const matches = [];
  const seen = new Set();

  for (const name of characterNames(event?.character)) {
    const character = CHARACTER_BY_NAME.get(normalizeName(name));
    if (!character || seen.has(character.id)) continue;
    seen.add(character.id);
    matches.push(character);
  }

  return matches;
}

/** Return each explicitly named character once, preserving event/source order. */
export function charactersForEvents(events) {
  const matches = [];
  const seen = new Set();

  for (const event of events ?? []) {
    for (const character of charactersForEvent(event)) {
      if (seen.has(character.id)) continue;
      seen.add(character.id);
      matches.push(character);
    }
  }

  return matches;
}
