import { tauriBridge } from './tauriBridge.js';

let fallbackRequestId = 0;

function createRequestId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  fallbackRequestId += 1;
  return `model-${Date.now()}-${fallbackRequestId}`;
}

function createAbortError() {
  const error = new Error('The model request was aborted');
  error.name = 'AbortError';
  return error;
}

function normalizeHeaders(headers) {
  return Object.fromEntries(new Headers(headers || {}).entries());
}

function createStreamResponse(stream, status) {
  let bodyUsed = false;
  const text = async () => {
    if (bodyUsed) throw new Error('Model response body has already been consumed');
    bodyUsed = true;
    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let content = '';
    let chunk;
    while (!(chunk = await reader.read()).done) {
      content += decoder.decode(chunk.value, { stream: true });
    }
    return content + decoder.decode();
  };
  return {
    body: stream,
    get bodyUsed() { return bodyUsed; },
    ok: status >= 200 && status < 300,
    status,
    text,
    json: async () => JSON.parse(await text())
  };
}

function createTauriModelFetch(client = tauriBridge) {
  return function tauriModelFetch(url, options = {}) {
    const requestId = createRequestId();
    const signal = options.signal;
    return new Promise((resolve, reject) => {
      let streamController;
      let responseStarted = false;
      let finished = false;
      let startRequest;
      const stream = new ReadableStream({ start: controller => { streamController = controller; } });
      const channel = new client.Channel();
      const cleanup = () => signal?.removeEventListener('abort', abort);
      const fail = (error) => {
        if (finished) return;
        finished = true;
        cleanup();
        if (responseStarted) streamController.error(error);
        else reject(error);
      };
      const abort = () => {
        startRequest?.then(() => client.invoke('cancel_model_stream', { requestId })).catch(() => {});
      };
      channel.onmessage = event => {
        if (event.type === 'response') {
          responseStarted = true;
          resolve(createStreamResponse(stream, event.status));
        } else if (event.type === 'chunk') {
          streamController.enqueue(Uint8Array.from(event.bytes));
        } else if (event.type === 'done') {
          finished = true;
          cleanup();
          streamController.close();
        } else if (event.type === 'aborted') {
          fail(createAbortError());
        } else if (event.type === 'error') {
          fail(new Error(event.message || 'Model request failed'));
        }
      };
      if (signal?.aborted) {
        fail(createAbortError());
        return;
      }
      signal?.addEventListener('abort', abort, { once: true });
      startRequest = client.invoke('stream_model_request', {
        request: {
          requestId,
          url: String(url),
          method: options.method || 'GET',
          headers: normalizeHeaders(options.headers),
          body: String(options.body || '')
        },
        onEvent: channel
      });
      startRequest.catch(error => fail(error instanceof Error ? error : new Error(String(error))));
    });
  };
}

export { createTauriModelFetch };
