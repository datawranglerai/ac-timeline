const GAP_THRESHOLD = 2000;
const COMPRESSED_GAP = 120;

function validYear(value) {
  const year = Number(value);
  return Number.isFinite(year) && year !== 0 ? year : null;
}

function toOrdinal(year) {
  return year > 0 ? year - 1 : year;
}

function fromOrdinal(ordinal) {
  return ordinal >= 0 ? ordinal + 1 : ordinal;
}

export function formatLifeYear(year, approximate = false) {
  const value = validYear(year);
  if (value === null) return "Unknown";
  const suffix = value < 0 ? "BCE" : "CE";
  const magnitude = Math.abs(value);
  const displayedYear = magnitude >= 10000 ? magnitude.toLocaleString("en-GB") : String(magnitude);
  const label = `${displayedYear} ${suffix}`;
  return approximate ? `c. ${label}` : label;
}

export function lifeDates(life = {}) {
  return {
    birth: life.birthLabel ?? formatLifeYear(life.birthYear, life.birthApprox),
    death: life.deathLabel ?? formatLifeYear(life.deathYear, life.deathApprox),
  };
}

export function lifeSpan(life = {}) {
  const birth = validYear(life.birthYear);
  const death = validYear(life.deathYear);
  const firstKnown = validYear(life.firstKnownYear);
  const lastKnown = validYear(life.lastKnownYear);
  const plotStart = validYear(life.plotStart);
  const plotEnd = validYear(life.plotEnd);

  return {
    start: plotStart ?? birth ?? firstKnown,
    end: plotEnd ?? death ?? lastKnown,
    startUnknown: birth === null,
    endUnknown: death === null,
    kind: life.kind ?? (birth === null ? "recorded" : "life"),
  };
}

function getLife(character, lifespansMap) {
  if (!lifespansMap) return character.lifespan ?? character.life ?? {};
  const keys = [character.id, character.slug, character.name, character.displayName]
    .filter((key) => key != null);
  for (const key of keys) {
    const value = lifespansMap instanceof Map ? lifespansMap.get(key) : lifespansMap[key];
    if (value) return value;
  }
  return character.lifespan ?? character.life ?? {};
}

export function sortCharactersByLifespan(characters, lifespansMap) {
  return characters
    .map((character, index) => ({ character, index, span: lifeSpan(getLife(character, lifespansMap)) }))
    .sort((a, b) => {
      const aStart = validYear(a.span.start) ?? Number.POSITIVE_INFINITY;
      const bStart = validYear(b.span.start) ?? Number.POSITIVE_INFINITY;
      if (aStart !== bStart) return aStart - bStart;
      const aName = String(a.character.displayName ?? a.character.name ?? "");
      const bName = String(b.character.displayName ?? b.character.name ?? "");
      return aName.localeCompare(bName, "en", { sensitivity: "base" }) || a.index - b.index;
    })
    .map(({ character }) => character);
}

export function overlaps(a, b) {
  const first = lifeSpan(a);
  const second = lifeSpan(b);
  const firstStart = validYear(first.start);
  const firstEnd = validYear(first.end);
  const secondStart = validYear(second.start);
  const secondEnd = validYear(second.end);
  if ([firstStart, firstEnd, secondStart, secondEnd].includes(null)) return false;

  const firstLow = Math.min(toOrdinal(firstStart), toOrdinal(firstEnd));
  const firstHigh = Math.max(toOrdinal(firstStart), toOrdinal(firstEnd));
  const secondLow = Math.min(toOrdinal(secondStart), toOrdinal(secondEnd));
  const secondHigh = Math.max(toOrdinal(secondStart), toOrdinal(secondEnd));
  return firstLow <= secondHigh && secondLow <= firstHigh;
}

function rangeFrom(start, end) {
  const validStart = validYear(start);
  const validEnd = validYear(end);
  if (validStart === null && validEnd === null) return null;
  const startOrdinal = toOrdinal(validStart ?? validEnd);
  const endOrdinal = toOrdinal(validEnd ?? validStart);
  return {
    start: Math.min(startOrdinal, endOrdinal),
    end: Math.max(startOrdinal, endOrdinal),
  };
}

function occupiedRanges(lives) {
  const ranges = [];
  for (const life of lives) {
    if (Array.isArray(life?.segments) && life.segments.length > 0) {
      for (const segment of life.segments) {
        const range = rangeFrom(segment.start, segment.end);
        if (range) ranges.push(range);
      }
      continue;
    }
    const span = lifeSpan(life);
    const range = rangeFrom(span.start, span.end);
    if (range) ranges.push(range);
  }
  ranges.sort((a, b) => a.start - b.start || a.end - b.end);

  const union = [];
  for (const range of ranges) {
    const previous = union.at(-1);
    if (!previous || range.start > previous.end) {
      union.push({ ...range });
    } else {
      previous.end = Math.max(previous.end, range.end);
    }
  }
  return union;
}

export function createLifespanScale(lives = []) {
  const union = occupiedRanges(Array.isArray(lives) ? lives : []);
  const occupiedMin = union[0]?.start ?? 0;
  const occupiedMax = union.at(-1)?.end ?? occupiedMin;
  const occupiedSpan = occupiedMax - occupiedMin;
  const padding = occupiedSpan === 0 ? 1 : Math.max(1, Math.min(50, occupiedSpan * 0.02));
  const minOrdinal = occupiedMin - padding;
  const maxOrdinal = occupiedMax + padding;
  const minYear = fromOrdinal(minOrdinal);
  const maxYear = fromOrdinal(maxOrdinal);

  const rawBreaks = union.slice(1)
    .map((range, index) => ({ fromOrdinal: union[index].end, toOrdinal: range.start }))
    .filter((gap) => gap.toOrdinal - gap.fromOrdinal > GAP_THRESHOLD);

  function distance(from, to) {
    let effective = to - from;
    for (const gap of rawBreaks) {
      const length = gap.toOrdinal - gap.fromOrdinal;
      const overlap = Math.max(0, Math.min(to, gap.toOrdinal) - Math.max(from, gap.fromOrdinal));
      if (overlap > 0) effective -= overlap * (1 - COMPRESSED_GAP / length);
    }
    return effective;
  }

  const totalDistance = distance(minOrdinal, maxOrdinal) || 1;

  function toUnit(year) {
    const valid = validYear(year);
    const ordinal = valid === null ? minOrdinal : toOrdinal(valid);
    const bounded = Math.max(minOrdinal, Math.min(maxOrdinal, ordinal));
    return distance(minOrdinal, bounded) / totalDistance;
  }

  function fromUnit(unit) {
    const numericUnit = Number(unit);
    const boundedUnit = Number.isFinite(numericUnit) ? Math.max(0, Math.min(1, numericUnit)) : 0;
    const target = boundedUnit * totalDistance;
    let effectiveCursor = 0;
    let ordinalCursor = minOrdinal;

    for (const gap of rawBreaks) {
      const occupiedDistance = gap.fromOrdinal - ordinalCursor;
      if (target <= effectiveCursor + occupiedDistance) {
        return fromOrdinal(ordinalCursor + target - effectiveCursor);
      }
      effectiveCursor += occupiedDistance;
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

  const breaks = rawBreaks.map((gap) => ({
    from: fromOrdinal(gap.fromOrdinal),
    to: fromOrdinal(gap.toOrdinal),
    start: toUnit(fromOrdinal(gap.fromOrdinal)),
    end: toUnit(fromOrdinal(gap.toOrdinal)),
  }));

  return { toUnit, fromUnit, minYear, maxYear, breaks };
}
