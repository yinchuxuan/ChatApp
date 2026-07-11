import { readSSEStream } from '../../src/chat/apiClient.js';
import { createTauriModelFetch } from '../../src/platform/tauriModelFetch.js';

class TestChannel {
  constructor() {
    TestChannel.latest = this;
  }
}

function createClient(handleStream) {
  return {
    Channel: TestChannel,
    invoke: jest.fn(async (command, args) => {
      if (command === 'stream_model_request') {
        queueMicrotask(() => handleStream(args.onEvent));
        return null;
      }
      if (command === 'cancel_model_stream') {
        queueMicrotask(() => TestChannel.latest.onmessage({ type: 'aborted' }));
        return true;
      }
      throw new Error(`unexpected command: ${command}`);
    })
  };
}

describe('Tauri model fetch', () => {
  test('adapts native channel bytes to the existing SSE parser', async () => {
    const encoder = new TextEncoder();
    const client = createClient(channel => {
      channel.onmessage({ type: 'response', status: 200 });
      channel.onmessage({
        type: 'chunk',
        bytes: [...encoder.encode('data: {"choices":[{"delta":{"content":"兼容"}}]}\n\n')]
      });
      channel.onmessage({ type: 'done' });
    });
    const response = await createTauriModelFetch(client)('https://model.example/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: 'Bearer key', 'Content-Type': 'application/json' },
      body: '{}'
    });
    const onToken = jest.fn();

    await readSSEStream(response.body.getReader(), 'openai', { onToken });

    expect(onToken).toHaveBeenCalledWith('兼容');
    expect(client.invoke).toHaveBeenCalledWith('stream_model_request', expect.objectContaining({
      request: expect.objectContaining({
        url: 'https://model.example/v1/chat/completions',
        method: 'POST',
        headers: expect.objectContaining({ authorization: 'Bearer key' })
      }),
      onEvent: expect.any(TestChannel)
    }));
  });

  test('maps AbortSignal to request-id cancellation', async () => {
    const client = createClient(() => {});
    const controller = new AbortController();
    const pending = createTauriModelFetch(client)('https://model.example/v1/messages', {
      method: 'POST', body: '{}', signal: controller.signal
    });

    controller.abort();

    await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
    const startCall = client.invoke.mock.calls.find(([command]) => command === 'stream_model_request');
    const cancelCall = client.invoke.mock.calls.find(([command]) => command === 'cancel_model_stream');
    expect(cancelCall[1].requestId).toBe(startCall[1].request.requestId);
  });

  test('preserves Anthropic thinking and text events', async () => {
    const encoder = new TextEncoder();
    const client = createClient(channel => {
      channel.onmessage({ type: 'response', status: 200 });
      channel.onmessage({
        type: 'chunk',
        bytes: [...encoder.encode(
          'data: {"type":"content_block_delta","delta":{"type":"thinking_delta","thinking":"思考"}}\n\n' +
          'data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"正文"}}\n\n'
        )]
      });
      channel.onmessage({ type: 'done' });
    });
    const response = await createTauriModelFetch(client)('https://model.example/v1/messages', {
      method: 'POST', body: '{}'
    });
    const callbacks = { onThinkingToken: jest.fn(), onToken: jest.fn() };

    await readSSEStream(response.body.getReader(), 'anthropic', callbacks);

    expect(callbacks.onThinkingToken).toHaveBeenCalledWith('思考');
    expect(callbacks.onToken).toHaveBeenCalledWith('正文');
  });

  test('exposes non-success response bodies to API error handling', async () => {
    const encoder = new TextEncoder();
    const client = createClient(channel => {
      channel.onmessage({ type: 'response', status: 401 });
      channel.onmessage({ type: 'chunk', bytes: [...encoder.encode('{"error":{"message":"bad key"}}')] });
      channel.onmessage({ type: 'done' });
    });
    const response = await createTauriModelFetch(client)('https://model.example/v1/messages', {
      method: 'POST', body: '{}'
    });

    expect(response.ok).toBe(false);
    await expect(response.json()).resolves.toEqual({ error: { message: 'bad key' } });
  });

  test('surfaces native errors after the response starts', async () => {
    const client = createClient(channel => {
      channel.onmessage({ type: 'response', status: 200 });
      channel.onmessage({ type: 'error', message: 'connection reset' });
    });
    const response = await createTauriModelFetch(client)('https://model.example/v1/messages', {
      method: 'POST', body: '{}'
    });

    await expect(response.body.getReader().read()).rejects.toThrow('connection reset');
  });
});
