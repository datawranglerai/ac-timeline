import test from "node:test";
import assert from "node:assert/strict";
import {
  formatLifeYear,
  lifeDates,
  lifeSpan,
  sortCharactersByLifespan,
  overlaps,
  createLifespanScale,
} from "../src/lifespan-model.js";

const close = (actual, expected, epsilon = 1e-8) => {
  assert.ok(Math.abs(actual - expected) < epsilon, `${actual} ≈ ${expected}`);
};

test("life year labels cover CE, BCE, approximations, and unknown dates", () => {
  assert.equal(formatLifeYear(1459), "1459 CE");
  assert.equal(formatLifeYear(-458), "458 BCE");
  assert.equal(formatLifeYear(-75000, true), "c. 75,000 BCE");
  assert.equal(formatLifeYear(0), "Unknown");
  assert.equal(formatLifeYear(null), "Unknown");
});

test("lifeDates respects editorial labels and lifeSpan marks unknown endpoints", () => {
  const life = {
    birthYear: null,
    deathYear: null,
    firstKnownYear: 870,
    lastKnownYear: 880,
    birthLabel: "Born in the 9th century",
    deathLabel: "Death unknown",
  };
  assert.deepEqual(lifeDates(life), { birth: "Born in the 9th century", death: "Death unknown" });
  assert.deepEqual(lifeSpan(life), {
    start: 870,
    end: 880,
    startUnknown: true,
    endUnknown: true,
    kind: "recorded",
  });
  assert.equal(lifeSpan({ ...life, plotStart: 860, plotEnd: 900 }).start, 860);
});

test("character sorting uses chronological anchors then display names", () => {
  const characters = [{ id: "late", name: "Zed" }, { id: "same-b", name: "B" }, { id: "same-a", displayName: "A" }];
  const lives = new Map([
    ["late", { birthYear: 100 }],
    ["same-b", { firstKnownYear: -10 }],
    ["same-a", { firstKnownYear: -10 }],
  ]);
  assert.deepEqual(sortCharactersByLifespan(characters, lives).map(({ id }) => id), ["same-a", "same-b", "late"]);
});

test("overlap is inclusive and never extends an unknown death to the present", () => {
  const edward = { birthYear: 1693, deathYear: 1735 };
  const haytham = { birthYear: 1725, deathYear: 1781 };
  const connor = { birthYear: 1756, deathYear: null, lastKnownYear: 1804 };
  const ezio = { birthYear: 1459, deathYear: 1524 };
  const desmond = { birthYear: 1987, deathYear: 2012 };
  assert.equal(overlaps(edward, haytham), true);
  assert.equal(overlaps(haytham, connor), true);
  assert.equal(overlaps(edward, connor), false);
  assert.equal(overlaps(ezio, desmond), false);
  assert.equal(overlaps({ birthYear: 1900, deathYear: null, lastKnownYear: 1920 }, desmond), false);
  assert.equal(overlaps({ birthYear: 1, deathYear: 2 }, { birthYear: 2, deathYear: 3 }), true);
});

test("lifespan scale preserves BCE/CE adjacency and round trips valid years", () => {
  const scale = createLifespanScale([{ birthYear: -2, deathYear: 3 }]);
  close(scale.toUnit(1) - scale.toUnit(-1), scale.toUnit(2) - scale.toUnit(1));
  for (const year of [-2, -1, 1, 2, 3]) close(scale.fromUnit(scale.toUnit(year)), year);
  assert.ok(scale.minYear < -2);
  assert.ok(scale.maxYear > 3);
});

test("occupied long lives are not compressed internally", () => {
  const scale = createLifespanScale([
    { birthYear: -458, deathYear: 2018 },
    { birthYear: -75000, deathYear: -75000 },
  ]);
  assert.equal(scale.breaks.length, 1);
  assert.deepEqual(
    { from: scale.breaks[0].from, to: scale.breaks[0].to },
    { from: -75000, to: -458 },
  );
  close(scale.toUnit(2018) - scale.toUnit(-458), 2475 / (2475 + 120 + 100));
});

test("disjoint segments allow genuine empty intervals to compress", () => {
  const scale = createLifespanScale([{
    plotStart: -75000,
    plotEnd: 2018,
    segments: [
      { start: -75000, end: -75000, kind: "life" },
      { start: 2012, end: 2018, kind: "continuation" },
    ],
  }]);
  assert.equal(scale.breaks.length, 1);
  assert.deepEqual({ from: scale.breaks[0].from, to: scale.breaks[0].to }, { from: -75000, to: 2012 });
  assert.ok(scale.breaks[0].end - scale.breaks[0].start < 0.6);
});

test("empty, point, reversed, and invalid inputs yield finite bounded scales", () => {
  for (const lives of [[], [{ firstKnownYear: -75000, lastKnownYear: -75000 }], [{ plotStart: 20, plotEnd: 10 }], [{ birthYear: 0 }]]) {
    const scale = createLifespanScale(lives);
    assert.ok(Number.isFinite(scale.minYear));
    assert.ok(Number.isFinite(scale.maxYear));
    assert.ok(scale.toUnit(-1) >= 0 && scale.toUnit(-1) <= 1);
    assert.ok(scale.toUnit(999999) >= 0 && scale.toUnit(999999) <= 1);
    assert.ok(Number.isFinite(scale.fromUnit(-5)));
    assert.ok(Number.isFinite(scale.fromUnit(5)));
  }
});
