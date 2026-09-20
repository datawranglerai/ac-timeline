import test from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import {
  CHARACTERS,
  characterLabelsForEvent,
  charactersForEvent,
  charactersForEvents,
} from "../src/characters.js";
import { DATASET_PATH, loadEvents } from "../src/data.js";

function ids(event) {
  return charactersForEvent(event).map(({ id }) => id);
}

test("character manifest describes every supplied identity with normalized portrait paths", () => {
  assert.equal(CHARACTERS.length, 24);
  assert.equal(new Set(CHARACTERS.map(({ id }) => id)).size, CHARACTERS.length);
  for (const character of CHARACTERS) {
    assert.match(character.headshot, /^\.\/assets\/avatars\/portraits\/[a-z]+\.png$/);
    assert.match(character.fullbody, /^\.\/assets\/avatars\/figures\/[a-z]+\.webp$/);
    if (character.gif) {
      assert.match(character.gif, /^\.\/assets\/avatars\/GIFs\/[a-z]+\.gif$/);
      assert.match(character.poster, /^\.\/assets\/avatars\/posters\/[a-z]+\.webp$/);
    } else {
      assert.equal(character.poster, null);
    }
  }

  const [evie, jacob] = ["eviefrye", "jacobfrye"].map((id) => CHARACTERS.find((entry) => entry.id === id));
  assert.equal(evie.headshot, "./assets/avatars/portraits/fryetwins.png");
  assert.equal(jacob.gif, "./assets/avatars/GIFs/fryetwins.gif");
  assert.equal(evie.poster, "./assets/avatars/posters/fryetwins.webp");
  assert.equal(jacob.poster, evie.poster);
  assert.equal(evie.fullbody, "./assets/avatars/figures/eviefrye.webp");
  assert.equal(jacob.fullbody, "./assets/avatars/figures/jacobfrye.webp");
});

test("prepared headshots all use 256px square RGBA PNGs", async () => {
  const paths = [...new Set(CHARACTERS.map(({ headshot }) => headshot))];
  assert.equal(paths.length, 23);
  for (const path of paths) {
    const bytes = await readFile(new URL(`../${path.slice(2)}`, import.meta.url));
    assert.equal(bytes.subarray(1, 4).toString(), 'PNG');
    assert.equal(bytes.readUInt32BE(16), 256, path);
    assert.equal(bytes.readUInt32BE(20), 256, path);
    assert.equal(bytes[25], 6, `${path} must retain alpha`);
  }
});

test("optimized figure and poster derivatives exist as WebP containers", async () => {
  const figureNames = await readdir(new URL("../assets/avatars/figures/", import.meta.url));
  const posterNames = await readdir(new URL("../assets/avatars/posters/", import.meta.url));
  assert.equal(figureNames.filter((name) => name.endsWith(".webp")).length, 24);
  assert.equal(posterNames.filter((name) => name.endsWith(".webp")).length, 21);

  const paths = new Set(CHARACTERS.flatMap(({ fullbody, poster }) => [fullbody, poster]).filter(Boolean));
  for (const path of paths) {
    const contents = await readFile(new URL(`../${path.replace(/^\.\//, "")}`, import.meta.url));
    assert.equal(contents.subarray(0, 4).toString("ascii"), "RIFF");
    assert.equal(contents.subarray(8, 12).toString("ascii"), "WEBP");
  }
});

test("V3 character fields resolve all identities backed by supplied media", async () => {
  const csv = await readFile(new URL(`../${DATASET_PATH}`, import.meta.url), "utf8");
  const { events } = loadEvents(csv);
  const matchedEvents = events.filter((event) => charactersForEvent(event).length > 0);
  const matchedCharacters = charactersForEvents(events);

  assert.equal(matchedEvents.length, 66);
  assert.deepEqual(matchedCharacters.map(({ id }) => id), [
    "kassandra", "ezio", "bayek", "reda", "altair", "almualim", "edward", "haytham",
    "desmond", "juno", "aiden", "layla", "eivor", "basim", "hytham", "jacobfrye",
    "eviefrye", "aya", "arno", "naoe", "yasuke",
  ]);
});

test("multi-character fields preserve source order and remove duplicates", () => {
  assert.deepEqual(ids({ character: "Fujibayashi Naoe; Yasuke" }), ["naoe", "yasuke"]);
  assert.deepEqual(ids({ character: "Naoe & Yasuke, Naoe" }), ["naoe", "yasuke"]);
  assert.deepEqual(ids({ character: "Jacob Frye, Evie Frye" }), ["jacobfrye", "eviefrye"]);
  assert.deepEqual(
    charactersForEvents([
      { character: "Yasuke; Fujibayashi Naoe" },
      { character: "Yasuke" },
      { character: "Evie Frye & Jacob Frye" },
    ]).map(({ id }) => id),
    ["yasuke", "naoe", "eviefrye", "jacobfrye"],
  );
});

test("facet labels canonicalize known aliases and retain unknown participants", () => {
  assert.deepEqual(characterLabelsForEvent({ character: "Kassandra, Pythagoras" }), ["Kassandra", "Pythagoras"]);
  assert.deepEqual(characterLabelsForEvent({ character: "Naoe & Yasuke; Fujibayashi Naoe" }), [
    "Fujibayashi Naoe",
    "Yasuke",
  ]);
  assert.deepEqual(characterLabelsForEvent({ character: "ALTAIR IBN LA’AHAD" }), ["Altaïr Ibn-La'Ahad"]);
  assert.deepEqual(characterLabelsForEvent({ character: "Unknown character" }), ["Unknown character"]);
  assert.deepEqual(characterLabelsForEvent({ character: "Natakas: son of Darius" }), ["Natakas: son of Darius"]);
  assert.deepEqual(characterLabelsForEvent({ character: "Pythagoras, pythagoras" }), ["Pythagoras"]);
  assert.deepEqual(characterLabelsForEvent({ character: "" }), []);
  assert.deepEqual(characterLabelsForEvent({}), []);
});

test("matching tolerates case, accents, apostrophes, and punctuation variants", () => {
  assert.deepEqual(ids({ character: "ALTAIR IBN LA’AHAD" }), ["altair"]);
  assert.deepEqual(ids({ character: "Altaïr Ibn-La'Ahad" }), ["altair"]);
  assert.deepEqual(ids({ character: "Fujibayashi Naoe" }), ["naoe"]);
  assert.deepEqual(ids({ character: "Eivor Varinsdottir" }), ["eivor"]);
  assert.deepEqual(ids({ character: "Aiden Pearce" }), ["aiden"]);
});

test("exact matching keeps near names distinct and unknown values unadorned", () => {
  assert.deepEqual(ids({ character: "Haytham, Hytham" }), ["haytham", "hytham"]);
  assert.deepEqual(ids({ character: "Haytham Kenway" }), ["haytham"]);
  assert.deepEqual(ids({ character: "Natakas: son of Darius" }), []);
  assert.deepEqual(ids({ character: "Apple of Eden" }), []);
  assert.deepEqual(ids({ character: "The Staff of Hermes Trismegistus" }), []);
  assert.deepEqual(ids({ character: "Unknown character" }), []);
  assert.deepEqual(ids({ character: "Adam & Eve" }), []);
  assert.deepEqual(ids({ character: "" }), []);
  assert.deepEqual(ids({}), []);
});
