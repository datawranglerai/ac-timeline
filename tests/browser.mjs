import assert from 'node:assert/strict';
import { mkdir, readFile } from 'node:fs/promises';

// Optional browser verification: use an installed Playwright, or point to an existing one.
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ headless: true, ...(process.env.BROWSER_EXECUTABLE ? { executablePath: process.env.BROWSER_EXECUTABLE } : {}) });
const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:5173';
const errors = [];
const checks = [];
await mkdir('output', { recursive: true });

try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 }, deviceScaleFactor: 1 });
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(base);
  await page.waitForSelector('.memory-marker');
  await page.evaluate(() => document.fonts.ready);
  assert.equal(await page.locator('#memory-total').innerText(), '48');
  assert.match(await page.locator('#visible-status').innerText(), /48 of 48/);
  await page.screenshot({ path: 'output/desktop.png', fullPage: true });
  checks.push('all 48 source records load; desktop screenshot');

  await page.getByRole('button', { name: 'Chronological list view', exact: true }).click();
  assert.equal(await page.locator('.list-memory').count(), 48);
  await page.locator('.list-memory').first().click();
  assert.equal(await page.locator('#memory-title').innerText(), 'Shroud of Eden Created');
  assert.match(await page.locator('.memory-meta').innerText(), /Consus/);
  await page.getByRole('button', { name: 'Next memory', exact: true }).click();
  assert.equal(await page.evaluate(() => document.activeElement.id), 'memory-title');
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#memory-dialog').evaluate((el) => el.open), false);
  assert.equal(await page.locator('.list-memory').first().evaluate((el) => el === document.activeElement), true);
  checks.push('chronology, detail contents, and Escape dismissal');

  await page.locator('#search').fill('altair');
  assert.equal(await page.locator('.list-memory').count(), 6);
  await page.locator('#clear-filters').click();
  await page.locator('[data-filter="games"] summary').click();
  await page.locator(`input[name="games"][value="Assassin's Creed II"]`).check();
  assert.equal(await page.locator('.list-memory').count(), 8);
  await page.locator('[data-filter="characters"] summary').click();
  await page.locator('input[name="characters"][value="Ezio Auditore da Firenze"]').check();
  assert.equal(await page.locator('.list-memory').count(), 5);
  await page.locator('#clear-filters').click();
  checks.push('accent-insensitive search, dynamic games, and combined character filters');

  await page.locator('#search').fill('no-memory-matches-xyz');
  assert.equal(await page.locator('#empty-state').isVisible(), true);
  assert.equal(await page.locator('[data-action="surprise"]').isDisabled(), true);
  await page.getByRole('button', { name: 'Show all memories', exact: true }).click();
  assert.equal(await page.locator('.list-memory').count(), 48);
  await page.locator('#search').fill('Daniel Cross');
  await page.locator('.list-memory').first().click();
  assert.equal(await page.locator('#memory-title').innerText(), 'Untitled memory');
  assert.match(await page.locator('.data-note').innerText(), /no title in the source/);
  await page.keyboard.press('Escape');
  await page.locator('#clear-filters').click();
  checks.push('empty-state recovery and missing-title disclosure');

  await page.getByRole('button', { name: 'Timeline view', exact: true }).click();
  await page.locator('[data-era="isu"]').click();
  assert.match(await page.locator('#visible-status').innerText(), /5 of 48/);
  await page.locator('#reset-view').click();
  await page.locator('#zoom-in').click();
  assert.notEqual(await page.locator('#zoom-level').innerText(), '1×');
  const beforePan = await page.locator('#overview-start').inputValue();
  await page.locator('#pan-right').click();
  assert.ok(Number(await page.locator('#overview-start').inputValue()) > Number(beforePan));
  await page.locator('#timeline-viewport').focus();
  await page.keyboard.press('Home');
  assert.equal(await page.locator('#zoom-level').innerText(), '1×');
  await page.locator('#scale-mode').selectOption('linear');
  assert.equal(await page.locator('.gap-region').count(), 0);
  assert.match(await page.locator('#visible-status').innerText(), /48 of 48/);
  await page.locator('#scale-mode').selectOption('adaptive');
  assert.equal(await page.locator('.gap-region').count(), 1);
  checks.push('Isu range, zoom, pan, keyboard reset, and both time scales');

  await page.locator('#timeline-viewport').scrollIntoViewIfNeeded();
  const chart = await page.locator('#timeline-viewport').boundingBox();
  await page.mouse.move(chart.x + chart.width * 0.7, chart.y + 16);
  await page.mouse.wheel(0, -150);
  await page.waitForFunction(() => document.querySelector('#zoom-level').textContent !== '1×');
  const beforeDrag = Number(await page.locator('#overview-start').inputValue());
  await page.mouse.move(chart.x + chart.width * 0.5, chart.y + 20);
  await page.mouse.down();
  await page.mouse.move(chart.x + chart.width * 0.4, chart.y + 20, { steps: 5 });
  await page.mouse.up();
  assert.ok(Number(await page.locator('#overview-start').inputValue()) > beforeDrag);
  await page.locator('#overview-end').focus();
  const beforeBrush = Number(await page.locator('#overview-end').inputValue());
  await page.keyboard.press('ArrowLeft');
  assert.ok(Number(await page.locator('#overview-end').inputValue()) < beforeBrush);
  await page.locator('#reset-view').click();
  checks.push('actual scroll zoom, pointer drag, and keyboard overview handles');

  await page.locator('.memory-marker.cluster').first().click();
  assert.ok(await page.locator('.cluster-memory').count() > 1);
  await page.locator('.cluster-memory').first().click();
  assert.equal(await page.locator('#memory-dialog').evaluate((el) => el.open), true);
  assert.equal(await page.evaluate(() => document.activeElement.id), 'memory-title');
  await page.keyboard.press('Escape');
  await page.locator('[data-era-card="renaissance"]').click();
  assert.match(await page.locator('#visible-status').innerText(), /4 of 48/);
  await page.locator('.memory-marker').first().click();
  await page.locator('[data-follow-character]').click();
  assert.equal(await page.locator('#list-view').isVisible(), true);
  assert.equal(await page.locator('.list-memory').count(), 5);
  checks.push('cluster drill-down, curated eras, and character journey');

  await page.getByRole('button', { name: /About the project/ }).click();
  assert.match(await page.locator('#info-content').innerText(), /compresses data-free gaps/);
  await page.keyboard.press('Escape');
  await page.locator('#clear-filters').click();
  await page.locator('[data-nav="timeline"]').click();
  await page.locator('#reset-view').click();
  await page.locator('[data-era="renaissance"]').click();
  await page.evaluate(() => { document.activeElement?.blur(); window.scrollTo({ top: 0, behavior: 'instant' }); });
  await page.screenshot({ path: 'output/renaissance.png', fullPage: true });
  checks.push('project information and focused-era screenshot');

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  mobile.on('pageerror', (error) => errors.push(error.message));
  await mobile.goto(base);
  await mobile.waitForSelector('.memory-marker');
  await mobile.evaluate(() => document.fonts.ready);
  assert.equal(await mobile.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await mobile.screenshot({ path: 'output/mobile.png', fullPage: true });
  await mobile.locator('[data-filter="characters"] summary').click();
  const filterBox = await mobile.locator('[data-filter="characters"] .filter-panel').boundingBox();
  assert.ok(filterBox.x >= 0 && filterBox.x + filterBox.width <= 390);
  await mobile.keyboard.press('Escape');
  await mobile.getByRole('button', { name: 'Chronological list view', exact: true }).click();
  await mobile.locator('.list-memory').first().click();
  const dialogBox = await mobile.locator('#memory-dialog').boundingBox();
  assert.ok(dialogBox.x >= 0 && dialogBox.x + dialogBox.width <= 390);
  checks.push('390px mobile layout, filter bounds, list, and detail dialog');

  const failure = await browser.newPage();
  await failure.route('**/data/**', (route) => route.fulfill({ status: 503, body: 'Unavailable' }));
  await failure.goto(base);
  await failure.getByRole('button', { name: 'Try again', exact: true }).waitFor();
  await failure.unroute('**/data/**');
  await failure.getByRole('button', { name: 'Try again', exact: true }).click();
  await failure.waitForSelector('.memory-marker');
  assert.match(await failure.locator('#visible-status').innerText(), /48 of 48/);
  checks.push('failed CSV loading and successful retry');

  const expanded = await browser.newPage();
  const csv = await readFile(new URL("../data/Assassin's Creed Timeline - Data.csv", import.meta.url), 'utf8');
  await expanded.route('**/data/**', (route) => route.fulfill({ status: 200, contentType: 'text/csv', body: csv.trimEnd() + '\n2050,FALSE,CE,2050,Future lore,New hero,Future AC,Test source,New chapter,,An added memory.\n' }));
  await expanded.goto(base);
  await expanded.waitForSelector('.memory-marker');
  assert.equal(await expanded.locator('#memory-total').innerText(), '49');
  assert.match(await expanded.locator('#overview-last').innerText(), /2,050 CE/);
  await expanded.locator('[data-filter="games"] summary').click();
  await expanded.locator('input[name="games"][value="Future AC"]').check();
  assert.match(await expanded.locator('#visible-status').innerText(), /1 of 49/);
  checks.push('a new CSV game/year appears automatically in counts, bounds, and filters');

  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ passed: checks, pageErrors: errors, screenshots: ['output/desktop.png', 'output/renaissance.png', 'output/mobile.png'] }, null, 2));
} finally { await browser.close(); }
