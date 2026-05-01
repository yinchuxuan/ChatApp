// Jest DOM setup
require('@testing-library/jest-dom');

// Polyfill ReadableStream and TextEncoder for jsdom environment
const { ReadableStream } = require('stream/web');
global.ReadableStream = ReadableStream;
const { TextEncoder, TextDecoder } = require('util');
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Set global React for components that use window.React
const React = require('react');
global.window.React = React;

// Mock window.electronAPI for React components
global.window.electronAPI = {
  getModelConfig: jest.fn(),
  saveModelConfig: jest.fn(),
  getBackgroundConfig: jest.fn(),
  saveBackgroundConfig: jest.fn(),
  selectBackgroundImage: jest.fn(),
  readBackgroundImage: jest.fn(),
  getChatHistory: jest.fn().mockResolvedValue({ success: true, messages: [] }),
  saveChatHistory: jest.fn().mockResolvedValue({ success: true })
};

// Mock fetch for ChatPanel API calls
// Helper to create a streaming mock response
global.createStreamingMock = (content) => {
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
};

// Helper to create a streaming mock with thinking tags
global.createThinkingStreamingMock = (thinkingContent, responseContent) => {
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
};

global.createSimpleStreamingMock = (content) => {
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
};

global.fetch = jest.fn();

// Helper to create an Anthropic SSE streaming mock
global.createAnthropicStreamingMock = (content) => {
  const chunks = content.split(/(?=\\s)/);
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      // Send message_start event
      controller.enqueue(encoder.encode('event: message_start\ndata: {"type":"message_start","message":{"id":"msg_test"}}\n\n'));
      // Send content_block_start event
      controller.enqueue(encoder.encode('event: content_block_start\ndata: {"type":"content_block_start","index":0,"content_block":{"type":"text","text":""}}\n\n'));
      // Send content_block_delta events for each chunk
      for (const chunk of chunks) {
        const escaped = chunk.replace(/"/g, '\\"');
        controller.enqueue(encoder.encode(`event: content_block_delta\ndata: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"${escaped}"}}\n\n`));
      }
      // Send content_block_stop
      controller.enqueue(encoder.encode('event: content_block_stop\ndata: {"type":"content_block_stop","index":0}\n\n'));
      // Send message_delta
      controller.enqueue(encoder.encode('event: message_delta\ndata: {"type":"message_delta","delta":{"stop_reason":"end_turn"}}\n\n'));
      // Send message_stop
      controller.enqueue(encoder.encode('event: message_stop\ndata: {"type":"message_stop"}\n\n'));
      controller.close();
    }
  });
  return {
    ok: true,
    body: { getReader: () => stream.getReader() },
    json: async () => ({ content: [{ text: content }] })
  };
};

// Helper to create an Anthropic SSE streaming mock with thinking
global.createAnthropicThinkingStreamingMock = (thinkingContent, responseContent) => {
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      controller.enqueue(encoder.encode('event: message_start\ndata: {"type":"message_start","message":{"id":"msg_test"}}\n\n'));
      // Thinking block
      controller.enqueue(encoder.encode('event: content_block_start\ndata: {"type":"content_block_start","index":0,"content_block":{"type":"thinking","thinking":""}}\n\n'));
      controller.enqueue(encoder.encode(`event: content_block_delta\ndata: {"type":"content_block_delta","index":0,"delta":{"type":"thinking_delta","thinking":"${thinkingContent}"}}\n\n`));
      controller.enqueue(encoder.encode('event: content_block_stop\ndata: {"type":"content_block_stop","index":0}\n\n'));
      // Text block
      controller.enqueue(encoder.encode('event: content_block_start\ndata: {"type":"content_block_start","index":1,"content_block":{"type":"text","text":""}}\n\n'));
      const chunks = responseContent.split(/(?=\\s)/);
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
};

// Import ChatPanelRenderers from source (not duplicated)
// Uses CommonJS require which works in Jest environment
const ChatPanelRenderers = require('../src/components/ChatPanelRenderers.js');
global.window.ChatPanelRenderers = ChatPanelRenderers;

const useTypewriter = require('../src/components/useTypewriter.js');
global.window.useTypewriter = useTypewriter;

// Import apiClient for chat requests
const apiClient = require('../src/components/apiClient.js');
if (apiClient.sendChatRequest) {
  global.window.sendChatRequest = apiClient.sendChatRequest;
}

// Suppress console errors in tests (optional)
// console.error = jest.fn();
