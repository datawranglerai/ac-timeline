import { DATASET_PATH, loadEvents, filterEvents, formatYear, formatSourceDate, shortGame } from './data.js';
import { createTimeScale, clampViewport, zoomViewport, panViewport } from './timeline-model.js';

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const escape = (value) => String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const icons = {
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4 4"/>',
  timeline: '<path d="M3 7h18M3 17h18"/><circle cx="8" cy="7" r="2"/><circle cx="16" cy="17" r="2"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h1M3 12h1M3 18h1"/>',
  down: '<path d="m7 10 5 5 5-5"/>',
  right: '<path d="M4 12h15m-5-5 5 5-5 5"/>',
  left: '<path d="M20 12H5m5-5-5 5 5 5"/>',
  'up-right': '<path d="M6 18 18 6M6 6h12v12"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  reset: '<path d="M4 10a8 8 0 1 1 1 7M4 4v6h6"/>',
  hand: '<path d="M7 12V6a2 2 0 0 1 4 0v6-8a2 2 0 0 1 4 0v8-6a2 2 0 0 1 4 0v9c0 4-3 6-6 6-4 0-6-3-9-7a2 2 0 0 1 3-2Z"/>',
  diamond: '<path d="m12 2 9 10-9 10L3 12 9 2Zm0 0v20M3 12h18"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>',
  creed: '<path d="m12 3-8 17 5-3 3-9 3 9 5 3L12 3Zm-7 17c4 3 10 3 14 0"/>',
  feather: '<path d="M5 21 19 5M8 17c-5-5 2-14 12-14 0 10-7 17-12 14Zm2-8 4 1m-7 4 4 1"/>',
  globe: '<circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18"/>',
};
const icon = (name) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.35" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name] || icons.diamond}</svg>`;
function decorateIcons(root = document) { root.querySelectorAll('[data-icon]').forEach((el) => { el.innerHTML = icon(el.dataset.icon); }); }

const eras = [
  { id: 'all', name: 'All eras', min: -Infinity, max: Infinity, color: '#c6ac79' },
  { id: 'isu', name: 'The Isu era', min: -Infinity, max: -2000, color: '#c6ac79' },
  { id: 'ancient', name: 'Ancient world', min: -2000, max: 500, color: '#93aa7a' },
  { id: 'medieval', name: 'Middle Ages', min: 500, max: 1400, color: '#89a9ac' },
  { id: 'renaissance', name: 'Renaissance', min: 1400, max: 1600, color: '#ba8c76' },
  { id: 'empires', name: 'Age of empires', min: 1600, max: 1900, color: '#afa0bc' },
  { id: 'modern', name: 'Modern day', min: 1900, max: Infinity, color: '#abb6a7' },
];
const lanes = [
  { id: 'isu', name: 'Isu & cataclysms', subtitle: 'THE FIRST CIVILIZATION', color: '#c9ad76', icon: 'diamond', categories: ['Isu', 'Extinction Events'] },
  { id: 'eden', name: 'Pieces of Eden', subtitle: 'POWER BEYOND BELIEF', color: '#91a97a', icon: 'sun', categories: ['Pieces of Eden'] },
  { id: 'lives', name: 'Lives & legacies', subtitle: 'THOSE WHO SHAPED IT', color: '#88aaa8', icon: 'creed', categories: ['Characters'] },
  { id: 'orders', name: 'Orders & traditions', subtitle: 'THE THREADS THAT BIND', color: '#b2947c', icon: 'feather', categories: [] },
];
const laneFor = (event) => lanes.find((lane) => lane.categories.includes(event.category)) || lanes[3];
const state = { events: [], filtered: [], visible: [], query: '', games: [], categories: [], characters: [], view: 'timeline', mode: 'adaptive', viewport: [0, 1], era: 'all', scale: null, groups: new Map(), selectedId: null };
const prettyTitle = (event) => event.title.replace(/\[([^\]]+)\]/g, (_, options) => options.split('|')[0]);
const percent = (value) => `${(value * 100).toFixed(5)}%`;
const roundedYear = (value) => Math.round(value) || (value < 0 ? -1 : 1);
function viewPosition(year) { return (state.scale.toUnit(year) - state.viewport[0]) / (state.viewport[1] - state.viewport[0]); }
function sourceImage(event) {
  if (event.image) {
    try { const url = new URL(event.image, document.baseURI); if (['http:', 'https:'].includes(url.protocol)) return url.href; } catch { /* An invalid optional image does not block its memory. */ }
  }
  if (/Edward Kenway Finds Hidden Blade/i.test(event.title)) return './assets/kenway-memory.jpg';
  if (/Edward Kenway is Killed/i.test(event.title)) return './images/edward-kenway-death.png';
  if (/Baby Haytham/i.test(event.title)) return './images/haytham-kenway-birth.png';
  return '';
}

function setupFilters() {
  $('#filters').innerHTML = [['games', 'game', 'Games'], ['categories', 'category', 'Categories'], ['characters', 'character', 'Characters']].map(([key, field, label]) => {
    const values = [...new Set(state.events.map((event) => event[field]))].sort((a, b) => a.localeCompare(b));
    return `<details class="filter" data-filter="${key}"><summary><span id="${key}-label">${label}</span>${icon('down')}</summary><div class="filter-panel"><div class="filter-panel-header"><span>FILTER BY ${label.toUpperCase()}</span><button type="button" data-clear="${key}">Clear</button></div>${values.map((value) => `<label class="filter-option"><input type="checkbox" name="${key}" value="${escape(value)}"><span>${escape(field === 'game' ? shortGame(value) : value)}</span><span class="option-count">${state.events.filter((event) => event[field] === value).length}</span></label>`).join('')}</div></details>`;
  }).join('');
  $('#filters').addEventListener('change', (event) => {
    const input = event.target;
    if (!input.matches('input[type="checkbox"]')) return;
    state[input.name] = $$(`input[name="${input.name}"]:checked`).map((checkbox) => checkbox.value);
    render();
  });
  $('#filters').addEventListener('click', (event) => {
    const clear = event.target.closest('[data-clear]');
    if (clear) { state[clear.dataset.clear] = []; syncFilters(); render(); }
  });
  $$('.filter').forEach((details) => details.addEventListener('toggle', () => {
    if (details.open) $$('.filter').forEach((other) => { if (other !== details) other.open = false; });
  }));
}

function syncFilters() {
  const labels = { games: 'Games', categories: 'Categories', characters: 'Characters' };
  for (const key of Object.keys(labels)) {
    $(`#${key}-label`).textContent = state[key].length ? `${labels[key]} · ${state[key].length}` : labels[key];
    $(`[data-filter="${key}"]`).classList.toggle('has-selection', state[key].length > 0);
    $$(`input[name="${key}"]`).forEach((input) => { input.checked = state[key].includes(input.value); });
  }
  $('#clear-filters').hidden = !state.query && !state.games.length && !state.categories.length && !state.characters.length;
}

function setupEras() {
  $('#era-navigation').innerHTML = eras.map((era) => `<button class="era-button ${era.id === 'all' ? 'active' : ''}" data-era="${era.id}" aria-pressed="${era.id === 'all'}" style="--era-color:${era.color}">${era.id === 'all' ? icon('globe') : '<span class="era-dot" aria-hidden="true"></span>'}${era.name}</button>`).join('');
  $('#lane-labels').innerHTML = lanes.map((lane) => `<div class="lane-label" style="--lane-color:${lane.color}">${icon(lane.icon)}<span><strong>${lane.name}</strong><small>${lane.subtitle}</small></span></div>`).join('');
}

function focusYears(min, max, padding = 0.08) {
  const left = state.scale.toUnit(min), right = state.scale.toUnit(max);
  const span = Math.max(0.012, right - left);
  state.viewport = clampViewport((left + right - span) / 2 - span * padding, (left + right + span) / 2 + span * padding);
}

function selectEra(id) {
  const era = eras.find((item) => item.id === id);
  if (!era || !state.scale) return;
  state.era = id;
  if (id === 'all') state.viewport = [0, 1];
  else {
    const memories = state.events.filter((event) => event.year >= era.min && event.year < era.max);
    if (id === 'isu' && memories.length) {
      focusYears(Math.min(...memories.map((event) => event.year)), Math.max(...memories.map((event) => event.year)), 0.16);
      // Padding must not cross the compressed gap into the next era.
      state.viewport = clampViewport(state.viewport[0], Math.min(state.viewport[1], state.scale.toUnit(era.max)));
    }
    else focusYears(Math.max(state.scale.minYear, era.min), Math.min(state.scale.maxYear, era.max), 0.02);
  }
  render();
}

function getTicks(width) {
  const min = state.scale.fromUnit(state.viewport[0]), max = state.scale.fromUnit(state.viewport[1]);
  const intervals = [];
  let cursor = min;
  state.scale.breaks.forEach((gap) => {
    if (gap.to <= min || gap.from >= max) return;
    if (gap.from > cursor) intervals.push([cursor, gap.from]);
    cursor = Math.max(cursor, gap.to);
  });
  if (cursor < max) intervals.push([cursor, max]);
  const ticks = [];
  for (const [a, b] of intervals) {
    const pixels = (viewPosition(b) - viewPosition(a)) * width;
    const rough = (b - a) / Math.max(1, pixels / (width < 500 ? 74 : 90));
    const power = 10 ** Math.floor(Math.log10(rough || 1));
    const step = Math.max(1, ([1, 2, 5, 10].find((unit) => unit * power >= rough) || 10) * power);
    for (let year = Math.ceil(a / step) * step, count = 0; year <= b && count < 30; year += step, count++) {
      if (year === 0) continue;
      const position = viewPosition(year);
      if (position >= 0.015 && position <= 0.985) ticks.push({ year, position });
    }
  }
  if (!ticks.length) ticks.push({ year: roundedYear(min), position: 0.03 }, { year: roundedYear(max), position: 0.97 });
  return ticks.sort((a, b) => a.position - b.position).filter((tick, index, all) => !index || (tick.position - all[index - 1].position) * width > (width < 500 ? 53 : 64));
}

function renderTimeline() {
  const width = $('#timeline-viewport').clientWidth || 800;
  const ticks = getTicks(width);
  $('#time-axis').innerHTML = ticks.map((tick) => `<span class="time-tick ${tick.position < 0.06 ? 'edge-first' : tick.position > 0.94 ? 'edge-last' : ''}" style="left:${percent(tick.position)}">${formatYear(tick.year)}</span>`).join('');
  state.groups.clear();
  let markup = ticks.map((tick) => `<span class="plot-grid" style="left:${percent(tick.position)}"></span>`).join('');
  markup += lanes.map((lane) => {
    const events = state.visible.filter((event) => laneFor(event).id === lane.id).sort((a, b) => a.year - b.year);
    const groups = [];
    for (const event of events) {
      const x = viewPosition(event.year) * width;
      const last = groups.at(-1);
      if (last && x - last.lastX < 29) { last.events.push(event); last.lastX = x; last.x = last.events.reduce((sum, item) => sum + viewPosition(item.year) * width, 0) / last.events.length; }
      else groups.push({ x, lastX: x, events: [event] });
    }
    let lastLabelRight = -20;
    return `<div class="timeline-lane" style="--lane-color:${lane.color}">${groups.map((group, index) => {
      const id = `${lane.id}-${index}`;
      state.groups.set(id, group.events);
      const event = group.events[0], isCluster = group.events.length > 1;
      const label = isCluster ? `${group.events.length} connected memories` : prettyTitle(event);
      const alignment = group.x < 54 ? 'align-start' : group.x > width - 54 ? 'align-end' : '';
      const labelWidth = window.innerWidth <= 700 ? 88 : window.innerWidth <= 1200 ? 105 : 126;
      const labelLeft = alignment === 'align-start' ? group.x + 3 : alignment === 'align-end' ? group.x - 3 - labelWidth : group.x - labelWidth / 2;
      const showLabel = labelLeft > lastLabelRight + 10;
      if (showLabel) lastLabelRight = labelLeft + labelWidth;
      const date = isCluster && group.events.at(-1).year !== event.year ? `${formatYear(event.year)} – ${formatYear(group.events.at(-1).year)}` : formatYear(event.year, event.approx);
      return `<button class="memory-marker ${isCluster ? 'cluster' : ''} ${alignment}" style="left:${percent(group.x / width)}" data-group="${id}" aria-label="${escape(`${date}: ${label}`)}" title="${escape(isCluster ? `${group.events.length} memories. Select to explore or zoom in.` : `${prettyTitle(event)} · ${formatYear(event.year, event.approx)}`)}">${isCluster ? `<span class="cluster-count">${group.events.length}</span>` : ''}${showLabel ? `<span class="memory-label"><small>${escape(isCluster ? `${group.events.length} MEMORIES` : formatYear(event.year, event.approx))}</small><span class="label-title">${escape(isCluster ? prettyTitle(event) : label)}</span></span>` : ''}</button>`;
    }).join('')}</div>`;
  }).join('');
  if (state.mode === 'adaptive') markup += state.scale.breaks.map((gap) => {
    const start = Math.max(0, viewPosition(gap.from)), end = Math.min(1, viewPosition(gap.to));
    return end > start ? `<div class="gap-region" style="left:${percent(start)};width:${percent(end - start)}"><span title="${Math.round(gap.to - gap.from).toLocaleString()} years with no recorded memories">//</span></div>` : '';
  }).join('');
  $('#plot-area').innerHTML = markup;
  renderOverview();
  syncMemoryContext();
}

function renderOverview() {
  const bins = Array.from({ length: 180 }, () => 0);
  state.filtered.forEach((event) => { bins[Math.min(179, Math.floor(state.scale.toUnit(event.year) * 180))]++; });
  const maximum = Math.max(1, ...bins);
  $('#overview-marks').innerHTML = bins.map((count, index) => count ? `<rect x="${index * 1000 / 180}" y="${33 - (7 + count / maximum * 22)}" width="2.6" height="${7 + count / maximum * 22}" rx="1" fill="#c1ad7d"/>` : '').join('');
  const [start, end] = state.viewport;
  $('#overview-selection').style.left = percent(start);
  $('#overview-selection').style.width = percent(end - start);
  $('#overview-start').value = Math.round(start * 1000);
  $('#overview-end').value = Math.round(end * 1000);
  $('#overview-start').setAttribute('aria-valuetext', formatYear(roundedYear(state.scale.fromUnit(start))));
  $('#overview-end').setAttribute('aria-valuetext', formatYear(roundedYear(state.scale.fromUnit(end))));
  $('#overview-first').textContent = formatYear(state.events[0].year);
  $('#overview-last').textContent = formatYear(state.events.at(-1).year);
  $('.scale-explanation').innerHTML = state.mode === 'adaptive' && state.scale.breaks.length ? '<span class="break-symbol" aria-hidden="true">//</span> Long gaps in history are compressed' : 'Linear time · equal distance, equal years';
}

function renderList() {
  $('#list-view').innerHTML = state.visible.map((event) => `<button class="list-memory" data-event="${event.id}"><span class="list-date">${escape(formatYear(event.year, event.approx))}</span><span><strong>${escape(prettyTitle(event))}</strong><small>${escape(event.character === 'Unknown character' ? event.category : event.character)}</small></span><span class="list-game">${escape(shortGame(event.game))}</span><span aria-hidden="true">↗</span></button>`).join('');
}

function render() {
  if (!state.scale) return;
  state.filtered = filterEvents(state.events, state);
  state.visible = state.filtered.filter((event) => { const unit = state.scale.toUnit(event.year); return unit >= state.viewport[0] - 1e-9 && unit <= state.viewport[1] + 1e-9; });
  syncFilters();
  $('#visible-status').textContent = `${state.visible.length} of ${state.events.length} memories in view${state.era !== 'all' ? ` · ${eras.find((era) => era.id === state.era).name}` : ''}`;
  $('#timeline-view').hidden = state.view !== 'timeline' || !state.visible.length;
  $('#list-view').hidden = state.view !== 'list' || !state.visible.length;
  $('#empty-state').hidden = state.visible.length > 0;
  $('[data-action="surprise"]').disabled = state.filtered.length === 0;
  $$('[data-era]').forEach((button) => { const active = button.dataset.era === state.era; button.classList.toggle('active', active); button.setAttribute('aria-pressed', active); });
  $$('[data-view]').forEach((button) => { const active = button.dataset.view === state.view; button.classList.toggle('active', active); button.setAttribute('aria-pressed', active); });
  $$('[data-nav]').forEach((link) => link.classList.toggle('active', link.dataset.nav === (state.view === 'timeline' ? 'timeline' : 'archive')));
  const span = state.viewport[1] - state.viewport[0];
  $('#zoom-level').textContent = `${(1 / span).toFixed(span < 0.1 ? 0 : 1).replace('.0', '')}×`;
  $('#zoom-out').disabled = span >= 0.9999;
  $('#zoom-in').disabled = span <= 0.00101;
  $('#pan-left').disabled = state.viewport[0] <= 0;
  $('#pan-right').disabled = state.viewport[1] >= 1;
  if (state.view === 'timeline' && state.visible.length) renderTimeline();
  else if (state.view === 'list') renderList();
}

function navigateViewport(viewport) { state.viewport = viewport; state.era = 'all'; render(); }
function zoom(factor, anchor = 0.5) { navigateViewport(zoomViewport(state.viewport, factor, anchor)); }
function pan(direction) { navigateViewport(panViewport(state.viewport, direction * (state.viewport[1] - state.viewport[0]) * 0.25)); }
function resetFilters() { state.query = ''; state.games = []; state.categories = []; state.characters = []; $('#search').value = ''; }
function resetAll() { resetFilters(); state.viewport = [0, 1]; state.era = 'all'; render(); }

let memoryOpener = null;
let memoryContextIds = [];

function syncMemoryContext() {
  const dialog = $('#memory-dialog');
  $$('.memory-marker.is-selected').forEach((marker) => marker.classList.remove('is-selected'));
  dialog.classList.remove('has-timeline-context');
  if (!dialog.open || state.view !== 'timeline') return;

  const marker = $$('.memory-marker').find((point) =>
    state.groups.get(point.dataset.group)?.some((event) => memoryContextIds.includes(event.id))
  );
  if (!marker) return;
  const rect = marker.getBoundingClientRect();
  const x = rect.left + rect.width / 2, y = rect.top + rect.height / 2;
  const width = document.documentElement.clientWidth, height = window.innerHeight;
  if (x < 0 || x > width || y < 0 || y > height) return;

  // Keep the actual source point exposed; the native dialog still owns focus.
  const compact = width < 900;
  const margin = compact ? 10 : 20;
  const gap = 72;
  let panelX, panelY, panelWidth, panelHeight;
  if (compact) {
    const below = y < height / 2;
    panelWidth = width - margin * 2;
    panelHeight = Math.min(height * 0.72, (below ? height - y : y) - gap - margin);
    panelX = margin;
    panelY = below ? height - margin - panelHeight : margin;
  } else {
    const right = x < width / 2;
    panelWidth = Math.min(510, (right ? width - x : x) - gap - margin);
    panelHeight = height - margin * 2;
    panelX = right ? width - margin - panelWidth : margin;
    panelY = margin;
  }
  marker.classList.add('is-selected');
  dialog.classList.add('has-timeline-context');
  const properties = { 'focus-x': x, 'focus-y': y, 'panel-x': panelX, 'panel-y': panelY, 'panel-width': panelWidth, 'panel-height': panelHeight };
  for (const [name, value] of Object.entries(properties)) dialog.style.setProperty(`--memory-${name}`, `${value}px`);
}

function presentMemory() {
  const dialog = $('#memory-dialog');
  if (!dialog.open) { memoryOpener = document.activeElement; dialog.showModal(); }
  syncMemoryContext();
  const title = $('#memory-title');
  title.tabIndex = -1;
  title.focus({ preventScroll: true });
  dialog.scrollTop = 0;
}

function openMemory(id) {
  const event = state.events.find((memory) => memory.id === id);
  if (!event) return;
  state.selectedId = id;
  memoryContextIds = [id];
  const sequence = state.filtered.length ? state.filtered : state.events;
  const index = sequence.findIndex((memory) => memory.id === id);
  const image = sourceImage(event);
  $('#memory-content').innerHTML = `<div class="dialog-top"><p class="eyebrow">THE MEMORY ARCHIVE <span aria-hidden="true">/</span> ${String(state.events.indexOf(event) + 1).padStart(3, '0')}</p><button class="close-button" data-close="memory" aria-label="Close memory details">×</button></div><div class="memory-body"><p class="memory-year">${escape(formatYear(event.year, event.approx))}</p><h2 id="memory-title">${escape(prettyTitle(event))}</h2><div class="memory-tags"><span>${escape(event.category)}</span><span>${escape(shortGame(event.game))}</span></div>${image ? `<img class="memory-art" src="${escape(image)}" alt="${escape(prettyTitle(event))}">` : ''}<p class="memory-description">${escape(event.description || 'No description has been added to this memory yet.')}</p><dl class="memory-meta"><dt>Character</dt><dd>${escape(event.character)}</dd><dt>Game</dt><dd>${escape(event.game)}</dd>${event.location ? `<dt>Location</dt><dd>${escape(event.location)}</dd>` : ''}<dt>Source</dt><dd>${escape(event.source || 'Not provided')}</dd><dt>Date</dt><dd>${escape(formatYear(event.year, event.approx))}${event.approx ? ' · Approximate, as recorded in the dataset' : ''}</dd>${event.start ? `<dt>Recorded start</dt><dd>${escape(formatSourceDate(event.start))}</dd>` : ''}${event.end ? `<dt>Recorded end</dt><dd>${escape(formatSourceDate(event.end))}</dd>` : ''}</dl>${event.eraInferred ? `<p class="data-note">The source CSV has no era for this memory. ${escape(event.era)} was inferred from its signed Real Year field.</p>` : ''}${event.untitled ? '<p class="data-note">This entry has no title in the source CSV. Its date, character, and description are preserved.</p>' : ''}${event.title !== prettyTitle(event) ? `<p class="data-note">Original title: ${escape(event.title)}</p>` : ''}<div class="memory-actions"><button class="secondary-button" data-focus-event="${event.id}">${icon('timeline')} Find on timeline</button>${event.character !== 'Unknown character' ? `<button class="secondary-button" data-follow-character="${escape(event.character)}">Follow this character ${icon('right')}</button>` : ''}</div><div class="memory-pager"><button data-event="${sequence[index - 1]?.id || ''}" ${index <= 0 ? 'disabled' : ''}>${icon('left')} Previous memory</button><button data-event="${sequence[index + 1]?.id || ''}" ${index < 0 || index === sequence.length - 1 ? 'disabled' : ''}>Next memory ${icon('right')}</button></div></div>`;
  const memoryImage = $('#memory-content img');
  if (memoryImage) memoryImage.addEventListener('error', () => { memoryImage.hidden = true; }, { once: true });
  presentMemory();
}

let clusterEvents = [];
function openGroup(id) {
  const events = state.groups.get(id);
  if (!events?.length) return;
  if (events.length === 1) return openMemory(events[0].id);
  clusterEvents = events;
  state.selectedId = null;
  memoryContextIds = events.map((event) => event.id);
  $('#memory-content').innerHTML = `<div class="dialog-top"><p class="eyebrow">CONNECTED MEMORIES</p><button class="close-button" data-close="memory" aria-label="Close connected memories">×</button></div><div class="memory-body"><p class="memory-year">${escape(formatYear(events[0].year))}${events.at(-1).year !== events[0].year ? ` — ${escape(formatYear(events.at(-1).year))}` : ''}</p><h2 id="memory-title">${events.length} threads of history.</h2><p class="cluster-intro">These memories share a moment in time. Open a story, or zoom in to see how they connect.</p><div class="memory-actions"><button class="secondary-button" data-action="zoom-cluster">Zoom into this period ${icon('plus')}</button></div><div class="cluster-list">${events.map((event) => `<button class="cluster-memory" data-event="${event.id}"><span><small>${escape(formatYear(event.year, event.approx))}</small>${escape(prettyTitle(event))}</span><span aria-hidden="true">↗</span></button>`).join('')}</div></div>`;
  presentMemory();
}

function showInfo(type) {
  const help = type === 'help';
  $('#info-content').innerHTML = `<div class="dialog-top"><p class="eyebrow">THE ANIMUS ARCHIVE</p><button class="close-button" data-close="info" aria-label="Close information">×</button></div><div class="info-body"><h2 id="info-title">${help ? 'Follow your curiosity.' : 'The past is never lost.'}</h2>${help ? `<p>Every point is a memory. Start with an era, follow a character, or see where the threads of history lead.</p><div class="help-row"><strong>Travel in time</strong><span>Drag the timeline or use the arrow buttons. With the chart focused, use the left and right arrow keys.</span></div><div class="help-row"><strong>Look closer</strong><span>Scroll over the timeline, press + / −, or use the zoom buttons. The overview handles adjust the start and end independently.</span></div><div class="help-row"><strong>Find a story</strong><span>Search names, titles, games, or descriptions. Games, categories, and characters can be combined. Press / to search.</span></div><div class="help-row"><strong>Open a memory</strong><span>Select a diamond or a numbered group. The list button offers the same memories in chronological order.</span></div><div class="help-row"><strong>Start again</strong><span>Reset view restores all dates and keeps your filters. Press Home when the chart is focused for the same action.</span></div>` : `<p>A fan-made atlas of the stories behind Assassin’s Creed. The archive brings together the characters, artifacts, and turning points in your growing timeline dataset.</p><p>Currently exploring <strong>${state.events.length} memories</strong> across <strong>${new Set(state.events.filter((event) => event.game !== 'Unassigned game').map((event) => event.game)).size} named games</strong>. This is a work in progress, not a complete record of every game or event. Sources and dates are reproduced from the supplied CSV; spoilers are part of the journey.</p><h3>All of history. One view.</h3><p>The adaptive scale compresses data-free gaps longer than 2,000 years. The striped break marks where time is compressed, so human history stays readable beside the Isu era. Switch to Linear for a uniformly spaced year scale. Era tabs are navigation ranges, not claims of formal historical boundaries.</p><h3>An archive that grows with you.</h3><p>New rows in <a href="./${escape(DATASET_PATH)}" download>the source CSV</a> appear automatically on reload. Filters are generated from the data. “c.” marks an approximate date; missing values are labeled explicitly.</p><p>Assassin’s Creed and its characters belong to Ubisoft. This is an independent fan project with no official affiliation. The Florence artwork is an original AI-generated illustration; it is decorative, not a historical source.</p>`}</div>`;
  $('#info-dialog').showModal();
}

function setupInteractions() {
  document.addEventListener('click', (event) => {
    const target = event.target.closest('button, a');
    if (!event.target.closest('.filter')) $$('.filter').forEach((details) => { details.open = false; });
    if (!target) return;
    if (target.dataset.era) selectEra(target.dataset.era);
    if (target.dataset.eraCard) { resetFilters(); selectEra(target.dataset.eraCard); $('#explorer').scrollIntoView({ behavior: 'smooth' }); }
    if (target.dataset.view) { state.view = target.dataset.view; render(); }
    if (target.dataset.nav) { state.view = target.dataset.nav === 'archive' ? 'list' : 'timeline'; render(); }
    if (target.dataset.group) openGroup(target.dataset.group);
    if (target.dataset.event) openMemory(target.dataset.event);
    if (target.dataset.close) $(`#${target.dataset.close}-dialog`).close();
    if (target.dataset.focusEvent) {
      const memory = state.events.find((item) => item.id === target.dataset.focusEvent);
      $('#memory-dialog').close(); state.view = 'timeline'; state.era = 'all'; focusYears(memory.year - 40, memory.year + 40); render(); $('#explorer').scrollIntoView({ behavior: 'smooth' });
    }
    if (target.dataset.followCharacter) {
      const character = target.dataset.followCharacter;
      resetFilters(); state.characters = [character]; state.viewport = [0, 1]; state.era = 'all'; state.view = 'list'; $('#memory-dialog').close(); render(); $('#explorer').scrollIntoView({ behavior: 'smooth' });
    }
    const action = target.dataset.action;
    if (action === 'help' || action === 'about') showInfo(action);
    if (action === 'reset-all') resetAll();
    if (action === 'surprise' && state.filtered.length) openMemory(state.filtered[Math.floor(Math.random() * state.filtered.length)].id);
    if (action === 'zoom-cluster') { $('#memory-dialog').close(); focusYears(clusterEvents[0].year, clusterEvents.at(-1).year, 0.2); state.era = 'all'; render(); }
    if (action === 'retry') load();
  });
  $('#search').addEventListener('input', (event) => { state.query = event.target.value; render(); });
  $('#clear-filters').addEventListener('click', () => { resetFilters(); render(); });
  $('#reset-view').addEventListener('click', () => { state.viewport = [0, 1]; state.era = 'all'; render(); });
  $('#zoom-in').addEventListener('click', () => zoom(0.65));
  $('#zoom-out').addEventListener('click', () => zoom(1 / 0.65));
  $('#pan-left').addEventListener('click', () => pan(-1));
  $('#pan-right').addEventListener('click', () => pan(1));
  $('#scale-mode').addEventListener('change', (event) => {
    if (!state.scale) return;
    const fullView = state.viewport[1] - state.viewport[0] > 0.9999;
    const years = state.viewport.map((unit) => state.scale.fromUnit(unit));
    state.mode = event.target.value; state.scale = createTimeScale(state.events, state.mode);
    state.viewport = fullView ? [0, 1] : clampViewport(...years.map((year) => state.scale.toUnit(year)));
    render();
  });
  document.addEventListener('keydown', (event) => {
    const typing = event.target.matches('input, textarea, select') || event.target.isContentEditable;
    if (event.key === '/' && !typing && !document.querySelector('dialog[open]')) { event.preventDefault(); $('#search').focus(); }
    if (event.key === 'Escape') $$('.filter').forEach((details) => { details.open = false; });
  });
  for (const dialog of $$('dialog')) dialog.addEventListener('click', (event) => {
    if (event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
  });
  $('#memory-dialog').addEventListener('close', () => {
    memoryContextIds = [];
    state.selectedId = null;
    syncMemoryContext();
    const fallback = state.view === 'list' ? $('#list-view button') : $('#timeline-viewport');
    const target = memoryOpener?.isConnected && memoryOpener.getClientRects().length ? memoryOpener : fallback || $('#search');
    target.focus({ preventScroll: true });
    memoryOpener = null;
  });
  window.addEventListener('resize', syncMemoryContext);
  window.addEventListener('scroll', syncMemoryContext, { passive: true });
  setupChartGestures();
}

function setupChartGestures() {
  const viewport = $('#timeline-viewport');
  viewport.addEventListener('keydown', (event) => {
    if (event.key === '+' || event.key === '=') { event.preventDefault(); zoom(0.65); }
    if (event.key === '-') { event.preventDefault(); zoom(1 / 0.65); }
    if (event.key === 'ArrowLeft') { event.preventDefault(); pan(-1); }
    if (event.key === 'ArrowRight') { event.preventDefault(); pan(1); }
    if (event.key === 'Home') { event.preventDefault(); navigateViewport([0, 1]); }
  });
  let wheelFrame = 0;
  viewport.addEventListener('wheel', (event) => {
    if (state.viewport[1] - state.viewport[0] > 0.9999 && event.deltaY > 0 && !event.ctrlKey) return;
    event.preventDefault();
    if (wheelFrame) return;
    const delta = event.deltaY, horizontal = event.deltaX, rect = viewport.getBoundingClientRect(), anchor = (event.clientX - rect.left) / rect.width;
    wheelFrame = requestAnimationFrame(() => {
      if (Math.abs(horizontal) > Math.abs(delta)) navigateViewport(panViewport(state.viewport, horizontal / rect.width * (state.viewport[1] - state.viewport[0])));
      else zoom(Math.exp(Math.max(-180, Math.min(180, delta)) * 0.0025), anchor);
      wheelFrame = 0;
    });
  }, { passive: false });
  let drag = null;
  viewport.addEventListener('pointerdown', (event) => {
    if (event.button !== 0 || event.target.closest('button')) return;
    drag = { x: event.clientX, viewport: [...state.viewport], width: viewport.clientWidth };
    viewport.setPointerCapture(event.pointerId); viewport.classList.add('dragging');
  });
  viewport.addEventListener('pointermove', (event) => {
    if (!drag) return;
    navigateViewport(panViewport(drag.viewport, -(event.clientX - drag.x) / drag.width * (drag.viewport[1] - drag.viewport[0])));
  });
  const stopDrag = () => { drag = null; viewport.classList.remove('dragging'); };
  viewport.addEventListener('pointerup', stopDrag);
  viewport.addEventListener('pointercancel', stopDrag);
  const start = $('#overview-start'), end = $('#overview-end');
  start.addEventListener('input', () => navigateViewport(clampViewport(Math.min(Number(start.value) / 1000, state.viewport[1] - 0.001), state.viewport[1])));
  end.addEventListener('input', () => navigateViewport(clampViewport(state.viewport[0], Math.max(Number(end.value) / 1000, state.viewport[0] + 0.001))));
  const overview = $('#overview');
  let overviewDrag = null;
  overview.addEventListener('pointerdown', (event) => {
    if (event.target.matches('input') || event.button !== 0) return;
    const rect = overview.getBoundingClientRect(), unit = (event.clientX - rect.left) / rect.width, span = state.viewport[1] - state.viewport[0];
    if (unit < state.viewport[0] || unit > state.viewport[1]) navigateViewport(clampViewport(unit - span / 2, unit + span / 2));
    overviewDrag = { x: event.clientX, viewport: [...state.viewport], width: rect.width };
    overview.setPointerCapture(event.pointerId);
  });
  overview.addEventListener('pointermove', (event) => { if (overviewDrag) navigateViewport(panViewport(overviewDrag.viewport, (event.clientX - overviewDrag.x) / overviewDrag.width)); });
  overview.addEventListener('pointerup', () => { overviewDrag = null; });
  overview.addEventListener('pointercancel', () => { overviewDrag = null; });
  let resizeFrame = 0;
  new ResizeObserver(() => { cancelAnimationFrame(resizeFrame); resizeFrame = requestAnimationFrame(() => { if (state.scale && state.view === 'timeline' && state.visible.length) renderTimeline(); }); }).observe(viewport);
}

async function load() {
  $('#loading-state').hidden = false;
  $('#loading-state').innerHTML = '<span class="loading-symbol">◇</span><p>Retrieving the memories…</p>';
  try {
    const response = await fetch(new URL(`../${DATASET_PATH}`, import.meta.url));
    if (!response.ok) throw new Error(`The data file could not be loaded (${response.status}).`);
    const { events, warnings } = loadEvents(await response.text());
    if (!events.length) throw new Error(warnings.join(' ') || 'The dataset has no dated memories yet.');
    state.events = events.sort((a, b) => a.year - b.year);
    state.scale = createTimeScale(events, state.mode);
    $('#memory-total').textContent = events.length;
    $('#game-total').textContent = new Set(events.filter((event) => event.game !== 'Unassigned game').map((event) => event.game)).size;
    $('#year-count').textContent = `${(Math.floor((state.events.at(-1).year - state.events[0].year) / 1000) * 1000).toLocaleString('en-GB')}+`;
    const isuYears = events.filter((event) => event.year < eras.find((era) => era.id === 'isu').max).map((event) => event.year);
    if (isuYears.length) $('[data-era-card="isu"] small').textContent = `${formatYear(Math.min(...isuYears))} – ${formatYear(Math.max(...isuYears))}`;
    setupFilters();
    if (warnings.length) {
      let note = $('.data-warning');
      if (!note) { note = document.createElement('p'); note.className = 'data-warning'; $('#timeline-shell').append(note); }
      note.textContent = warnings.join(' ');
    }
    $('#loading-state').hidden = true;
    render();
  } catch (error) {
    $('#loading-state').innerHTML = `<span class="loading-symbol">◇</span><h3>The memory could not be retrieved.</h3><p>${escape(error.message)}</p><button class="secondary-button" data-action="retry">Try again</button>`;
  }
}

decorateIcons();
setupEras();
setupInteractions();
load();
