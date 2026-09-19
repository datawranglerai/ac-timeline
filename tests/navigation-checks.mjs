import assert from 'node:assert/strict';

async function range(page) {
  return page.locator('#overview-selection').evaluate((selection) => [parseFloat(selection.style.left) / 100, parseFloat(selection.style.width) / 100]);
}

function assertRange([start, span]) {
  assert.ok(Number.isFinite(start) && Number.isFinite(span));
  assert.ok(start >= 0 && span >= 0.001 - 1e-7 && start + span <= 1 + 1e-7);
}

async function wheelBurst(page, options = {}) {
  return page.locator('#timeline-viewport').evaluate((viewport, options) => new Promise((resolve) => {
    const { count = 80, dx = 0, dy = -100, deltaMode = 0, reverse = false, pinch = true, interrupt } = options;
    const rect = viewport.getBoundingClientRect();
    const dispatch = (sign) => viewport.dispatchEvent(new WheelEvent('wheel', {
      bubbles: true, cancelable: true, deltaX: dx * sign, deltaY: dy * sign, deltaMode,
      clientX: rect.left + rect.width / 2, clientY: rect.top + 20, ctrlKey: pinch,
    }));
    for (let index = 0; index < count; index++) dispatch(1);
    if (reverse) for (let index = 0; index < count; index++) dispatch(-1);
    if (interrupt === 'reset') document.querySelector('#reset-view').click();
    if (interrupt === 'era') document.querySelector('[data-era="renaissance"]').click();
    if (interrupt === 'scale') {
      const select = document.querySelector('#scale-mode');
      select.value = 'linear';
      select.dispatchEvent(new Event('change', { bubbles: true }));
    }
    if (interrupt === 'filter') {
      const search = document.querySelector('#search');
      search.value = 'Yasuke';
      search.dispatchEvent(new Event('input', { bubbles: true }));
    }
    const selection = document.querySelector('#overview-selection');
    const current = () => [parseFloat(selection.style.left) / 100, parseFloat(selection.style.width) / 100];
    const immediate = current();
    requestAnimationFrame(() => requestAnimationFrame(() => resolve({ immediate, settled: current() })));
  }), options);
}

export async function checkFastNavigation(page, { mobile = false } = {}) {
  await page.locator('#timeline-viewport').scrollIntoViewIfNeeded();

  for (const mode of ['adaptive', 'linear']) {
    await page.locator('#scale-mode').selectOption(mode);
    await page.locator('#reset-view').click();
    const before = await page.locator('#timeline-viewport').boundingBox();
    const result = await page.locator('#timeline-viewport').evaluate(async (viewport) => {
      const ranges = [];
      for (let frame = 0; frame < 42; frame++) {
        const rect = viewport.getBoundingClientRect();
        for (let event = 0; event < 64; event++) viewport.dispatchEvent(new WheelEvent('wheel', {
          bubbles: true, cancelable: true, deltaY: -1000,
          clientX: rect.left + rect.width / 2, clientY: rect.top + 20, ctrlKey: true,
        }));
        await new Promise((resolve) => requestAnimationFrame(resolve));
        const selection = document.querySelector('#overview-selection');
        ranges.push([parseFloat(selection.style.left) / 100, parseFloat(selection.style.width) / 100]);
      }
      return ranges;
    });
    result.forEach(assertRange);
    assert.equal(await page.locator('#timeline-view').isVisible(), true);
    assert.equal(await page.locator('#empty-state').isVisible(), false);
    assert.equal(await page.locator('#timeline-gap').isVisible(), true);
    assert.equal(await page.locator('#zoom-out').isEnabled(), true);
    assert.equal(await page.locator('#overview').isVisible(), true);
    const after = await page.locator('#timeline-viewport').boundingBox();
    assert.equal(after.height, before.height, 'Empty periods must not collapse the plot under the pointer');
    await page.locator('#timeline-viewport').focus();
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowLeft');
    assertRange(await range(page));
    if (mode === 'adaptive') await page.screenshot({ path: `output/navigation-gap-${mobile ? 'mobile' : 'desktop'}.png` });
    await page.keyboard.press('Home');
    assert.deepEqual(await range(page), [0, 1]);
  }

  await page.locator('#scale-mode').selectOption('adaptive');
  await page.locator('#reset-view').click();
  const reversed = await wheelBurst(page, { count: 200, dy: -10, reverse: true });
  assert.deepEqual(reversed.settled, [0, 1], 'Opposing events in the same frame cancel, rather than dropping one direction');
  const burst = await wheelBurst(page, { count: 500, dy: -10000 });
  assert.ok(burst.settled[1] > 0.8 && burst.settled[1] < 1, 'One oversized burst has a bounded effect');
  await page.locator('#reset-view').click();
  const pixels = await wheelBurst(page, { count: 1, dy: -16 });
  await page.locator('#reset-view').click();
  const lines = await wheelBurst(page, { count: 1, dy: -1, deltaMode: 1 });
  assert.deepEqual(lines.settled, pixels.settled, 'Line and pixel wheel modes produce equivalent movement');
  const pages = await wheelBurst(page, { count: 10, dy: -1, deltaMode: 2 });
  assertRange(pages.settled);
  const beforePan = await range(page);
  const horizontal = await wheelBurst(page, { dx: 10000, dy: 0, pinch: false });
  assertRange(horizontal.settled);
  assert.equal(horizontal.settled[1], beforePan[1]);
  assert.ok(horizontal.settled[0] > beforePan[0]);
  assert.ok(horizontal.settled[0] - beforePan[0] <= beforePan[1] * 0.2);

  for (const interrupt of ['reset', 'era', 'scale', 'filter']) {
    await page.locator('#reset-view').click();
    const interrupted = await wheelBurst(page, { interrupt });
    assert.deepEqual(interrupted.settled, interrupted.immediate, `Pending wheel input must not override ${interrupt}`);
  }
  await page.locator('#clear-filters').click();
  await page.locator('#scale-mode').selectOption('adaptive');
  await page.locator('#reset-view').click();

  await page.locator('[data-filter="games"] summary').click();
  const shadows = page.locator(`input[name="games"][value="Assassin's Creed Shadows"]`);
  await shadows.check();
  await page.locator('[data-era="isu"]').click();
  assert.equal(await page.locator('#timeline-gap').isVisible(), true);
  assert.equal(await page.locator('#empty-state').isVisible(), false);
  await page.locator('#timeline-gap button').click();
  assert.equal(await shadows.isChecked(), true);
  assert.match(await page.locator('#visible-status').innerText(), /9 of 96/);
  await page.locator('[data-era="isu"]').click();
  await page.getByRole('button', { name: 'Chronological list view', exact: true }).click();
  await page.locator('#empty-state').getByRole('button', { name: 'Show matching memories', exact: true }).click();
  assert.equal(await shadows.isChecked(), true);
  assert.equal(await page.locator('.list-memory').count(), 9);
  await page.locator('#clear-filters').click();
  await page.getByRole('button', { name: 'Timeline view', exact: true }).click();
  await page.locator('#reset-view').click();

  if (!mobile) {
    await page.locator('#zoom-in').click();
    await page.locator('#timeline-viewport').scrollIntoViewIfNeeded();
    const rect = await page.locator('#timeline-viewport').boundingBox();
    await page.locator('#timeline-viewport').focus();
    await page.mouse.move(rect.x + rect.width * 0.5, rect.y + 20);
    await page.mouse.down();
    await page.mouse.move(rect.x + rect.width * 0.3, rect.y + 20, { steps: 12 });
    await page.keyboard.press('Home');
    await page.mouse.move(rect.x + rect.width * 0.8, rect.y + 20, { steps: 12 });
    await page.mouse.up();
    assert.deepEqual(await range(page), [0, 1], 'A cancelled drag cannot restore a pre-reset viewport');
    assert.equal(await page.locator('#timeline-viewport').evaluate((viewport) => viewport.classList.contains('dragging')), false);
  }
}
