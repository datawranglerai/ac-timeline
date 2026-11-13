import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { DATASET_PATH, parseCSV, loadEvents, filterEvents } from '../src/data.js';
import { CHARACTERS, characterLabelsForEvent, charactersForEvent } from '../src/characters.js';

const csv = await readFile(new URL(`../${DATASET_PATH}`, import.meta.url), 'utf8');
const rows = parseCSV(csv);
const { events, warnings } = loadEvents(csv);
const audit = JSON.parse(await readFile(new URL('../data/audit/records.json', import.meta.url), 'utf8'));

test('all 110 original records remain accounted for alongside sourced additions', () => {
  assert.equal(audit.originalRecordCount, 110);
  assert.deepEqual(audit.records.map(({ record }) => record), Array.from({ length: 110 }, (_, index) => index + 1));
  assert.equal(rows.length, audit.records.length + audit.additions.length);
  for (const entry of audit.records) {
    const expected = { ...entry.original, 'Date Status': '', ...entry.changes };
    assert.deepEqual(rows[entry.record - 1], expected, `Original record ${entry.record} must remain in the CSV`);
    assert.ok(entry.sources.length > 0 && entry.findings.length > 0, `Evidence for record ${entry.record}`);
    assert.equal(expected.Description, entry.descriptionFinal);
  }
  for (const entry of audit.additions) {
    assert.deepEqual(rows[entry.publishedRecord - 1], entry.row);
    assert.equal(entry.row.Description, entry.descriptionFinal);
    assert.ok(entry.sources.length > 0 && entry.rationale, `Evidence for addition ${entry.publishedRecord}`);
  }
});

test('published dataset has complete metadata, canonical participants and consistent signed years', () => {
  assert.deepEqual(warnings, []);
  for (const [index, row] of rows.entries()) {
    const label = `Record ${index + 1}: ${row.Title}`;
    for (const field of ['Title', 'Description', 'Category', 'Game', 'Source']) {
      assert.ok(row[field]?.trim(), `${label}: ${field} is required`);
    }
    for (const [field, value] of Object.entries(row)) {
      assert.equal(value, value.trim(), `${label}: trim ${field}`);
      assert.doesNotMatch(value, /[\u00ad\u200b\u2060\ufeff]|utm_source=chatgpt|oaicite|turn\d+(?:search|view)/u, `${label}: text hygiene in ${field}`);
    }
    assert.ok(['BCE', 'CE'].includes(row.Era), label);
    assert.ok(['TRUE', 'FALSE'].includes(row.Approx), label);
    assert.equal(Number(row['Real Year']), Number(row.Year) * (row.Era === 'BCE' ? -1 : 1), label);
    assert.doesNotMatch(row.Game, /;|DLC|Those Who Are Treasured/, `${label}: one base work per game facet`);
    assert.ok(['', 'Undated'].includes(row['Date Status']), `${label}: known date status`);
    assert.doesNotMatch(row.Character, /[,&]/, `${label}: use semicolon-separated names`);
    for (const person of row.Character.split(';').map((name) => name.trim()).filter(Boolean)) {
      const canonical = characterLabelsForEvent({ character: person });
      assert.deepEqual(canonical, [person], `${label}: canonical participant ${person}`);
    }
    assert.match(row.Source, /https:\/\//, `${label}: traceable source URL`);
    for (const raw of row.Source.matchAll(/https:\/\/[^\s|]+/g)) {
      assert.equal(new URL(raw[0]).protocol, 'https:', label);
    }
    const dates = ['Start', 'End'].map((field) => row[field]).filter(Boolean);
    for (const date of dates) {
      assert.match(date, /^-?\d{4,}-\d{2}-\d{2}$/, `${label}: consistent full date format`);
      const [, year, month, day] = /^(-?\d+)-(\d{2})-(\d{2})$/.exec(date).map(Number);
      assert.equal(Math.sign(year), row.Era === 'BCE' ? -1 : 1, `${label}: date era`);
      const daysInMonth = [31, (year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
      assert.ok(month >= 1 && month <= 12 && day >= 1 && day <= daysInMonth[month - 1], `${label}: calendar date`);
    }
    if (row['Date Status'] === 'Undated') {
      assert.equal(row.Approx, 'TRUE', label);
      assert.equal(row.Start, '', `${label}: an undated event has no recorded start`);
      assert.equal(row.End, '', `${label}: an undated event has no recorded end`);
    }
  }
});

test('Connor entries resolve to his character card and canonical character filter', () => {
  const connor = CHARACTERS.find(({ id }) => id === 'connor');
  const matches = filterEvents(events, { characters: [connor.name] });
  assert.ok(matches.length >= 2, 'Existing Connor memories must remain accessible');
  for (const event of matches) assert.ok(charactersForEvent(event).some(({ id }) => id === connor.id));
});
