import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';

const args = process.argv.slice(2);
const root = resolve(args.includes('--dist') ? 'dist' : '.');
const option = (name, fallback) => args.includes(name) ? args[args.indexOf(name) + 1] : fallback;
const port = Number(option('--port', process.env.PORT || 5173));
const host = option('--host', '127.0.0.1');
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.csv': 'text/csv; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2' };

const server = createServer(async (request, response) => {
  try {
    if (!['GET', 'HEAD'].includes(request.method)) { response.writeHead(405, { Allow: 'GET, HEAD' }); response.end(); return; }
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    const relative = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
    const file = resolve(root, relative);
    const allowed = relative === 'index.html' || ['src/', 'assets/', 'images/', 'data/'].some((prefix) => relative.startsWith(prefix));
    if (!allowed || !file.startsWith(root + sep) || relative.split('/').some((part) => part.startsWith('.'))) { response.writeHead(404); response.end('Not found'); return; }
    if (!(await stat(file)).isFile()) { response.writeHead(404); response.end('Not found'); return; }
    const content = await readFile(file);
    response.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream', 'Content-Length': content.length, 'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff' });
    response.end(request.method === 'HEAD' ? undefined : content);
  } catch (error) {
    response.writeHead(error instanceof URIError ? 400 : 404);
    response.end(error instanceof URIError ? 'Invalid URL' : 'Not found');
  }
});
server.on('error', (error) => { console.error(`Cannot start the archive: ${error.message}`); process.exitCode = 1; });
server.listen(port, host, () => console.log(`The Animus Archive is available at http://${host}:${port}${args.includes('--dist') ? ' (production build)' : ''}`));
