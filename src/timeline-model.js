const MIN_VIEWPORT_SPAN = 0.001;
const GAP_THRESHOLD = 2000;
const COMPRESSED_GAP = 240;

function toOrdinal(year) {
  return year > 0 ? year - 1 : year;
}

function fromOrdinal(ordinal) {
  return ordinal >= 0 ? ordinal + 1 : ordinal;
}

function finiteYears(events) {
  return events
    .map((event) => Number(event.year))
    .filter((year) => Number.isFinite(year) && year !== 0)
    .sort((a, b) => a - b);
}

export function createTimeScale(events, mode = "adaptive") {
  const years = finiteYears(events);
  const selectedMode = mode === "linear" ? "linear" : "adaptive";
  const ordinalYears = years.map(toOrdinal);
  const dataMin = ordinalYears[0] ?? 0;
  const dataMax = ordinalYears.at(-1) ?? dataMin;
  const dataSpan = dataMax - dataMin;
  const padding = dataSpan === 0 ? 1 : Math.max(1, Math.min(100, dataSpan * 0.02));
  const minOrdinal = dataMin - padding;
  const maxOrdinal = dataMax + padding;
  const minYear = fromOrdinal(minOrdinal);
  const maxYear = fromOrdinal(maxOrdinal);
  const uniqueYears = [...new Set(ordinalYears)];

  const rawGaps = selectedMode === "adaptive"
    ? uniqueYears.slice(1).map((ordinal, index) => ({
      fromOrdinal: uniqueYears[index],
      toOrdinal: ordinal,
      from: fromOrdinal(uniqueYears[index]),
      to: fromOrdinal(ordinal),
    }))
      .filter((gap) => gap.toOrdinal - gap.fromOrdinal > GAP_THRESHOLD)
    : [];

  function distance(from, to) {
    let effective = to - from;
    for (const gap of rawGaps) {
      const gapLength = gap.toOrdinal - gap.fromOrdinal;
      const overlap = Math.max(0, Math.min(to, gap.toOrdinal) - Math.max(from, gap.fromOrdinal));
      if (overlap > 0) effective -= overlap * (1 - COMPRESSED_GAP / gapLength);
    }
    return effective;
  }

  const totalDistance = distance(minOrdinal, maxOrdinal) || 1;

  function toUnit(year) {
    const ordinal = toOrdinal(Number(year));
    const value = Math.max(minOrdinal, Math.min(maxOrdinal, ordinal));
    return distance(minOrdinal, value) / totalDistance;
  }

  function fromUnit(unit) {
    const target = Math.max(0, Math.min(1, Number(unit))) * totalDistance;
    let effectiveCursor = 0;
    let ordinalCursor = minOrdinal;

    for (const gap of rawGaps) {
      const normalLength = gap.fromOrdinal - ordinalCursor;
      if (target <= effectiveCursor + normalLength) {
        return fromOrdinal(ordinalCursor + target - effectiveCursor);
      }
      effectiveCursor += normalLength;
      ordinalCursor = gap.fromOrdinal;

      if (target <= effectiveCursor + COMPRESSED_GAP) {
        const position = (target - effectiveCursor) / COMPRESSED_GAP;
        return fromOrdinal(gap.fromOrdinal + position * (gap.toOrdinal - gap.fromOrdinal));
      }
      effectiveCursor += COMPRESSED_GAP;
      ordinalCursor = gap.toOrdinal;
    }

    return fromOrdinal(Math.min(maxOrdinal, ordinalCursor + target - effectiveCursor));
  }

  const breaks = rawGaps.map(({ from, to }) => ({ from, to, start: toUnit(from), end: toUnit(to) }));
  return { minYear, maxYear, toUnit, fromUnit, breaks, mode: selectedMode };
}

export function clampViewport(start, end) {
  let left = Number.isFinite(Number(start)) ? Number(start) : 0;
  let right = Number.isFinite(Number(end)) ? Number(end) : 1;
  if (left > right) [left, right] = [right, left];

  let span = Math.max(MIN_VIEWPORT_SPAN, Math.min(1, right - left));
  left = Math.max(0, Math.min(1 - span, left));
  right = left + span;
  if (right > 1) {
    right = 1;
    left = 1 - span;
  }
  return [left, right];
}

export function zoomViewport(viewport, factor, anchor = 0.5) {
  const [start, end] = clampViewport(...viewport);
  const safeFactor = Number.isFinite(Number(factor)) && Number(factor) > 0 ? Number(factor) : 1;
  const safeAnchor = Math.max(0, Math.min(1, Number(anchor)));
  const span = end - start;
  const nextSpan = Math.max(MIN_VIEWPORT_SPAN, Math.min(1, span * safeFactor));
  const fixedPoint = start + span * safeAnchor;
  return clampViewport(fixedPoint - nextSpan * safeAnchor, fixedPoint + nextSpan * (1 - safeAnchor));
}

export function panViewport(viewport, delta) {
  const [start, end] = clampViewport(...viewport);
  const shift = Number.isFinite(Number(delta)) ? Number(delta) : 0;
  return clampViewport(start + shift, end + shift);
}
