import assert from 'node:assert/strict';

export async function checkCharacterMedia(browser, base) {
  const errors = [];
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const gifRequests = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('request', (request) => { if (/\/GIFs\/.*\.gif/.test(request.url())) gifRequests.push(request.url()); });
  try {
    await page.goto(base);
    await page.waitForSelector('.memory-marker.has-portrait');
    await page.locator('.character-portrait').evaluateAll((images) => Promise.all(images.map((image) => image.decode())));
    assert.equal(gifRequests.length, 0, 'Timeline and gallery must not preload animated GIFs');
    assert.equal(await page.locator('.character-card').count(), 24);
    assert.ok(await page.locator('.memory-marker:not(.has-portrait)').count() > 0);

    await page.locator('#search').fill('Shroud of Eden Created');
    assert.equal(await page.locator('.memory-marker').count(), 1);
    assert.equal(await page.locator('.memory-marker.has-portrait').count(), 0);
    await page.locator('.memory-marker').click();
    assert.equal(await page.locator('.memory-gif').count(), 0);
    await page.keyboard.press('Escape');

    await page.locator('#search').fill('Ezio is Born');
    const ezio = page.locator('.memory-marker.has-portrait');
    assert.equal(await ezio.count(), 1);
    assert.match(await ezio.locator('img').getAttribute('src'), /portraits\/ezio\.png$/);
    await ezio.locator('img').evaluate((image) => image.decode());
    assert.deepEqual(await ezio.locator('img').evaluate((image) => [image.naturalWidth, image.naturalHeight]), [256, 256]);
    const gifResponse = page.waitForResponse((response) => response.url().endsWith('/GIFs/ezio.gif'));
    await ezio.click();
    assert.equal((await gifResponse).headers()['content-type'], 'image/gif');
    await page.locator('.memory-gif').evaluate((image) => image.decode());
    assert.match(await page.locator('.memory-gif').getAttribute('src'), /GIFs\/ezio\.gif$/);
    assert.equal(await page.locator('.memory-marker.is-selected.has-portrait').count(), 1);
    await page.screenshot({ path: 'output/character-memory-desktop.png' });
    await page.getByRole('button', { name: 'Pause character animation', exact: true }).click();
    assert.match(await page.locator('.memory-gif').getAttribute('src'), /posters\/ezio\.webp$/);
    assert.equal(await page.evaluate(() => document.activeElement.dataset.action), 'toggle-animation');
    await page.getByRole('button', { name: 'Play character animation', exact: true }).click();
    assert.match(await page.locator('.memory-gif').getAttribute('src'), /GIFs\/ezio\.gif$/);
    await page.keyboard.press('Escape');
    await page.waitForFunction(() => !document.querySelector('#memory-content img'));

    await page.locator('#clear-filters').click();
    await page.locator('#character-gallery').scrollIntoViewIfNeeded();
    const before = await page.locator('#character-gallery').evaluate((gallery) => gallery.scrollLeft);
    await page.getByRole('button', { name: 'Next characters', exact: true }).click();
    await page.waitForFunction((before) => document.querySelector('#character-gallery').scrollLeft > before, before);
    await page.locator('[data-character-journey="naoe"]').click();
    assert.match(await page.locator('#visible-status').innerText(), /7 of 96/);
    assert.equal(await page.locator('input[name="characters"][value="Fujibayashi Naoe"]').isChecked(), true);
    assert.equal(await page.locator('input[name="characters"][value="Fujibayashi Naoe; Yasuke"]').count(), 0);
    assert.equal(await page.locator('#characters-label').innerText(), 'Characters · 1');
    await page.screenshot({ path: 'output/character-journey-desktop.png', fullPage: true });

    const quiet = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    quiet.on('pageerror', (error) => errors.push(error.message));
    await quiet.emulateMedia({ reducedMotion: 'reduce' });
    const quietGifs = [];
    quiet.on('request', (request) => { if (/\/GIFs\/.*\.gif/.test(request.url())) quietGifs.push(request.url()); });
    await quiet.goto(base);
    await quiet.waitForSelector('.memory-marker');
    assert.equal(await quiet.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await quiet.locator('#search').fill('Naoe and Yasuke become allies');
    assert.equal(await quiet.locator('.memory-marker .character-portrait').count(), 2);
    await quiet.locator('.memory-marker').click();
    await quiet.locator('.memory-gif').evaluate((image) => image.decode());
    assert.match(await quiet.locator('.memory-gif').getAttribute('src'), /posters\/naoe\.webp$/);
    assert.equal(quietGifs.length, 0, 'Reduced motion uses static posters without fetching GIFs');
    await quiet.locator('[data-memory-media="yasuke"]').click();
    await quiet.locator('.memory-gif').evaluate((image) => image.decode());
    assert.match(await quiet.locator('.memory-gif').getAttribute('src'), /posters\/yasuke\.webp$/);
    assert.equal(await quiet.evaluate(() => document.activeElement.dataset.memoryMedia), 'yasuke');
    await quiet.screenshot({ path: 'output/character-memory-mobile.png' });
    await quiet.getByRole('button', { name: 'Play character animation', exact: true }).click();
    assert.match(await quiet.locator('.memory-gif').getAttribute('src'), /GIFs\/yasuke\.gif$/);
    assert.ok(quietGifs.length > 0);
    await quiet.keyboard.press('Escape');
    await quiet.waitForFunction(() => !document.querySelector('#memory-content img'));
    await quiet.close();

    const broken = await browser.newPage();
    broken.on('pageerror', (error) => errors.push(error.message));
    await broken.route('**/portraits/ezio.png', (route) => route.abort());
    await broken.route('**/GIFs/ezio.gif', (route) => route.abort());
    await broken.goto(base);
    await broken.waitForSelector('.memory-marker');
    await broken.locator('#search').fill('Ezio is Born');
    await broken.waitForFunction(() => document.querySelectorAll('.memory-marker').length === 1 && !document.querySelector('.memory-marker.has-portrait'));
    await broken.locator('.memory-marker').click();
    await broken.waitForFunction(() => document.querySelector('.memory-gif')?.getAttribute('src').endsWith('/posters/ezio.webp'));
    await broken.locator('.memory-gif').evaluate((image) => image.decode());
    assert.equal(await broken.locator('#memory-title').innerText(), 'Ezio is Born');
    await broken.close();

    await page.emulateMedia({ reducedMotion: 'reduce' });
    for (const [id, name] of [['connor', 'Connor'], ['minerva', 'Minerva'], ['jupiter', 'Jupiter']]) {
      const card = page.locator(`[data-character-journey="${id}"]`);
      assert.match(await card.innerText(), /NO MEMORIES YET/);
      await card.click();
      assert.equal(await page.locator('#memory-title').innerText(), name);
      assert.match(await page.locator('.memory-description').innerText(), /timeline entries haven’t been added yet/);
      assert.equal(await page.locator('.memory-year').count(), 0, 'Character previews must not invent event dates');
      assert.equal(await page.locator('.memory-marker.is-selected').count(), 0);
      if (id === 'jupiter') {
        assert.equal(await page.locator('.memory-gif').count(), 0);
        await page.locator('.character-profile-art img').evaluate((image) => image.decode());
      } else {
        assert.match(await page.locator('.memory-gif').getAttribute('src'), new RegExp(`/posters/${id}\\.webp$`));
        await page.locator('.memory-gif').evaluate((image) => image.decode());
      }
      await page.getByRole('button', { name: 'Close character details', exact: true }).click();
      await page.waitForFunction(() => !document.querySelector('#memory-dialog').open);
      assert.equal(await card.evaluate((element) => document.activeElement === element), true);
      assert.match(await page.locator('#visible-status').innerText(), /7 of 96/, 'Previewing unrecorded characters must preserve the current timeline');
    }
    assert.deepEqual(errors, []);
  } finally { await page.close(); }
}
