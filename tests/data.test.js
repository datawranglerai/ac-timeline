import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { parseCSV, loadEvents, filterEvents, formatYear, shortGame } from "../src/data.js";

test("parseCSV handles BOM, CRLF, escaped quotes, and multiline fields", () => {
  const rows = parseCSV('\uFEFFYear,Era,Title,Description\r\n1,CE,"A, title","line one\r\nline ""two"""\r\n');
  assert.deepEqual(rows, [{ Year: "1", Era: "CE", Title: "A, title", Description: 'line one\r\nline "two"' }]);
});

test("loadEvents validates headers and skips invalid dates", () => {
  assert.match(loadEvents("Year,Era\n1,CE").warnings[0], /Title/);
  const result = loadEvents("Year,Approx,Era,Title\nwat,FALSE,CE,Bad\n0,FALSE,CE,Zero\n-1,FALSE,BCE,Negative\n1.5,FALSE,CE,Fraction\n2,yes,BCE,\n");
  assert.equal(result.events.length, 1);
  assert.equal(result.warnings.length, 4);
  assert.deepEqual(result.events[0], {
    id: result.events[0].id,
    year: -2,
    approx: true,
    era: "BCE",
    category: "Uncategorised",
    character: "Unknown character",
    game: "Unassigned game",
    source: "",
    title: "Untitled memory",
    description: "",
    image: "",
    untitled: true,
  });
});

test("real data loads all 48 rows and preserves approximate BCE dates", async () => {
  const csv = await readFile(new URL("../data/Assassin's Creed Timeline - Data.csv", import.meta.url), "utf8");
  const { events, warnings } = loadEvents(csv);
  assert.equal(events.length, 48);
  assert.equal(warnings.length, 0);
  assert.equal(new Set(events.map(({ game }) => game)).size, 14);
  const staff = events.find(({ title }) => title === "Manufacture of Staff of Hermes Trismegistus");
  assert.equal(staff.year, -75100);
  assert.equal(staff.approx, true);
  assert.equal(events.find(({ title }) => title === "Trojan War").year, -1260);
  assert.equal(events.find(({ title }) => title === "Shroud of Eden Created").source, "Timeline | Assassin's Creed Wiki");
});

test("filterEvents combines facets and accent-insensitive text search", () => {
  const events = [
    { title: "Altaïr returns", description: "Masyaf", game: "Assassin's Creed", category: "Characters", character: "Altaïr" },
    { title: "Staff found", description: "Atlantis", game: "Odyssey", category: "Pieces of Eden", character: "Kassandra" },
  ];
  assert.equal(filterEvents(events, { query: "altair" }).length, 1);
  assert.equal(filterEvents(events, { games: ["Odyssey"], categories: ["Pieces of Eden"] }).length, 1);
  assert.equal(filterEvents(events, { games: ["ODYSSEY"] }).length, 0);
  assert.equal(filterEvents(events, { characters: ["Altair"] }).length, 0);
  assert.equal(filterEvents(events, { characters: [] }).length, 2);
  assert.equal(filterEvents(events, { query: "missing" }).length, 0);
});

test("year and game labels are concise", () => {
  assert.equal(formatYear(-75383, true), "c. 75,383 BCE");
  assert.equal(formatYear(2012), "2,012 CE");
  assert.equal(formatYear(0), "Unknown date");
  assert.equal(shortGame("Assassin's Creed IV: Black Flag"), "IV: Black Flag");
  assert.equal(shortGame("Assassin's Creed: Revelations"), "Revelations");
});
