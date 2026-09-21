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

test("the current dataset loads every source row and preserves its dates and metadata", async () => {
  const csv = await readFile(new URL(`../${DATASET_PATH}`, import.meta.url), "utf8");
  const rows = parseCSV(csv);
  const { events, warnings } = loadEvents(csv);
  assert.ok(rows.length > 0, "The published dataset must not be empty");
  assert.equal(events.length, rows.length, "Every source row must load without being skipped");
  assert.equal(new Set(events.map(({ id }) => id)).size, events.length, "Memory IDs must be unique");

  const expectedWarnings = [];
  for (const [index, row] of rows.entries()) {
    const event = events[index];
    const label = `Source row ${index + 2}`;
    assert.ok(typeof event.id === "string" && event.id.length > 0, `${label}: nonempty memory ID`);
    const magnitude = Number(row.Year.trim().replaceAll(",", ""));
    let era = row.Era.trim().toUpperCase();
    const inferred = era === "";
    assert.ok(Number.isInteger(magnitude) && magnitude > 0, `${label}: valid year magnitude`);
    if (inferred) {
      const signedYear = Number(row["Real Year"].trim().replaceAll(",", ""));
      assert.equal(Math.abs(signedYear), magnitude, `${label}: missing era has a matching signed year`);
      era = signedYear < 0 ? "BCE" : "CE";
      expectedWarnings.push(`Record ${index + 1} is missing Era; ${era} was inferred from its signed Real Year.`);
    }
    assert.ok(["BCE", "CE"].includes(era), `${label}: valid era`);
    assert.equal(event.year, magnitude * (era === "BCE" ? -1 : 1), `${label}: date`);
    assert.equal(event.era, era, `${label}: era`);
    assert.equal(event.eraInferred, inferred, `${label}: inference disclosure`);
    assert.equal(event.approx, ["true", "yes", "1"].includes((row.Approx || "").trim().toLowerCase()), `${label}: approximation`);
    assert.equal(event.untitled, row.Title.trim() === "", `${label}: untitled disclosure`);
    for (const [field, column, fallback = ""] of [
      ["title", "Title", "Untitled memory"], ["game", "Game", "Unassigned game"],
      ["character", "Character", "Unknown character"], ["category", "Category", "Uncategorised"],
      ["start", "Start"], ["end", "End"], ["location", "Location"],
      ["source", "Source"], ["description", "Description"], ["image", "Image"],
    ]) {
      assert.equal(event[field], (row[column] || "").trim() || fallback, `${label}: ${column}`);
    }
  }
  assert.deepEqual(warnings, expectedWarnings, "Only explicitly disclosed era recovery is allowed");
});

test("CSV ingestion preserves recorded dates, metadata, and shared-character filtering", () => {
  const csv = `Year,Approx,Era,Real Year,Start,End,Category,Character,Game,Location,Source,Title,Image,Description
75100,TRUE,BCE,-75100,-75100-01-01,-75100-01-01,Pieces of Eden,Aletheia,Assassin's Creed Odyssey,,Ancient source,Ancient staff,,An ancient memory.
920,FALSE,,920,0920-01-01,0920-01-01,Characters,Eivor,Assassin's Creed Valhalla,Vinland,Vinland source,Vinland burial,,An inferred era.
1847,FALSE,CE,1847,1847-01-01,1847-11-09,Characters,"Jacob Frye, Evie Frye",Assassin's Creed Syndicate,"Crawley, England",Twins source,Birth of the twins,,A recorded range.
1868,FALSE,CE,1868,1860-01-01,1868-01-01,Characters,Jacob Frye; Evie Frye,Assassin's Creed Syndicate,London,Induction source,Induction of the twins,,A different recorded start.
1564,TRUE,CE,1564,1564-01-01,1564-01-01,Characters,Fujibayashi Naoe,Assassin's Creed Shadows,"Iga Province, Japan",Naoe source,Naoe birth,,An approximate date.
1582,FALSE,CE,1582,1582-01-01,1582-01-01,Artefacts,Fujibayashi Naoe; Yasuke,Assassin's Creed Shadows,Japan,Shared source,Shared artefact,,A shared memory.
`;
  const { events, warnings } = loadEvents(csv);
  assert.equal(events.length, 6);
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /CE was inferred/);
  const staff = events.find(({ title }) => title === "Ancient staff");
  assert.equal(staff.year, -75100);
  assert.equal(staff.approx, true);
  assert.equal(staff.source, "Ancient source");
  const vinland = events.find(({ title }) => title === "Vinland burial");
  assert.equal(vinland.year, 920);
  assert.equal(vinland.eraInferred, true);
  const twins = events.find(({ title }) => title === "Birth of the twins");
  assert.equal(twins.location, "Crawley, England");
  assert.equal(twins.start, "1847-01-01");
  assert.equal(twins.end, "1847-11-09");
  assert.equal(filterEvents(events, { query: "Crawley" })[0].id, twins.id);
  const induction = events.find(({ title }) => title === "Induction of the twins");
  assert.equal(induction.year, 1868);
  assert.equal(induction.start, "1860-01-01");
  assert.equal(induction.end, "1868-01-01");
  assert.equal(formatSourceDate(staff.start), "1 Jan 75,100 BCE");
  assert.equal(formatSourceDate(twins.end), "9 Nov 1847 CE");
  const shadows = filterEvents(events, { games: ["Assassin's Creed Shadows"] });
  assert.equal(shadows.length, 2);
  assert.equal(filterEvents(events, { characters: ['Fujibayashi Naoe'] }).length, 2);
  assert.equal(filterEvents(events, { characters: ['Yasuke'] }).length, 1);
  assert.equal(filterEvents(events, { characters: ['Jacob Frye'] }).length, 2);
  assert.ok(shadows.every(({ year, era, location, source }) => year >= 1564 && year <= 1582 && era === "CE" && location && source));
  assert.equal(shadows.filter(({ approx }) => approx).length, 1);
  assert.equal(filterEvents(shadows, { categories: ["Artefacts"] }).length, 1);
  const naoe = shadows.find(({ title }) => title === "Naoe birth");
  assert.equal(naoe.year, 1564);
  assert.equal(naoe.approx, true);
  assert.equal(naoe.location, "Iga Province, Japan");
  assert.equal(naoe.description, "An approximate date.");
});

test("new games and duplicate rows can be added without changing existing memory IDs", () => {
  const original = "Year,Era,Title,Character,Game\n1500,CE,Original memory,Ezio,Original game\n";
  const addition = "2500,CE,Future memory,New hero,Future game\n";
  const { events: before } = loadEvents(original);
  const { events: after, warnings } = loadEvents(original + addition + addition);
  assert.equal(after.length, before.length + 2);
  assert.deepEqual(warnings, []);
  assert.equal(after[0].id, before[0].id);
  assert.equal(new Set(after.map(({ id }) => id)).size, after.length);
  assert.equal(after[2].id, `${after[1].id}-2`);
  assert.equal(filterEvents(after, { games: ["Future game"] }).length, 2);
  assert.equal(Math.max(...after.map(({ year }) => year)), 2500);
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
