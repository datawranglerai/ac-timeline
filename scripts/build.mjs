import { cp, mkdir, rm, stat } from 'node:fs/promises';
import { DATASET_PATH } from '../src/data.js';

await rm('dist', { recursive: true, force: true });
await mkdir('dist/data', { recursive: true });
for (const path of ['index.html', 'src', 'assets', 'images']) await cp(path, `dist/${path}`, { recursive: true });
await cp(DATASET_PATH, `dist/${DATASET_PATH}`);
const size = (await stat("assets/ps5-screenshots/Assassin's Creed® Mirage/Assassin's Creed® Mirage_20231221145000.jpg")).size;
console.log(`Built dist/ — static files, no runtime dependencies. Hero: ${Math.round(size / 1024)} KB.`);
