import { readdir, readFile, access } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

let checked = 0;
for (const directory of ['src', 'scripts', 'tests']) {
  for (const name of await readdir(directory)) {
    if (!/\.(js|mjs)$/.test(name)) continue;
    const result = spawnSync(process.execPath, ['--check', `${directory}/${name}`], { encoding: 'utf8' });
    if (result.status !== 0) { console.error(result.stderr); process.exit(1); }
    checked++;
  }
}
const html = await readFile('index.html', 'utf8');
const css = await readFile('src/styles.css', 'utf8');
for (const [, path] of html.matchAll(/(?:src|href)="(\.\/[^"#]+)"/g)) await access(resolve(path));
for (const [, path] of css.matchAll(/url\(['"]?(\.\.[^'"\)]+)['"]?\)/g)) await access(resolve('src', path));
const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
if (new Set(ids).size !== ids.length) throw new Error('Duplicate HTML IDs');
console.log(`Checks passed: ${checked} JavaScript files, unique HTML IDs, and local HTML/CSS asset references.`);
