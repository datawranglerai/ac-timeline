import test from 'node:test';
import assert from 'node:assert/strict';
import { CHARACTERS } from '../src/characters.js';
import { LIFESPANS } from '../src/lifespan-data.js';
import { lifeSpan, lifeDates, sortCharactersByLifespan, overlaps } from '../src/lifespan-model.js';

test('every character has sourced lifespan metadata and a finite chronological anchor', () => {
  assert.equal(Object.keys(LIFESPANS).length, CHARACTERS.length);
  for (const character of CHARACTERS) {
    const life = LIFESPANS[character.id];
    assert.ok(life, character.id);
    const span = lifeSpan(life);
    assert.ok(Number.isFinite(span.start) && Number.isFinite(span.end) && span.start <= span.end, character.id);
    assert.ok(life.sources.length > 0 && life.note, character.id);
    for (const source of life.sources) assert.equal(new URL(source.url).protocol, 'https:');
  }
});

test('chronological ordering and contemporary families reflect biography rather than gallery popularity', () => {
  const original = CHARACTERS.map(({ id }) => id);
  const ids = sortCharactersByLifespan(CHARACTERS, LIFESPANS).map(({ id }) => id);
  assert.deepEqual(ids.slice(0, 4), ['juno', 'jupiter', 'minerva', 'kassandra']);
  assert.ok(ids.indexOf('ezio') < ids.indexOf('naoe'));
  assert.ok(ids.indexOf('edward') < ids.indexOf('haytham'));
  assert.ok(ids.indexOf('haytham') < ids.indexOf('connor'));
  assert.ok(ids.indexOf('connor') < ids.indexOf('arno'));
  assert.ok(ids.indexOf('aiden') < ids.indexOf('layla') && ids.indexOf('layla') < ids.indexOf('desmond'));
  assert.equal(overlaps(LIFESPANS.edward, LIFESPANS.haytham), true);
  assert.equal(overlaps(LIFESPANS.edward, LIFESPANS.connor), false);
  assert.equal(overlaps(LIFESPANS.haytham, LIFESPANS.connor), true);
  assert.equal(overlaps(LIFESPANS.eviefrye, LIFESPANS.jacobfrye), true);
  assert.deepEqual(CHARACTERS.map(({ id }) => id), original);
});

test('uncertain deaths and unusual continuity remain explicit', () => {
  for (const id of ['connor', 'arno', 'eviefrye', 'jacobfrye', 'reda', 'yasuke', 'naoe', 'hytham', 'aiden', 'basim', 'eivor']) {
    assert.equal(LIFESPANS[id].deathYear, null, id);
  }
  assert.equal(lifeDates(LIFESPANS.eivor).death, 'After 889 CE');
  assert.equal(lifeDates(LIFESPANS.hytham).birth, '850s CE');
  assert.equal(lifeDates(LIFESPANS.juno).birth, '2195 IE');
  assert.equal(lifeDates(LIFESPANS.yasuke).birth, 'c. 1554 CE');
  assert.equal(LIFESPANS.kassandra.birthYear, -458);
  assert.equal(LIFESPANS.kassandra.deathYear, 2018);
  assert.equal(LIFESPANS.basim.segments[1].kind, 'continuation');
  assert.equal(LIFESPANS.desmond.deathYear, 2012);
  assert.equal(lifeSpan(LIFESPANS.desmond).end, 2020);
  assert.equal(LIFESPANS.jupiter.deathYear, -75000);
});
