import assert from 'node:assert/strict';

async function showCharacterWindow(page, id) {
  await page.locator('#character-gallery').evaluate((gallery, id) => {
    const cards = [...gallery.querySelectorAll('.character-card')];
    const index = cards.findIndex((card) => card.dataset.characterJourney === id);
    const step = cards[0].getBoundingClientRect().width + parseFloat(getComputedStyle(gallery).columnGap);
    gallery.scrollTo({ left: index * step, behavior: 'instant' });
  }, id);
  await page.waitForFunction((id) => document.querySelector('#lifespan-rows .lifespan-row')?.dataset.lifeDetails === id, id);
}

export async function checkLifespans(browser, base) {
  const errors = [];
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
  page.on('pageerror', (error) => errors.push(error.message));
  try {
    await page.goto(base);
    await page.waitForSelector('.lifespan-row');
    const order = await page.locator('.character-card').evaluateAll((cards) => cards.map((card) => card.dataset.characterJourney));
    assert.equal(order.length, 24);
    assert.deepEqual(order.slice(0, 4), ['juno', 'jupiter', 'minerva', 'kassandra']);
    assert.ok(order.indexOf('edward') < order.indexOf('haytham') && order.indexOf('haytham') < order.indexOf('connor'));
    assert.match(await page.locator('[data-character-journey="ezio"] .character-dates').innerText(), /1459 CE[\s\S]*1524 CE/);
    assert.match(await page.locator('[data-character-journey="connor"] .character-dates').innerText(), /1756 CE[\s\S]*Unknown/);
    assert.match(await page.locator('[data-character-journey="jacobfrye"] .character-dates').innerText(), /1847 CE[\s\S]*Unknown/);
    assert.match(await page.locator('[data-character-journey="hytham"] .character-dates').innerText(), /850s CE/);
    assert.equal(await page.locator('#lifespan-break-note').isVisible(), true);
    assert.ok(await page.locator('[data-life-details="juno"] .is-recorded').count() > 0);

    await page.locator('#character-journeys').scrollIntoViewIfNeeded();
    await showCharacterWindow(page, 'edward');
    const shown = await page.locator('.lifespan-row').evaluateAll((rows) => rows.map((row) => row.dataset.lifeDetails));
    assert.deepEqual(shown, ['edward', 'haytham', 'connor', 'arno']);
    assert.equal(await page.locator('#lifespan-break-note').isVisible(), false);
    const bars = await page.locator('.lifespan-row').evaluateAll((rows) => Object.fromEntries(rows.map((row) => {
      const bar = row.querySelector('.lifespan-segment');
      const start = parseFloat(bar.style.left);
      return [row.dataset.lifeDetails, { start, end: start + parseFloat(bar.style.width) }];
    })));
    assert.ok(bars.haytham.start < bars.edward.end, 'Edward and Haytham overlap on a shared scale');
    assert.ok(bars.connor.start > bars.edward.end, 'The gap between Edward and Connor stays visible');
    assert.ok(bars.connor.start < bars.haytham.end, 'Haytham and Connor overlap');
    await page.locator('[data-character-journey="haytham"]').hover();
    assert.equal(await page.locator('.lifespan-row.is-overlapping').count(), 4);
    for (const id of shown) await page.locator(`[data-character-journey="${id}"] img`).evaluate((image) => image.decode());
    await page.locator('#character-journeys').screenshot({ path: 'output/character-lifespans-desktop.png' });

    await page.locator('.lifespan-row[data-life-details="connor"]').click();
    assert.equal(await page.locator('#info-title').innerText(), 'Connor');
    assert.match(await page.locator('#info-content').innerText(), /not claim that he died in 1783/);
    assert.ok(await page.locator('#info-content .lifespan-sources a').count() > 0);
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => document.activeElement?.dataset.lifeDetails === 'connor');
    await page.locator('[data-life-help]').click();
    assert.match(await page.locator('#info-content').innerText(), /birth years or the earliest known presence/);
    await page.keyboard.press('Escape');

    await page.locator('[data-character-journey="connor"]').click();
    assert.match(await page.locator('#memory-content .character-life-summary').innerText(), /1756 CE[\s\S]*Unknown/);
    assert.equal(await page.locator('.memory-year').count(), 0);
    await page.locator('#memory-content [data-life-details="connor"]').click();
    assert.equal(await page.locator('#info-title').innerText(), 'Connor');
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#memory-dialog').evaluate((dialog) => dialog.open), true);
    await page.keyboard.press('Escape');

    const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    mobile.on('pageerror', (error) => errors.push(error.message));
    await mobile.emulateMedia({ reducedMotion: 'reduce' });
    await mobile.goto(base);
    await mobile.waitForSelector('.lifespan-row');
    assert.equal(await mobile.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await showCharacterWindow(mobile, 'edward');
    assert.equal(await mobile.locator('.lifespan-row').count(), 2);
    await mobile.locator('#character-journeys').scrollIntoViewIfNeeded();
    for (const id of ['edward', 'haytham']) await mobile.locator(`[data-character-journey="${id}"] img`).evaluate((image) => image.decode());
    await mobile.locator('#character-journeys').screenshot({ path: 'output/character-lifespans-mobile.png' });
    await mobile.locator('.lifespan-row[data-life-details="haytham"]').click();
    assert.equal(await mobile.locator('#info-title').innerText(), 'Haytham Kenway');
    await mobile.keyboard.press('Escape');
    await mobile.close();
    assert.deepEqual(errors, []);
  } finally { await page.close(); }
}
