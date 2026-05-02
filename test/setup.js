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

// Set up marked for markdown rendering (simple mock for Jest)
global.window.marked = {
  parse: function(text) {
    text = text.replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code class="language-$1">$2</code></pre>');
    text = text.replace(/`([^`]+)`/g, '<code>$1</code>');
    text = text.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    text = text.replace(/^## (.+)$/gm, '<h2>$1</h2>');
    text = text.replace(/^# (.+)$/gm, '<h1>$1</h1>');
    text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    text = text.replace(/\*(.+?)\*/g, '<em>$1</em>');
    text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
    text = text.replace(/^- (.+)$/gm, '<li>$1</li>');
    text = text.replace(/(<li>.*<\/li>\n?)+/g, function(match) {
      return '<ul>' + match + '</ul>';
    });
    text = text.split('\n\n').map(function(block) {
      if (block.match(/^<(h[1-6]|ul|ol|pre|li|blockquote|hr)/)) return block;
      return '<p>' + block.replace(/\n/g, '<br>') + '</p>';
    }).join('\n');
    return text;
  }
};

// Set up DOMPurify for XSS sanitization (pass-through mock for Jest)
global.window.DOMPurify = {
  sanitize: function(html) { return html; }
};

// Mock window.electronAPI for React components
global.window.electronAPI = {
  getModelConfig: jest.fn(),
  saveModelConfig: jest.fn(),
  getBackgroundConfig: jest.fn(),
  saveBackgroundConfig: jest.fn(),
  selectBackgroundImage: jest.fn(),
  readBackgroundImage: jest.fn(),
  getChatHistory: jest.fn().mockResolvedValue({ success: true, messages: [] }),
  saveChatHistory: jest.fn().mockResolvedValue({ success: true }),
  onBackgroundConfigChanged: jest.fn()
};

// Import ChatPanelRenderers from source (not duplicated)
const ChatPanelRenderers = require('../src/components/ChatPanelRenderers.js');
global.window.ChatPanelRenderers = ChatPanelRenderers;

const MessageCollapseRenderer = require('../src/components/MessageCollapseRenderer.js');
global.window.MessageCollapseRenderer = MessageCollapseRenderer;

const useTypewriter = require('../src/components/useTypewriter.js');
global.window.useTypewriter = useTypewriter;

// Import apiClient for chat requests
const apiClient = require('../src/components/apiClient.js');
if (apiClient.sendChatRequest) {
  global.window.sendChatRequest = apiClient.sendChatRequest;
}

// Mock fetch for ChatPanel API calls
global.fetch = jest.fn();

// Import and expose streaming mock helpers as globals
const streamingMocks = require('./streamingMocks.js');
global.createStreamingMock = streamingMocks.createStreamingMock;
global.createThinkingStreamingMock = streamingMocks.createThinkingStreamingMock;
global.createSimpleStreamingMock = streamingMocks.createSimpleStreamingMock;
global.createAnthropicStreamingMock = streamingMocks.createAnthropicStreamingMock;
global.createAnthropicThinkingStreamingMock = streamingMocks.createAnthropicThinkingStreamingMock;
