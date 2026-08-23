const { ReadableStream } = require('stream/web');
const { TextEncoder } = require('util');
const { sendChatRequest } = require('../../src/renderer/chat/apiClient.js');

function streamingResponse(deltas) {
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      deltas.forEach(delta => controller.enqueue(encoder.encode(
        `data: ${JSON.stringify({ choices: [{ delta }] })}\n\n`
      )));
      controller.enqueue(encoder.encode('data: [DONE]\n\n'));
      controller.close();
    }
  });
  return { ok: true, body: { getReader: () => stream.getReader() } };
}

describe('sendChatRequest OpenAI-compatible reasoning', () => {
  test('normalizes legacy and OpenRouter reasoning chunks without duplication', async () => {
    global.fetch.mockResolvedValue(streamingResponse([
      { reasoning_content: 'legacy' },
      { reasoning: 'router' },
      {
        reasoning_details: [
          { type: 'reasoning.text', text: 'text' },
          { type: 'reasoning.summary', summary: [{ text: 'summary' }] },
          { type: 'reasoning.encrypted', data: 'secret' }
        ]
      },
      {
        reasoning: 'direct',
        reasoning_details: [{ type: 'reasoning.text', text: 'duplicate' }]
      },
      { content: 'answer' }
    ]));
    const onThinkingToken = jest.fn();
    const onToken = jest.fn();

    await sendChatRequest({
      apiUrl: 'https://openrouter.ai/api/v1', apiKey: 'key', modelName: 'model',
      messages: [{ role: 'user', content: 'hello' }]
    }, { onThinkingToken, onToken });

    expect(onThinkingToken.mock.calls.map(call => call[0])).toEqual([
      'legacy', 'router', 'textsummary', 'direct'
    ]);
    expect(onToken).toHaveBeenCalledWith('answer');
  });
});
