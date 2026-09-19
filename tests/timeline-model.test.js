import test from "node:test";
import assert from "node:assert/strict";
import { createTimeScale, clampViewport, zoomViewport, panViewport } from "../src/timeline-model.js";

const close = (actual, expected, epsilon = 1e-8) => assert.ok(Math.abs(actual - expected) < epsilon, `${actual} ≈ ${expected}`);

test("linear scale is padded, monotonic, and invertible", () => {
  const scale = createTimeScale([{ year: -100 }, { year: -1 }, { year: 1 }, { year: 100 }], "linear");
  assert.ok(scale.minYear < -100);
  assert.ok(scale.maxYear > 100);
  assert.deepEqual(scale.breaks, []);
  assert.ok(scale.toUnit(-100) < scale.toUnit(-1));
  assert.ok(scale.toUnit(-1) < scale.toUnit(1));
  assert.ok(scale.toUnit(1) < scale.toUnit(100));
  for (const year of [-100, -23, -1, 1, 88, 100]) close(scale.fromUnit(scale.toUnit(year)), year);
  close(scale.toUnit(1) - scale.toUnit(-1), scale.toUnit(2) - scale.toUnit(1));
});

test("adaptive scale compresses large empty gaps and remains invertible", () => {
  const events = [{ year: -75000 }, { year: -74900 }, { year: -500 }, { year: 1 }, { year: 2000 }];
  const adaptive = createTimeScale(events);
  const linear = createTimeScale(events, "linear");
  assert.equal(adaptive.mode, "adaptive");
  assert.equal(adaptive.breaks.length, 1);
  assert.deepEqual({ from: adaptive.breaks[0].from, to: adaptive.breaks[0].to }, { from: -74900, to: -500 });
  assert.ok(adaptive.breaks[0].end - adaptive.breaks[0].start < 0.1);
  assert.ok(adaptive.toUnit(-74900) > linear.toUnit(-74900));
  const points = [-75000, -74950, -60000, -500, 1, 2000];
  for (let index = 1; index < points.length; index += 1) assert.ok(adaptive.toUnit(points[index]) > adaptive.toUnit(points[index - 1]));
  for (const year of points) close(adaptive.fromUnit(adaptive.toUnit(year)), year, 1e-6);
});

test("single-year datasets get a usable domain", () => {
  const scale = createTimeScale([{ year: 1191 }]);
  assert.equal(scale.minYear, 1190);
  assert.equal(scale.maxYear, 1192);
  close(scale.toUnit(1191), 0.5);
  close(scale.fromUnit(0.5), 1191);
});

test("adaptive break metadata uses signed historical years across BCE and CE", () => {
  const scale = createTimeScale([{ year: -3000 }, { year: 1 }, { year: 2 }]);
  assert.deepEqual(
    { from: scale.breaks[0].from, to: scale.breaks[0].to },
    { from: -3000, to: 1 },
  );
  for (const year of [-3000, -1, 1, 2]) close(scale.fromUnit(scale.toUnit(year)), year, 1e-6);
});

test("viewport clamping enforces bounds and a minimum span", () => {
  assert.deepEqual(clampViewport(-0.2, 0.4), [0, 0.6000000000000001]);
  const tiny = clampViewport(0.5, 0.50001);
  close(tiny[1] - tiny[0], 0.001);
  assert.deepEqual(clampViewport(0.8, 0.2), [0.2, 0.8]);
});

test("zoom keeps its anchor fixed and pan preserves span at boundaries", () => {
  const zoomed = zoomViewport([0.2, 0.8], 0.5, 0.25);
  close(zoomed[0], 0.275);
  close(zoomed[1], 0.575);
  const panned = panViewport([0.2, 0.5], 0.8);
  close(panned[0], 0.7);
  close(panned[1], 1);
});

test("invalid zoom anchors fall back to the centre without resetting the view", () => {
  for (const anchor of [NaN, Infinity, -Infinity, undefined]) {
    const zoomed = zoomViewport([0.2, 0.8], 0.5, anchor);
    close(zoomed[0], 0.35);
    close(zoomed[1], 0.65);
  }
});

test("thousands of alternating and extreme gestures keep a finite bounded viewport", () => {
  let viewport = [0, 1];
  for (let index = 0; index < 10000; index++) {
    viewport = zoomViewport(viewport, index % 3 ? 0.35 : 10, (index % 11) / 10);
    viewport = panViewport(viewport, ((index % 19) - 9) * (viewport[1] - viewport[0]));
    const [start, end] = viewport;
    assert.ok(Number.isFinite(start) && Number.isFinite(end));
    assert.ok(start >= 0 && end <= 1);
    assert.ok(end - start >= 0.001 - 1e-12 && end > start);
  }
  assert.deepEqual(zoomViewport(viewport, 1e9), [0, 1]);
});
