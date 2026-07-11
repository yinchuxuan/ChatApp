import { createSSEParser } from '../../src/chat/sseParser.js';
import { sendChatRequest } from '../../src/chat/apiClient.js';

function responseFromChunks(chunks) {
  const encoder = new TextEncoder();
  let index = 0;
  return {
    ok: true,
    body: new ReadableStream({
      pull(controller) {
        if (index >= chunks.length) { controller.close(); return; }
        controller.enqueue(typeof chunks[index] === 'string' ? encoder.encode(chunks[index]) : chunks[index]);
        index += 1;
      }
    })
  };
}

const request = {
  apiUrl: 'https://example.com', apiKey: 'key', modelName: 'model',
  messages: [{ role: 'user', content: 'hello' }]
};

describe('incremental SSE parser', () => {
  test('supports CRLF, multi-line data, and an incomplete final delimiter', () => {
    const events = [];
    const parser = createSSEParser(event => events.push(event));
    parser.feed('event: note\r');
    parser.feed('\ndata: {"value":\r\ndata: 1}\r\n');
    parser.end();
    expect(events).toEqual([{ type: 'note', data: '{"value":\n1}' }]);
  });

  test('preserves UTF-8 split at every byte boundary', async () => {
    const bytes = new TextEncoder().encode('data: {"choices":[{"delta":{"content":"雪"}}]}\n\n');
    global.fetch.mockResolvedValue(responseFromChunks(Array.from(bytes, byte => Uint8Array.of(byte))));
    const onToken = jest.fn();
    await sendChatRequest(request, { onToken });
    expect(onToken).toHaveBeenCalledWith('雪');
  });

  test('parses a valid event left in the decoder tail', async () => {
    global.fetch.mockResolvedValue(responseFromChunks([
      'data: {"choices":[{"delta":{"content":"tail"}}]}'
    ]));
    const onToken = jest.fn();
    await sendChatRequest(request, { onToken });
    expect(onToken).toHaveBeenCalledWith('tail');
  });

  test('rejects invalid data and provider error events', async () => {
    global.fetch.mockResolvedValueOnce(responseFromChunks(['data: not-json\n\n']));
    await expect(sendChatRequest(request)).rejects.toThrow('Invalid SSE data');
    global.fetch.mockResolvedValueOnce(responseFromChunks([
      'event: error\ndata: {"error":{"message":"overloaded"}}\n\n'
    ]));
    await expect(sendChatRequest({ ...request, protocol: 'anthropic' })).rejects.toThrow('overloaded');
  });

  test('accepts an empty successful native stream', async () => {
    global.fetch.mockResolvedValue({ ok: true, body: null });
    await expect(sendChatRequest(request)).resolves.toBeUndefined();
  });
});
