// Shared streaming mock helpers for tests
const { ReadableStream } = require('stream/web');
const { TextEncoder } = require('util');

function createStreamingMock(content) {
  const chunks = content.split(/(?=\s)/);
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      for (const chunk of chunks) {
        const escaped = chunk.replace(/"/g, '\\"');
        controller.enqueue(encoder.encode(`data: {"choices":[{"delta":{"content":"${escaped}"}}]}\n`));
      }
      controller.enqueue(encoder.encode('data: [DONE]\n'));
      controller.close();
    }
  });
  return {
    ok: true,
    body: { getReader: () => stream.getReader() },
    json: async () => ({ choices: [{ message: { content } }] })
  };
}

function createThinkingStreamingMock(thinkingContent, responseContent) {
  const full = `<thinking>${thinkingContent}</thinking>${responseContent}`;
  const chunks = full.split(/(?=\s)/);
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      for (const chunk of chunks) {
        const escaped = chunk.replace(/"/g, '\\"');
        controller.enqueue(encoder.encode(`data: {"choices":[{"delta":{"content":"${escaped}"}}]}\n`));
      }
      controller.enqueue(encoder.encode('data: [DONE]\n'));
      controller.close();
    }
  });
  return {
    ok: true,
    body: { getReader: () => stream.getReader() },
    json: async () => ({ choices: [{ message: { content: responseContent } }] })
  };
}

function createSimpleStreamingMock(content) {
  const chunks = content.split(/(?=\s)/);
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      for (const chunk of chunks) {
        const escaped = chunk.replace(/"/g, '\\"');
        controller.enqueue(encoder.encode(`data: {"choices":[{"delta":{"content":"${escaped}"}}]}\n`));
      }
      controller.enqueue(encoder.encode('data: [DONE]\n'));
      controller.close();
    }
  });
  return {
    ok: true,
    body: { getReader: () => stream.getReader() },
    json: async () => ({ choices: [{ message: { content } }] })
  };
}

function createAnthropicStreamingMock(content) {
  const chunks = content.split(/(?=\s)/);
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      controller.enqueue(encoder.encode('event: message_start\ndata: {"type":"message_start","message":{"id":"msg_test"}}\n\n'));
      controller.enqueue(encoder.encode('event: content_block_start\ndata: {"type":"content_block_start","index":0,"content_block":{"type":"text","text":""}}\n\n'));
      for (const chunk of chunks) {
        const escaped = chunk.replace(/"/g, '\\"');
        controller.enqueue(encoder.encode(`event: content_block_delta\ndata: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"${escaped}"}}\n\n`));
      }
      controller.enqueue(encoder.encode('event: content_block_stop\ndata: {"type":"content_block_stop","index":0}\n\n'));
      controller.enqueue(encoder.encode('event: message_delta\ndata: {"type":"message_delta","delta":{"stop_reason":"end_turn"}}\n\n'));
      controller.enqueue(encoder.encode('event: message_stop\ndata: {"type":"message_stop"}\n\n'));
      controller.close();
    }
  });
  return {
    ok: true,
    body: { getReader: () => stream.getReader() },
    json: async () => ({ content: [{ text: content }] })
  };
}

function createAnthropicThinkingStreamingMock(thinkingContent, responseContent) {
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      controller.enqueue(encoder.encode('event: message_start\ndata: {"type":"message_start","message":{"id":"msg_test"}}\n\n'));
      controller.enqueue(encoder.encode('event: content_block_start\ndata: {"type":"content_block_start","index":0,"content_block":{"type":"thinking","thinking":""}}\n\n'));
      controller.enqueue(encoder.encode(`event: content_block_delta\ndata: {"type":"content_block_delta","index":0,"delta":{"type":"thinking_delta","thinking":"${thinkingContent}"}}\n\n`));
      controller.enqueue(encoder.encode('event: content_block_stop\ndata: {"type":"content_block_stop","index":0}\n\n'));
      controller.enqueue(encoder.encode('event: content_block_start\ndata: {"type":"content_block_start","index":1,"content_block":{"type":"text","text":""}}\n\n'));
      const chunks = responseContent.split(/(?=\s)/);
      for (const chunk of chunks) {
        const escaped = chunk.replace(/"/g, '\\"');
        controller.enqueue(encoder.encode(`event: content_block_delta\ndata: {"type":"content_block_delta","index":1,"delta":{"type":"text_delta","text":"${escaped}"}}\n\n`));
      }
      controller.enqueue(encoder.encode('event: content_block_stop\ndata: {"type":"content_block_stop","index":1}\n\n'));
      controller.enqueue(encoder.encode('event: message_delta\ndata: {"type":"message_delta","delta":{"stop_reason":"end_turn"}}\n\n'));
      controller.enqueue(encoder.encode('event: message_stop\ndata: {"type":"message_stop"}\n\n'));
      controller.close();
    }
  });
  return {
    ok: true,
    body: { getReader: () => stream.getReader() },
    json: async () => ({ content: [{ text: responseContent }] })
  };
}

module.exports = {
  createStreamingMock,
  createThinkingStreamingMock,
  createSimpleStreamingMock,
  createAnthropicStreamingMock,
  createAnthropicThinkingStreamingMock
};
