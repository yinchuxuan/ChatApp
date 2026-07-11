const http = require('http');
const { createDevModelProxyHandler, MODEL_PROXY_PATH, TARGET_HEADER } = require('../../scripts/devModelProxy');

function listen(server) {
  return new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
}

function close(server) {
  return new Promise(resolve => server.close(resolve));
}

function post(port, headers = {}, body = '{}') {
  return new Promise((resolve, reject) => {
    const request = http.request({
      host: '127.0.0.1', port, path: MODEL_PROXY_PATH, method: 'POST', headers
    }, (response) => {
      const chunks = [];
      response.on('data', chunk => chunks.push(chunk));
      response.on('end', () => resolve({
        status: response.statusCode,
        headers: response.headers,
        body: Buffer.concat(chunks).toString('utf8')
      }));
    });
    request.on('error', reject);
    request.end(body);
  });
}

describe('Vite model API proxy', () => {
  let proxy;

  afterEach(async () => {
    if (proxy?.listening) await close(proxy);
  });

  test('forwards provider headers, body, status, and SSE data', async () => {
    let received;
    const fetchImpl = jest.fn(async (target, options) => {
      received = { target: String(target), headers: options.headers, body: options.body.toString() };
      return {
        status: 200,
        headers: { get: name => name === 'content-type' ? 'text/event-stream' : null },
        body: new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode('data: {"ok":true}\n\n'));
            controller.close();
          }
        })
      };
    });
    proxy = http.createServer(createDevModelProxyHandler(fetchImpl));
    await listen(proxy);
    const target = 'https://api.example.com/v1/chat/completions';

    const result = await post(proxy.address().port, {
      [TARGET_HEADER]: target,
      authorization: 'Bearer test-key',
      'content-type': 'application/json'
    }, '{"stream":true}');

    expect(result).toMatchObject({ status: 200, body: 'data: {"ok":true}\n\n' });
    expect(result.headers['content-type']).toBe('text/event-stream');
    expect(received.body).toBe('{"stream":true}');
    expect(received.headers.authorization).toBe('Bearer test-key');
    expect(received.headers[TARGET_HEADER]).toBeUndefined();
    expect(received.target).toBe(target);
  });

  test('rejects missing and unsupported targets without calling fetch', async () => {
    const fetchImpl = jest.fn();
    proxy = http.createServer(createDevModelProxyHandler(fetchImpl));
    await listen(proxy);

    const missing = await post(proxy.address().port);
    const unsupported = await post(proxy.address().port, { [TARGET_HEADER]: 'file:///tmp/key' });

    expect(missing.status).toBe(502);
    expect(unsupported.status).toBe(502);
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
