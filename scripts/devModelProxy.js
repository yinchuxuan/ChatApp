const MODEL_PROXY_PATH = '/__chatapp_model_proxy';
const TARGET_HEADER = 'x-chatapp-target-url';
const FORWARDED_REQUEST_HEADERS = [
  'authorization', 'content-type', 'x-api-key', 'anthropic-version'
];
const FORWARDED_RESPONSE_HEADERS = ['content-type', 'cache-control'];

function readTarget(request) {
  const value = request.headers[TARGET_HEADER];
  if (typeof value !== 'string') throw new Error('Missing model API target');
  const target = new URL(value);
  if (!['http:', 'https:'].includes(target.protocol)) throw new Error('Unsupported model API protocol');
  return target;
}

function copyRequestHeaders(request) {
  return Object.fromEntries(FORWARDED_REQUEST_HEADERS
    .filter(name => typeof request.headers[name] === 'string')
    .map(name => [name, request.headers[name]]));
}

function copyResponseHeaders(upstream, response) {
  FORWARDED_RESPONSE_HEADERS.forEach((name) => {
    const value = upstream.headers.get(name);
    if (value) response.setHeader(name, value);
  });
}

async function readRequestBody(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks);
}

async function pipeResponseBody(upstream, response) {
  if (!upstream.body) return response.end();
  const reader = upstream.body.getReader();
  let done = false;
  try {
    while (!done) {
      const chunk = await reader.read();
      done = chunk.done;
      const { value } = chunk;
      if (done) continue;
      response.write(Buffer.from(value));
    }
    response.end();
  } finally {
    reader.releaseLock();
  }
}

function writeProxyError(response, error) {
  if (response.headersSent) return response.destroy(error);
  response.statusCode = 502;
  response.setHeader('content-type', 'application/json');
  response.end(JSON.stringify({ error: { message: `Model API proxy failed: ${error.message}` } }));
}

function createDevModelProxyHandler(fetchImpl = fetch) {
  return async function devModelProxy(request, response, next = () => {}) {
    if (new URL(request.url, 'http://localhost').pathname !== MODEL_PROXY_PATH) return next();
    if (request.method !== 'POST') {
      response.statusCode = 405;
      return response.end();
    }
    try {
      const target = readTarget(request);
      const controller = new AbortController();
      request.once('aborted', () => controller.abort());
      response.once('close', () => {
        if (!response.writableEnded) controller.abort();
      });
      const upstream = await fetchImpl(target, {
        method: 'POST',
        headers: copyRequestHeaders(request),
        body: await readRequestBody(request),
        signal: controller.signal
      });
      response.statusCode = upstream.status;
      copyResponseHeaders(upstream, response);
      return await pipeResponseBody(upstream, response);
    } catch (error) {
      return writeProxyError(response, error);
    }
  };
}

function createDevModelProxyPlugin() {
  return {
    name: 'chatapp-model-api-proxy',
    configureServer(server) {
      server.middlewares.use(createDevModelProxyHandler());
    }
  };
}

module.exports = {
  MODEL_PROXY_PATH,
  TARGET_HEADER,
  createDevModelProxyHandler,
  createDevModelProxyPlugin
};
