import { createServer } from 'node:http';
import { knowledge } from './knowledge.mjs';
import { metadata, resolveAssessment } from './resolver.mjs';

const host = process.env.HOST || '127.0.0.1';
const port = Number(process.env.PORT || 8787);
const corsHeaders = request => request.headers.origin === 'https://localhost'
  ? { 'access-control-allow-origin': 'https://localhost', 'vary': 'Origin' }
  : {};
const json = (response, status, body) => {
  response.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...response.corsHeaders });
  response.end(JSON.stringify(body));
};

createServer(async (request, response) => {
  try {
    response.corsHeaders = corsHeaders(request);
    const path = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`).pathname;
    if (request.method === 'OPTIONS' && path.startsWith('/api/')) {
      response.writeHead(204, { ...response.corsHeaders, 'access-control-allow-methods': 'GET, POST, OPTIONS', 'access-control-allow-headers': 'Content-Type' });
      return response.end();
    }
    if (request.method === 'GET' && path === '/api/health') return json(response, 200, { ok: true, database_version: knowledge().database_version });
    if (request.method === 'GET' && path === '/api/meta') return json(response, 200, metadata(knowledge()));
    if (request.method === 'POST' && path === '/api/resolve') {
      let raw = '';
      for await (const chunk of request) {
        raw += chunk;
        if (raw.length > 65536) throw new RangeError('Request body too large');
      }
      const input = JSON.parse(raw || '{}');
      return json(response, 200, resolveAssessment(knowledge(), input));
    }
    return json(response, 404, { error: 'Not found' });
  } catch (error) {
    const status = error instanceof RangeError || error instanceof SyntaxError ? 400 : 500;
    if (status === 500) console.error(error);
    return json(response, status, { error: status === 400 ? error.message : 'Server error' });
  }
}).listen(port, host, () => console.log(`RehabMind API listening on http://${host}:${port}`));
