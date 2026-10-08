import http from 'node:http';
// QA only: localhost:3012 -> localhost:3011, discard the first successful
// receipt response AFTER consuming the backend reply (transaction committed).
// This tests the real unknown-result UI without mocking browser state.
let drop = true;
http.createServer((request, response) => {
  const upstream = http.request({ hostname: '127.0.0.1', port: 3011, path: request.url, method: request.method, headers: { ...request.headers, host: 'localhost:3011' } }, reply => {
    if (drop && request.method === 'POST' && /\/receipts$/.test(request.url ?? '') && reply.statusCode === 201) {
      drop = false; reply.resume(); reply.on('end', () => { response.destroy(); console.log('QA: one committed receipt response discarded.'); });
    } else { response.writeHead(reply.statusCode ?? 502, reply.headers); reply.pipe(response); }
  });
  upstream.on('error', () => { response.writeHead(503, { 'Access-Control-Allow-Origin': 'http://localhost:5175', 'Access-Control-Allow-Credentials': 'true', 'Content-Type': 'application/json' }); response.end('{}'); }); request.pipe(upstream);
}).listen(3012, '127.0.0.1', () => console.log('QA response-loss proxy ready on loopback:3012.'));
