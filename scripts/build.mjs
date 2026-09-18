import { cp, mkdir, rm, stat } from 'node:fs/promises';

await rm('dist', { recursive: true, force: true });
await mkdir('dist/data', { recursive: true });
for (const path of ['index.html', 'src', 'assets', 'images']) await cp(path, `dist/${path}`, { recursive: true });
await cp("data/Assassin's Creed Timeline - Data.csv", "dist/data/Assassin's Creed Timeline - Data.csv");
const size = (await stat('assets/florence-hero.jpg')).size;
console.log(`Built dist/ — static files, no runtime dependencies. Hero: ${Math.round(size / 1024)} KB.`);
