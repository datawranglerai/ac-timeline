export const DATASET_PATH = "data/Assassin's Creed Timeline - Data V2.csv";

const REQUIRED_HEADERS = ["Year", "Era", "Title"];

/** Parse RFC 4180-style CSV, including escaped quotes and quoted newlines. */
export function parseCSV(text) {
  const input = String(text ?? "").replace(/^\uFEFF/, "");
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < input.length; index += 1) {
    const character = input[index];

    if (quoted) {
      if (character === '"') {
        if (input[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          quoted = false;
        }
      } else {
        field += character;
      }
      continue;
    }

    if (character === '"' && field.length === 0) {
      quoted = true;
    } else if (character === ",") {
      row.push(field);
      field = "";
    } else if (character === "\n" || character === "\r") {
      if (character === "\r" && input[index + 1] === "\n") index += 1;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += character;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  if (rows.length === 0) return [];
  const headers = rows[0].map((header) => header.trim());

  return rows.slice(1)
    .filter((values) => values.some((value) => value.length > 0))
    .map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""])));
}

function stableHash(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function trimmed(row, field) {
  return String(row[field] ?? "").trim();
}

/** Convert source rows into the app's stable event shape. */
export function loadEvents(text) {
  const rows = parseCSV(text);
  const warnings = [];
  if (rows.length === 0) {
    return { events: [], warnings: ["CSV contains no data rows."] };
  }

  const headers = new Set(Object.keys(rows[0]));
  const missingHeaders = REQUIRED_HEADERS.filter((header) => !headers.has(header));
  if (missingHeaders.length > 0) {
    return {
      events: [],
      warnings: [`Missing required header${missingHeaders.length === 1 ? "" : "s"}: ${missingHeaders.join(", ")}.`],
    };
  }

  const occurrences = new Map();
  const events = [];

  rows.forEach((row, index) => {
    const rowNumber = index + 2;
    let era = trimmed(row, "Era").toUpperCase();
    const rawYear = trimmed(row, "Year").replaceAll(",", "");
    const magnitude = Number(rawYear);
    const realYear = Number(trimmed(row, "Real Year").replaceAll(",", ""));
    const eraInferred = era === "" && Number.isInteger(realYear) && realYear !== 0 && Math.abs(realYear) === magnitude;
    if (eraInferred) era = realYear < 0 ? "BCE" : "CE";

    if (
      (era !== "BCE" && era !== "CE")
      || !Number.isInteger(magnitude)
      || magnitude <= 0
      || rawYear === ""
    ) {
      warnings.push(`Row ${rowNumber} has an invalid year or era and was skipped.`);
      return;
    }
    if (eraInferred) warnings.push(`Record ${rowNumber - 1} is missing Era; ${era} was inferred from its signed Real Year.`);

    const titleValue = trimmed(row, "Title");
    const content = Object.keys(row).map((key) => `${key}:${trimmed(row, key)}`).join("|");
    const hash = stableHash(content);
    const occurrence = (occurrences.get(hash) ?? 0) + 1;
    occurrences.set(hash, occurrence);

    events.push({
      id: `event-${hash}${occurrence > 1 ? `-${occurrence}` : ""}`,
      year: era === "BCE" ? -Math.abs(magnitude) : Math.abs(magnitude),
      approx: /^(true|yes|1)$/i.test(trimmed(row, "Approx")),
      era,
      eraInferred,
      start: trimmed(row, "Start"),
      end: trimmed(row, "End"),
      location: trimmed(row, "Location"),
      category: trimmed(row, "Category") || "Uncategorised",
      character: trimmed(row, "Character") || "Unknown character",
      game: trimmed(row, "Game") || "Unassigned game",
      source: trimmed(row, "Source"),
      title: titleValue || "Untitled memory",
      description: trimmed(row, "Description"),
      image: trimmed(row, "Image"),
      untitled: titleValue === "",
    });
  });

  return { events, warnings };
}

function searchable(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase();
}

export function filterEvents(events, filters = {}) {
  const { query = "", games = [], categories = [], characters = [] } = filters;
  const wantedGames = new Set(games);
  const wantedCategories = new Set(categories);
  const wantedCharacters = new Set(characters);
  const needle = searchable(query).trim();

  return events.filter((event) => {
    if (wantedGames.size > 0 && !wantedGames.has(event.game)) return false;
    if (wantedCategories.size > 0 && !wantedCategories.has(event.category)) return false;
    if (wantedCharacters.size > 0 && !wantedCharacters.has(event.character)) return false;
    if (!needle) return true;
    return Object.values(event).some((value) => searchable(value).includes(needle));
  });
}

export function formatYear(year, approx = false) {
  const numericYear = Number(year);
  if (!Number.isFinite(numericYear) || numericYear === 0) return "Unknown date";
  const label = numericYear < 0
    ? `${Math.abs(numericYear).toLocaleString("en-GB")} BCE`
    : `${numericYear.toLocaleString("en-GB")} CE`;
  return approx ? `c. ${label}` : label;
}

export function formatSourceDate(value) {
  const match = /^(-?\d+)-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return value;
  const [, year, month, day] = match.map(Number);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  if (!year || !months[month - 1] || day < 1 || day > 31) return value;
  return `${day} ${months[month - 1]} ${formatYear(year)}`;
}

export function shortGame(game) {
  const value = String(game ?? "").trim();
  if (/^Assassin['’]s Creed$/i.test(value)) return value;
  return value.replace(/^Assassin['’]s Creed\s*(?::|–|—|-)?\s*/i, "") || value;
}
