/**
 * Tests for ChatPanel Component - Quote Highlighting
 */

const React = require('react');
const { render: _render, screen: _screen, act } = require('@testing-library/react');

const electronAPI = global.window.electronAPI;

describe('ChatPanel Component - Quote Highlighting', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    electronAPI.getModelConfig.mockResolvedValue({
      success: true,
      config: { apiUrl: 'http://api.example.com/v1', apiKey: 'test-api-key', modelName: 'gpt-4' }
    });
    global.fetch.mockResolvedValue(global.createStreamingMock('Test response'));
  });

  test('should highlight text in ASCII double quotes in user message', async () => {
    electronAPI.getChatHistory.mockResolvedValue({
      success: true,
      messages: [
        { role: 'user', content: 'Say "hello world"' }
      ]
    });

    const ChatPanel = require('../../src/ChatPanel.jsx').default;

    _render(React.createElement(ChatPanel, null));

    await act(async () => { await Promise.resolve(); });

    const bubbleContent = document.querySelector('.chat-message.user .chat-bubble-content');
    expect(bubbleContent).toBeTruthy();
    expect(bubbleContent.innerHTML).toContain('quoted-text');
    expect(bubbleContent.innerHTML).toContain('"hello world"');
  });

  test('should highlight text in smart double quotes in assistant message', async () => {
    electronAPI.getChatHistory.mockResolvedValue({
      success: true,
      messages: [
        { role: 'user', content: 'Hi' },
        { role: 'assistant', content: 'He said “hello”' }
      ]
    });

    const ChatPanel = require('../../src/ChatPanel.jsx').default;

    _render(React.createElement(ChatPanel, null));

    await act(async () => { await Promise.resolve(); });

    const bubbleContent = document.querySelector('.chat-message.assistant .chat-bubble-content');
    expect(bubbleContent).toBeTruthy();
    expect(bubbleContent.innerHTML).toContain('quoted-text');
    expect(bubbleContent.innerHTML).toContain('“hello”');
  });

  test('should highlight text in corner brackets', async () => {
    electronAPI.getChatHistory.mockResolvedValue({
      success: true,
      messages: [
        { role: 'user', content: 'He said 「hello」' }
      ]
    });

    const ChatPanel = require('../../src/ChatPanel.jsx').default;

    _render(React.createElement(ChatPanel, null));

    await act(async () => { await Promise.resolve(); });

    const bubbleContent = document.querySelector('.chat-message.user .chat-bubble-content');
    expect(bubbleContent).toBeTruthy();
    expect(bubbleContent.innerHTML).toContain('quoted-text');
    expect(bubbleContent.innerHTML).toContain('「hello」');
  });

  test('should not highlight text without quotes', async () => {
    electronAPI.getChatHistory.mockResolvedValue({
      success: true,
      messages: [
        { role: 'user', content: 'Just plain text without quotes' }
      ]
    });

    const ChatPanel = require('../../src/ChatPanel.jsx').default;

    _render(React.createElement(ChatPanel, null));

    await act(async () => { await Promise.resolve(); });

    const bubbleContent = document.querySelector('.chat-message.user .chat-bubble-content');
    expect(bubbleContent).toBeTruthy();
    expect(bubbleContent.innerHTML).not.toContain('quoted-text');
  });

  test('should highlight multiple quoted sections', async () => {
    electronAPI.getChatHistory.mockResolvedValue({
      success: true,
      messages: [
        { role: 'assistant', content: 'Say "hello" and "world"' }
      ]
    });

    const ChatPanel = require('../../src/ChatPanel.jsx').default;

    _render(React.createElement(ChatPanel, null));

    await act(async () => { await Promise.resolve(); });

    const bubbleContent = document.querySelector('.chat-message.assistant .chat-bubble-content');
    expect(bubbleContent).toBeTruthy();
    const html = bubbleContent.innerHTML;
    // Should have two quoted-text spans
    const matches = html.match(/quoted-text/g);
    expect(matches).toBeTruthy();
    expect(matches.length).toBe(2);
  });
});
