/**
 * Tests for ChatPanel Component - Markdown Rendering
 */

const _React = require('react');
const { render: _render, screen: _screen, fireEvent: _fireEvent, act } = require('@testing-library/react');

const electronAPI = global.window.electronAPI;

describe('ChatPanel Component - Markdown Rendering', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    electronAPI.getModelConfig.mockResolvedValue({
      success: true,
      config: { apiUrl: 'http://api.example.com/v1', apiKey: 'test-api-key', modelName: 'gpt-4' }
    });
    global.fetch.mockResolvedValue(global.createStreamingMock('Test response'));
  });

  test('should render user message content as markdown (bold text)', async () => {
    electronAPI.getChatHistory.mockResolvedValue({
      success: true,
      messages: [
        { role: 'user', content: 'Hello **world**' }
      ]
    });

    // Debug: verify window.marked is available
    expect(typeof global.window.marked).toBe('object');
    expect(typeof global.window.marked.parse).toBe('function');

    const ChatPanel = require('../../src/ChatPanel.jsx').default;

    _render(_React.createElement(ChatPanel, null));

    await act(async () => { await Promise.resolve(); });

    const bubbleContent = document.querySelector('.chat-message.user .chat-bubble-content');
    expect(bubbleContent).toBeTruthy();
    expect(bubbleContent.innerHTML).toContain('<strong>world</strong>');
  });

  test('should render assistant message content as markdown (bold text)', async () => {
    electronAPI.getChatHistory.mockResolvedValue({
      success: true,
      messages: [
        { role: 'user', content: 'Hi' },
        { role: 'assistant', content: 'Hello **there**!' }
      ]
    });

    const ChatPanel = require('../../src/ChatPanel.jsx').default;

    _render(_React.createElement(ChatPanel, null));

    await act(async () => { await Promise.resolve(); });

    const bubbleContent = document.querySelector('.chat-message.assistant .chat-bubble-content');
    expect(bubbleContent).toBeTruthy();
    expect(bubbleContent.innerHTML).toContain('<strong>there</strong>');
  });

  test('should render markdown code blocks', async () => {
    electronAPI.getChatHistory.mockResolvedValue({
      success: true,
      messages: [
        { role: 'assistant', content: 'Use `console.log()` to debug' }
      ]
    });

    const ChatPanel = require('../../src/ChatPanel.jsx').default;

    _render(_React.createElement(ChatPanel, null));

    await act(async () => { await Promise.resolve(); });

    const bubbleContent = document.querySelector('.chat-message.assistant .chat-bubble-content');
    expect(bubbleContent).toBeTruthy();
    expect(bubbleContent.innerHTML).toContain('<code>');
    expect(bubbleContent.innerHTML).toContain('console.log()');
  });

  test('should render markdown links', async () => {
    electronAPI.getChatHistory.mockResolvedValue({
      success: true,
      messages: [
        { role: 'user', content: 'Check [this link](https://example.com)' }
      ]
    });

    const ChatPanel = require('../../src/ChatPanel.jsx').default;

    _render(_React.createElement(ChatPanel, null));

    await act(async () => { await Promise.resolve(); });

    const bubbleContent = document.querySelector('.chat-message.user .chat-bubble-content');
    expect(bubbleContent).toBeTruthy();
    expect(bubbleContent.innerHTML).toContain('<a href="https://example.com">this link</a>');
  });

  test('should render markdown lists', async () => {
    electronAPI.getChatHistory.mockResolvedValue({
      success: true,
      messages: [
        { role: 'assistant', content: '- item one\n- item two\n- item three' }
      ]
    });

    const ChatPanel = require('../../src/ChatPanel.jsx').default;

    _render(_React.createElement(ChatPanel, null));

    await act(async () => { await Promise.resolve(); });

    const bubbleContent = document.querySelector('.chat-message.assistant .chat-bubble-content');
    expect(bubbleContent).toBeTruthy();
    expect(bubbleContent.innerHTML).toContain('<li>');
    expect(bubbleContent.innerHTML).toContain('item one');
    expect(bubbleContent.innerHTML).toContain('item two');
    expect(bubbleContent.innerHTML).toContain('item three');
  });

  test('should render markdown headers', async () => {
    electronAPI.getChatHistory.mockResolvedValue({
      success: true,
      messages: [
        { role: 'assistant', content: '## Section Title' }
      ]
    });

    const ChatPanel = require('../../src/ChatPanel.jsx').default;

    _render(_React.createElement(ChatPanel, null));

    await act(async () => { await Promise.resolve(); });

    const bubbleContent = document.querySelector('.chat-message.assistant .chat-bubble-content');
    expect(bubbleContent).toBeTruthy();
    expect(bubbleContent.innerHTML).toContain('<h2>');
    expect(bubbleContent.innerHTML).toContain('Section Title');
  });

  test('should render markdown italic text', async () => {
    electronAPI.getChatHistory.mockResolvedValue({
      success: true,
      messages: [
        { role: 'user', content: 'This is *italic* text' }
      ]
    });

    const ChatPanel = require('../../src/ChatPanel.jsx').default;

    _render(_React.createElement(ChatPanel, null));

    await act(async () => { await Promise.resolve(); });

    const bubbleContent = document.querySelector('.chat-message.user .chat-bubble-content');
    expect(bubbleContent).toBeTruthy();
    expect(bubbleContent.innerHTML).toContain('<em>italic</em>');
  });

  test('should use chat-message-bubble wrapper for non-thinking messages', async () => {
    electronAPI.getChatHistory.mockResolvedValue({
      success: true,
      messages: [
        { role: 'user', content: 'Simple text' }
      ]
    });

    const ChatPanel = require('../../src/ChatPanel.jsx').default;

    _render(_React.createElement(ChatPanel, null));

    await act(async () => { await Promise.resolve(); });

    const userBubble = document.querySelector('.chat-message.user .chat-message-bubble');
    expect(userBubble).toBeTruthy();
    expect(userBubble.classList.contains('md-card')).toBe(false);
    expect(userBubble.dataset.gcPart).toBe('message-bubble');
    expect(document.querySelector('[data-gc-part="message-row"]').dataset.role).toBe('user');
    expect(document.querySelector('[data-gc-part="message-content"]')).toBeTruthy();
  });
});
