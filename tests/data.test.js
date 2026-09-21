import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { DATASET_PATH, parseCSV, loadEvents, filterEvents, formatYear, formatSourceDate, shortGame } from "../src/data.js";

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
    eraInferred: false,
    start: "",
    end: "",
    location: "",
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

test("V3 loads all 96 records including Shadows and preserves source metadata", async () => {
  const csv = await readFile(new URL(`../${DATASET_PATH}`, import.meta.url), "utf8");
  const { events, warnings } = loadEvents(csv);
  assert.equal(events.length, 96);
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /CE was inferred/);
  assert.equal(new Set(events.map(({ game }) => game)).size, 18);
  assert.equal(Math.min(...events.map(({ year }) => year)), -77000);
  assert.equal(Math.max(...events.map(({ year }) => year)), 2030);
  const staff = events.find(({ title }) => title === "Manufacture of Staff of Hermes Trismegistus");
  assert.equal(staff.year, -75100);
  assert.equal(staff.approx, true);
  assert.equal(events.find(({ title }) => title === "Trojan War").year, -1260);
  assert.equal(events.find(({ title }) => title === "Shroud of Eden Created").source, "Timeline | Assassin's Creed Wiki");
  const vinland = events.find(({ title }) => title === "Eivor is Laid to Rest in Vinland");
  assert.equal(vinland.year, 920);
  assert.equal(vinland.eraInferred, true);
  const twins = events.find(({ title }) => title.startsWith("Birth of Jacob"));
  assert.equal(twins.location, "Crawley, England");
  assert.equal(twins.start, "1847-01-01");
  assert.equal(twins.end, "1847-11-09");
  assert.equal(filterEvents(events, { query: "Crawley" })[0].id, twins.id);
  const induction = events.find(({ title }) => title.startsWith("Jacob and Evie Frye are inducted"));
  assert.equal(induction.year, 1868);
  assert.equal(induction.start, "1860-01-01");
  assert.equal(induction.end, "1868-01-01");
  assert.equal(formatSourceDate(staff.start), "1 Jan 75,100 BCE");
  assert.equal(formatSourceDate(twins.end), "9 Nov 1847 CE");
  const shadows = filterEvents(events, { games: ["Assassin's Creed Shadows"] });
  assert.equal(shadows.length, 9);
  assert.equal(filterEvents(events, { characters: ['Fujibayashi Naoe'] }).length, 7);
  assert.equal(filterEvents(events, { characters: ['Yasuke'] }).length, 6);
  assert.equal(filterEvents(events, { characters: ['Jacob Frye'] }).length, 3);
  assert.ok(shadows.every(({ year, era, location, source }) => year >= 1564 && year <= 1582 && era === "CE" && location && source));
  assert.equal(shadows.filter(({ approx }) => approx).length, 6);
  assert.equal(filterEvents(shadows, { categories: ["Artefacts"] }).length, 3);
  const naoe = shadows.find(({ title }) => title === "Fujibayashi Naoe is born");
  assert.equal(naoe.year, 1564);
  assert.equal(naoe.approx, true);
  assert.equal(naoe.location, "Iga Province, Japan");
  assert.match(naoe.description, /plotting placeholder/);
});

test("missing eras are inferred only from a matching signed year", () => {
  const { events, warnings } = loadEvents('Year,Era,Real Year,Title\n920,,920,CE fallback\n500,,"-500",BCE fallback\n920,,,No fallback\n920,,900,Conflicting fallback\n920,TYPO,920,Invalid era\n');
  assert.deepEqual(events.map(({ year, era, eraInferred }) => ({ year, era, eraInferred })), [
    { year: 920, era: "CE", eraInferred: true },
    { year: -500, era: "BCE", eraInferred: true },
  ]);
  assert.equal(warnings.length, 5);
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
  assert.equal(formatYear(2012), "2012 CE");
  assert.equal(formatYear(0), "Unknown date");
  assert.equal(shortGame("Assassin's Creed IV: Black Flag"), "IV: Black Flag");
  assert.equal(shortGame("Assassin's Creed: Revelations"), "Revelations");
});

test("calendar years below 5000 omit separators while large years retain them", () => {
  assert.equal(formatYear(2017), "2017 CE");
  assert.equal(formatYear(1564, true), "c. 1564 CE");
  assert.equal(formatYear(-1260), "1260 BCE");
  assert.equal(formatYear(-4999), "4999 BCE");
  assert.equal(formatYear(-5000), "5,000 BCE");
  assert.equal(formatYear(-5001), "5,001 BCE");
  assert.equal(formatYear(-75000), "75,000 BCE");
  assert.equal(formatYear(10000), "10,000 CE");
});

test("recorded dates use the same year formatting as modal headings", () => {
  assert.equal(formatSourceDate("2017-01-01"), "1 Jan 2017 CE");
  assert.equal(formatSourceDate("1847-11-09"), "9 Nov 1847 CE");
  assert.equal(formatSourceDate("-1260-01-01"), "1 Jan 1260 BCE");
  assert.equal(formatSourceDate("-5000-01-01"), "1 Jan 5,000 BCE");
  assert.equal(formatSourceDate("-75100-01-01"), "1 Jan 75,100 BCE");
});
