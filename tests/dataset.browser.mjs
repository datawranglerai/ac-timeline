import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { createServer } from 'node:net';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';
import { DATASET_PATH, loadEvents } from '../src/data.js';
import { characterLabelsForEvent } from '../src/characters.js';

// Optional dependency-free smoke: Node 22+ supplies the native WebSocket client.
assert.equal(typeof WebSocket, 'function', 'dataset.browser.mjs requires Node 22+ or another runtime with native WebSocket');
const cachedChromium = join(homedir(), 'Library/Caches/ms-playwright/chromium_headless_shell-1217/chrome-headless-shell-mac-arm64/chrome-headless-shell');
const chromium = process.env.BROWSER_EXECUTABLE
  || (existsSync(cachedChromium) ? cachedChromium : '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome');
assert.ok(existsSync(chromium), 'Set BROWSER_EXECUTABLE to a Chromium-compatible browser');
const csv = await readFile(new URL(`../${DATASET_PATH}`, import.meta.url), 'utf8');
const { events, warnings } = loadEvents(csv);
assert.deepEqual(warnings, [], 'The published dataset must load without recovery warnings');
const connorCount = events.filter((event) => characterLabelsForEvent(event).includes('Ratonhnhaké:ton')).length;
const undated = events.find((event) => event.dateStatus === 'Undated' && /Eivor/i.test(event.character) && /burial/i.test(event.title))
  || events.find(({ dateStatus }) => dateStatus === 'Undated');
assert.ok(connorCount > 0, 'The published dataset must expose Connor through his canonical name');
assert.ok(undated, 'The published dataset must include an explicitly undated record');

function freePort() {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      server.close((error) => error ? reject(error) : resolve(port));
    });
  });
}

async function waitFor(url, attempts = 100) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await fetch(url);
      if (response.ok) return response;
    } catch { /* Process startup is expected to race the first requests. */ }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  throw new Error(`Timed out waiting for ${url}`);
}

class CDP {
  constructor(url) {
    this.socket = new WebSocket(url);
    this.sequence = 0;
    this.pending = new Map();
    this.events = new Map();
    this.socket.addEventListener('message', ({ data }) => {
      const message = JSON.parse(data);
      if (message.id) {
        const pending = this.pending.get(message.id);
        this.pending.delete(message.id);
        if (message.error) pending.reject(new Error(message.error.message));
        else pending.resolve(message.result);
      } else {
        for (const listener of this.events.get(message.method) || []) listener(message.params);
      }
    });
  }

  async open() {
    if (this.socket.readyState === WebSocket.OPEN) return;
    await new Promise((resolve, reject) => {
      this.socket.addEventListener('open', resolve, { once: true });
      this.socket.addEventListener('error', reject, { once: true });
    });
  }

  send(method, params = {}) {
    const id = ++this.sequence;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }

  on(method, listener) {
    const listeners = this.events.get(method) || [];
    listeners.push(listener);
    this.events.set(method, listeners);
  }

  close() { this.socket.close(); }
}

async function evaluate(cdp, expression) {
  const result = await cdp.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
  return result.result.value;
}

async function loadAt(cdp, url, width, height) {
  await cdp.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width < 600 });
  await cdp.send('Page.navigate', { url });
  await evaluate(cdp, `new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('App did not load')), 10000);
    const check = () => {
      if (document.querySelector('.memory-marker') && document.querySelector('#loading-state')?.hidden) {
        clearTimeout(timeout); resolve(true); return;
      }
      requestAnimationFrame(check);
    };
    check();
  })`);
}

const appPort = await freePort();
const debugPort = await freePort();
const profile = await mkdtemp(join(tmpdir(), 'ac-timeline-cdp-'));
const server = spawn(process.execPath, ['scripts/dev.mjs', '--port', String(appPort)], { stdio: 'ignore' });
const browser = spawn(chromium, [
  '--headless', '--no-first-run', '--no-default-browser-check', '--disable-background-networking',
  '--disable-component-update', '--disable-sync', '--metrics-recording-only',
  '--host-resolver-rules=MAP * 0.0.0.0, EXCLUDE localhost',
  `--remote-debugging-port=${debugPort}`, `--user-data-dir=${profile}`, 'about:blank',
], { stdio: 'ignore' });

let cdp;
try {
  const base = `http://127.0.0.1:${appPort}`;
  await waitFor(base);
  const targets = await (await waitFor(`http://127.0.0.1:${debugPort}/json/list`)).json();
  const target = targets.find(({ type }) => type === 'page');
  assert.ok(target?.webSocketDebuggerUrl, 'Chromium exposed a debuggable page');
  cdp = new CDP(target.webSocketDebuggerUrl);
  await cdp.open();
  const exceptions = [];
  cdp.on('Runtime.exceptionThrown', ({ exceptionDetails }) => exceptions.push(exceptionDetails.exception?.description || exceptionDetails.text));
  await cdp.send('Runtime.enable');
  await cdp.send('Page.enable');
  await cdp.send('Network.enable');
  await cdp.send('Network.setBlockedURLs', { urls: ['*goatcounter.com/*', '*gc.zgo.at/*', '*buymeacoffee.com/*'] });

  await loadAt(cdp, base, 1440, 1100);
  assert.deepEqual(await evaluate(cdp, `({
    count: Number(document.querySelector('#memory-total').textContent),
    overflow: document.documentElement.scrollWidth > innerWidth,
    connor: document.querySelector('[data-character-journey="connor"] small').textContent,
  })`), { count: events.length, overflow: false, connor: `${connorCount} ${connorCount === 1 ? 'MEMORY' : 'MEMORIES'}` });

  const connor = await evaluate(cdp, `(async () => {
    document.querySelector('[data-character-journey="connor"]').click();
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    return {
      checked: document.querySelector('input[name="characters"]:checked')?.value,
      memories: document.querySelectorAll('.memory-marker').length,
      status: document.querySelector('#visible-status').textContent,
    };
  })()`);
  assert.equal(connor.checked, 'Ratonhnhaké:ton');
  assert.ok(connor.memories > 0);
  assert.match(connor.status, new RegExp(`${connorCount} of ${events.length}`));

  const undatedResult = await evaluate(cdp, `(async () => {
    document.querySelector('#clear-filters').click();
    document.querySelector('#reset-view').click();
    document.querySelector('[data-view="list"]').click();
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const row = document.querySelector('[data-event="${undated.id}"]');
    const listDate = row.querySelector('.list-date').textContent;
    row.click();
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    return {
      listDate,
      detailDate: document.querySelector('.memory-year').textContent,
      metadata: document.querySelector('.memory-meta').textContent,
    };
  })()`);
  assert.match(undatedResult.listDate, /^Undated · placed at c\./);
  assert.equal(undatedResult.detailDate, undatedResult.listDate);
  assert.match(undatedResult.metadata, /event date is unknown; the year only positions this record on the chart/);

  await loadAt(cdp, base, 390, 844);
  assert.deepEqual(await evaluate(cdp, `({
    count: Number(document.querySelector('#memory-total').textContent),
    overflow: document.documentElement.scrollWidth > innerWidth,
  })`), { count: events.length, overflow: false });
  assert.deepEqual(exceptions, []);
  console.log(JSON.stringify({ records: events.length, connorMemories: connorCount, undated: undated.title, widths: [1440, 390], pageErrors: exceptions }));
} finally {
  cdp?.close();
  browser.kill('SIGTERM');
  server.kill('SIGTERM');
  await rm(profile, { recursive: true, force: true });
}
