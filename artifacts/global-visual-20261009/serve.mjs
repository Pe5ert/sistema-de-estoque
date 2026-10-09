import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, extname, sep } from 'node:path';
const root = fileURLToPath(new URL('.', import.meta.url));
const types = { '.html':'text/html; charset=utf-8', '.jpg':'image/jpeg', '.md':'text/plain; charset=utf-8', '.json':'application/json' };
createServer(async (req,res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);
    const path = resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
    if (!path.startsWith(root.endsWith(sep) ? root : root + sep)) { res.writeHead(403).end(); return; }
    const content = await readFile(path);
    res.writeHead(200, { 'Content-Type':types[extname(path)] ?? 'application/octet-stream', 'Cache-Control':'no-store' }); res.end(content);
  } catch { res.writeHead(404).end('Not found'); }
}).listen(5190,'127.0.0.1',()=>console.log('GAVYO review: http://localhost:5190'));
