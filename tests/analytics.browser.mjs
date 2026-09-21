import assert from 'node:assert/strict';

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({ headless: true, ...(process.env.BROWSER_EXECUTABLE ? { executablePath: process.env.BROWSER_EXECUTABLE } : {}) });
const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:5173';
const pageErrors = [];
const productionRequests = [];
const checks = [];
const csv = `Year,Era,Title,Character,Game,Category
75000,BCE,An Isu memory,Juno,Assassin's Creed III,Isu
835,CE,A Mirage memory,Basim Ibn Ishaq,Assassin's Creed Mirage,Characters
861,CE,Another Mirage memory,Basim Ibn Ishaq,Assassin's Creed Mirage,Characters
1459,CE,A Renaissance memory,Ezio Auditore da Firenze,Assassin's Creed II,Characters
1582,CE,A Shadows memory,Fujibayashi Naoe,Assassin's Creed Shadows,Characters
1582,CE,Another Shadows memory,Yasuke,Assassin's Creed Shadows,Characters
`;
const counterStub = `
  window.analyticsCalls = [];
  window.goatcounter = { count(event) { window.analyticsCalls.push(event || { pageview: true }); } };
  window.goatcounter.count();
`;

async function openApp(mode = 'ready', mobile = false) {
  const context = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 1100 }, reducedMotion: 'reduce' });
  let release;
  const scriptReady = new Promise((resolve) => { release = resolve; });
  await context.route(/https?:\/\/[^/]*goatcounter\.com\//, (route) => {
    productionRequests.push(route.request().url());
    return route.abort();
  });
  await context.route('https://gc.zgo.at/count.js', async (route) => {
    if (mode === 'blocked') return route.abort();
    if (mode === 'delayed') await scriptReady;
    return route.fulfill({ contentType: 'text/javascript', body: counterStub });
  });
  await context.route('**/data/**', (route) => route.fulfill({ contentType: 'text/csv', body: csv }));
  await context.route('https://www.buymeacoffee.com/**', (route) => route.fulfill({ contentType: 'text/html', body: '<title>Support link test</title>' }));
  const page = await context.newPage();
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await page.goto(base, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.memory-marker');
  if (mode === 'ready') await page.waitForFunction(() => typeof window.goatcounter?.count === 'function');
  return { page, context, release };
}

async function eventCount(page, path) {
  return page.evaluate((path) => (window.analyticsCalls || []).filter((event) => event.event && event.path === path).length, path);
}

try {
  const { page, context } = await openApp();
  const script = page.locator('script[data-goatcounter]');
  assert.equal(await script.count(), 1);
  assert.equal(await script.getAttribute('data-goatcounter'), 'https://ac-timeline.goatcounter.com/count');
  assert.equal(await script.getAttribute('src'), 'https://gc.zgo.at/count.js');
  assert.equal(await script.evaluate((element) => element.async), true);
  assert.equal(await script.getAttribute('data-goatcounter-settings'), null, 'Production does not enable local counting');

  await page.locator('.hero .primary-button').click();
  assert.equal(await eventCount(page, 'enter-timeline'), 1);
  await page.getByRole('button', { name: 'Chronological list view', exact: true }).click();
  assert.equal(await eventCount(page, 'view-list'), 1);
  await page.locator('.list-memory').first().click();
  assert.equal(await eventCount(page, 'memory-open'), 1);
  await page.getByRole('button', { name: 'Next memory', exact: true }).click();
  assert.equal(await eventCount(page, 'memory-open'), 2);
  await page.locator('[data-follow-character]').click();
  assert.equal(await eventCount(page, 'character-follow'), 1);
  await page.locator('#clear-filters').click();
  await page.getByRole('button', { name: 'Timeline view', exact: true }).click();
  await page.locator('.memory-marker.cluster').first().click();
  assert.equal(await eventCount(page, 'memory-cluster-open'), 1);
  assert.equal(await eventCount(page, 'memory-open'), 2, 'A cluster is not also counted as an individual memory');
  await page.keyboard.press('Escape');

  await page.locator('.mirage-card').click();
  assert.equal(await eventCount(page, 'discover-mirage'), 1);
  assert.equal(await eventCount(page, 'era-medieval'), 0, 'An automatic era change is not an extra click');
  await page.locator('.shadows-card').click();
  assert.equal(await eventCount(page, 'discover-shadows'), 1);
  await page.locator('.isu-card').click();
  assert.equal(await eventCount(page, 'discover-isu'), 1);
  await page.locator('[data-era="all"]').click();
  assert.equal(await eventCount(page, 'era-all'), 1);
  await page.locator('[data-character-journey="basim"]').click();
  assert.equal(await eventCount(page, 'character-basim'), 1);
  await page.locator('#clear-filters').click();
  await page.locator('#reset-view').click();
  await page.locator('[data-filter="games"] summary').click();
  await page.locator('input[name="games"][value="Assassin\'s Creed Mirage"]').check();
  assert.equal(await eventCount(page, 'filter-games'), 1);
  await page.keyboard.press('Escape');
  await page.locator('#clear-filters').click();
  await page.locator('#scale-mode').selectOption('linear');
  assert.equal(await eventCount(page, 'scale-linear'), 1);

  const before = await page.evaluate(() => window.analyticsCalls.length);
  await page.locator('#search').fill('private-search-text@example.com');
  await page.locator('#search').fill('');
  await page.locator('#zoom-in').click();
  await page.locator('#zoom-out').click();
  await page.locator('#reset-view').click();
  assert.equal(await page.evaluate(() => window.analyticsCalls.length), before, 'Typing and viewport changes produce no analytics events');
  await page.getByRole('button', { name: 'How to explore the timeline', exact: true }).click();
  assert.equal(await eventCount(page, 'help-open'), 1);
  await page.keyboard.press('Escape');

  for (let index = 1; index <= 2; index++) {
    await page.getByRole('button', { name: /About the project/ }).click();
    assert.equal(await eventCount(page, 'about-open'), index);
    const downloadPromise = page.waitForEvent('download');
    await page.locator('#info-content a[download]').click();
    await downloadPromise;
    assert.equal(await eventCount(page, 'download-csv'), index);
    const popupPromise = page.waitForEvent('popup');
    await page.locator('.coffee-button').click();
    const popup = await popupPromise;
    await popup.waitForLoadState();
    assert.equal(popup.url(), 'https://www.buymeacoffee.com/datawranglerai');
    assert.equal(await eventCount(page, 'support-coffee'), index, 'Recreated modal links count exactly once');
    await popup.close();
    await page.keyboard.press('Escape');
  }
  const calls = await page.evaluate(() => window.analyticsCalls);
  assert.equal(calls.filter((event) => event.pageview).length, 1, 'UI interactions do not create virtual pageviews');
  assert.ok(calls.filter((event) => event.event).every((event) => event.no_session === true && event.path && !event.path.startsWith('/') && event.title));
  assert.ok(!JSON.stringify(calls).includes('private-search-text'));
  checks.push('one pageview, curated events, repeated clicks, dynamic modal links, no double counts or raw search text');
  await context.close();

  const delayed = await openApp('delayed');
  await delayed.page.getByRole('button', { name: /About the project/ }).click();
  assert.equal(await delayed.page.locator('#info-dialog').evaluate((dialog) => dialog.open), true);
  await delayed.page.keyboard.press('Escape');
  await delayed.page.locator('.hero .primary-button').click();
  assert.equal(await delayed.page.evaluate(() => window.goatcounter), undefined);
  delayed.release();
  await delayed.page.waitForFunction(() => window.analyticsCalls?.length === 3);
  assert.deepEqual(await delayed.page.evaluate(() => window.analyticsCalls.filter((event) => event.event).map((event) => event.path)), ['about-open', 'enter-timeline']);
  checks.push('early interactions work immediately and flush once after async loading');
  await delayed.context.close();

  const bounded = await openApp('delayed');
  await bounded.page.evaluate(async () => {
    const { trackEvent } = await import(new URL('src/analytics.js', document.baseURI).href);
    for (let index = 0; index < 100; index++) trackEvent('test-early-event', 'Early event');
  });
  bounded.release();
  await bounded.page.waitForFunction(() => typeof window.goatcounter?.count === 'function');
  assert.equal(await eventCount(bounded.page, 'test-early-event'), 25);
  checks.push('pending events remain bounded while the tracker is unavailable');
  await bounded.context.close();

  const blocked = await openApp('blocked', true);
  await blocked.page.locator('.mirage-card').click();
  assert.equal(await blocked.page.locator('input[name="games"]:checked').inputValue(), "Assassin's Creed Mirage");
  await blocked.page.getByRole('button', { name: /About the project/ }).click();
  assert.equal(await blocked.page.locator('#info-dialog').evaluate((dialog) => dialog.open), true);
  assert.equal(await blocked.page.locator('.coffee-button').getAttribute('href'), 'https://www.buymeacoffee.com/datawranglerai');
  checks.push('mobile navigation and About remain usable when analytics is blocked');
  await blocked.context.close();

  const throwing = await openApp();
  const warnings = [];
  throwing.page.on('console', (message) => { if (message.type() === 'warning') warnings.push(message.text()); });
  await throwing.page.evaluate(() => { window.goatcounter.count = () => { throw new Error('Simulated analytics failure'); }; });
  await throwing.page.getByRole('button', { name: /About the project/ }).click();
  assert.equal(await throwing.page.locator('#info-dialog').evaluate((dialog) => dialog.open), true);
  assert.ok(warnings.some((message) => message.includes('GoatCounter could not record an event')));
  checks.push('third-party exceptions are reported without breaking the app');
  await throwing.context.close();

  assert.deepEqual(pageErrors, []);
  assert.deepEqual(productionRequests, [], 'Tests must never submit production analytics');
  console.log(JSON.stringify({ passed: checks, pageErrors, productionRequests }, null, 2));
} finally { await browser.close(); }
