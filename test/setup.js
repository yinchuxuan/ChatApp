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
  readBackgroundImage: jest.fn()
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

// Import ChatPanelRenderers from source (not duplicated)
// Uses CommonJS require which works in Jest environment
const ChatPanelRenderers = require('../src/components/ChatPanelRenderers.js');
global.window.ChatPanelRenderers = ChatPanelRenderers;

const useTypewriter = require('../src/components/useTypewriter.js');
global.window.useTypewriter = useTypewriter;

// Suppress console errors in tests (optional)
// console.error = jest.fn();
