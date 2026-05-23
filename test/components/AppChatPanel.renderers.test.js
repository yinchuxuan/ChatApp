/**
 * Tests for ChatPanel Component - Renderers
 */

const _React = require('react');
const { render: _render, screen: _screen, fireEvent: _fireEvent, act } = require('@testing-library/react');

const electronAPI = global.window.electronAPI;

describe('ChatPanel Component - Renderers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    electronAPI.getModelConfig.mockResolvedValue({
      success: true,
      config: { apiUrl: 'http://api.example.com/v1', apiKey: 'test-api-key', modelName: 'gpt-4' }
    });
    global.fetch.mockResolvedValue(global.createStreamingMock('Test response'));
  });

  afterEach(() => {
    window.ChatPanelRenderers = undefined;
  });

  test('should render with ChatPanelRenderers', async () => {
    window.ChatPanelRenderers = {
      renderMsgHistoryDisplay: jest.fn(() => _React.createElement('div', null, 'Msg History Display')),
      renderChatHistory: jest.fn(() => _React.createElement('div', null, 'Chat History'))
    };

    const ChatPanel = require('../../src/ChatPanel.jsx').default;

    _render(_React.createElement(ChatPanel, null));

    await act(async () => { await Promise.resolve(); });

    // ChatPanel now renders messages directly instead of using renderChatHistory
    expect(document.querySelector('.chat-empty')).toBeTruthy();
  });

  test('should toggle to msg history view', async () => {
    window.ChatPanelRenderers = {
      renderMsgHistoryDisplay: jest.fn(() => _React.createElement('div', null, 'Msg History Display')),
      renderChatHistory: jest.fn(() => _React.createElement('div', null, 'Chat History'))
    };

    const ChatPanel = require('../../src/ChatPanel.jsx').default;

    _render(_React.createElement(ChatPanel, null));

    await act(async () => { await Promise.resolve(); });

    // Verify chat history is shown initially
    expect(document.querySelector('.chat-empty')).toBeTruthy();

    const header = document.querySelector('.chat-header');
    _fireEvent.click(header);

    await act(async () => { await Promise.resolve(); });

    expect(window.ChatPanelRenderers.renderMsgHistoryDisplay).toHaveBeenCalled();
  });

  test('should return null for renderers when not ready', async () => {
    window.ChatPanelRenderers = undefined;

    const ChatPanel = require('../../src/ChatPanel.jsx').default;

    _render(_React.createElement(ChatPanel, null));

    await act(async () => { await Promise.resolve(); });

    // ChatPanel renders messages directly, so even without renderers it shows content
    const historyDiv = document.querySelector('.chat-history');
    expect(historyDiv).toBeTruthy();
    // Empty state should be rendered
    expect(document.querySelector('.chat-empty')).toBeTruthy();
  });

  test('should render a stable reading veil layer inside chat history', async () => {
    const ChatPanel = require('../../src/ChatPanel.jsx').default;

    _render(_React.createElement(ChatPanel, null));

    await act(async () => { await Promise.resolve(); });

    const chatHistory = document.querySelector('.chat-history');
    const veil = document.querySelector('.chat-reading-veil');
    expect(chatHistory).toBeTruthy();
    expect(veil).toBeTruthy();
    expect(veil.parentElement).toBe(chatHistory);
    expect(veil.getAttribute('aria-hidden')).toBe('true');
  });

  test('should poll for renderers and cleanup', async () => {
    jest.useFakeTimers();

    window.ChatPanelRenderers = undefined;

    const ChatPanel = require('../../src/ChatPanel.jsx').default;

    const { unmount } = _render(_React.createElement(ChatPanel, null));

    await act(async () => { await Promise.resolve(); });

    unmount();

    jest.advanceTimersByTime(5000);

    jest.useRealTimers();
  });
});

describe('MsgHistoryDisplay Card', () => {
  const ChatPanelRenderers = require('../../src/components/ChatPanelRenderers');

  test('should render empty state when no messages', () => {
    const result = ChatPanelRenderers.renderMsgHistoryDisplay(React, null);
    expect(result.props.className).toBe('chat-empty');
    const children = result.props.children;
    expect(children[0].props.className).toBe('material-icons empty-icon');
    expect(children[0].props.children).toBe('inbox');
    expect(children[1].props.children).toBe('暂无消息历史记录');
  });

  test('should render empty state when messages array is empty', () => {
    const result = ChatPanelRenderers.renderMsgHistoryDisplay(React, []);
    expect(result.props.className).toBe('chat-empty');
    const children = result.props.children;
    expect(children[0].props.className).toBe('material-icons empty-icon');
    expect(children[0].props.children).toBe('inbox');
    expect(children[1].props.children).toBe('暂无消息历史记录');
  });

  test('should render a single rectangular card with msgs JSON', () => {
    const messages = [
      { role: 'user', content: 'Hello' },
      { role: 'assistant', content: 'Hi there!' }
    ];
    const result = ChatPanelRenderers.renderMsgHistoryDisplay(React, messages);

    // Outer element should have msg-history-card class
    expect(result.type).toBe('div');
    expect(result.props.className).toBe('msg-history-card');

    // Inner element should be a pre with msg-history-json class
    const pre = result.props.children;
    expect(pre.type).toBe('pre');
    expect(pre.props.className).toBe('msg-history-json');

    // JSON should contain msgs structure
    const parsed = JSON.parse(pre.props.children);
    expect(parsed).toHaveProperty('msgs');
    expect(parsed.msgs['0']).toEqual({ role: 'user', content: 'Hello' });
    expect(parsed.msgs['1']).toEqual({ role: 'assistant', content: 'Hi there!' });
  });

  test('should include all messages in msgs JSON with correct structure', () => {
    const messages = [
      { role: 'user', content: 'Message 1' },
      { role: 'assistant', content: 'Response 1' },
      { role: 'user', content: 'Message 2' },
      { role: 'assistant', content: 'Response 2' }
    ];
    const result = ChatPanelRenderers.renderMsgHistoryDisplay(React, messages);
    const pre = result.props.children;
    const parsed = JSON.parse(pre.props.children);

    expect(Object.keys(parsed.msgs).length).toBe(4);
    expect(parsed.msgs['0'].content).toBe('Message 1');
    expect(parsed.msgs['1'].content).toBe('Response 1');
    expect(parsed.msgs['2'].content).toBe('Message 2');
    expect(parsed.msgs['3'].content).toBe('Response 2');
  });

  test('should use numeric index keys in msgs JSON', () => {
    const messages = [
      { role: 'user', content: 'Test' }
    ];
    const result = ChatPanelRenderers.renderMsgHistoryDisplay(React, messages);
    const pre = result.props.children;
    const parsed = JSON.parse(pre.props.children);

    expect(parsed.msgs).toHaveProperty('0');
    expect(typeof parsed.msgs['0'].role).toBe('string');
    expect(typeof parsed.msgs['0'].content).toBe('string');
  });
});

describe('ChatPanelMessageRenderers streaming layout', () => {
  const ChatPanelMessageRenderers = require('../../src/components/ChatPanelMessageRenderers');

  test('wraps streaming assistant output in a chat-message-row', () => {
    const renderMarkdown = jest.fn((content) =>
      _React.createElement('div', { className: 'chat-message-bubble' }, content)
    );
    const renderAssistantMsg = jest.fn(() =>
      _React.createElement('div', { className: 'chat-message-bubble' }, 'streaming response')
    );
    const renderRetryBtn = jest.fn(() => null);
    const tw = { streamContent: 'streaming response', displayedCount: 18 };

    const result = ChatPanelMessageRenderers.renderMessages(
      _React,
      [{ role: 'user', content: 'Question' }],
      true,
      tw,
      null,
      true,
      renderMarkdown,
      renderAssistantMsg,
      renderRetryBtn,
      null,
      false,
      jest.fn(),
      { apiUrl: 'http://api.example.com' }
    );

    expect(result.props.className).toBe('chat-messages-layer');
    const children = result.props.children;
    const streamingRow = children[children.length - 1];
    expect(streamingRow.props.className).toBe('chat-message-row streaming-message-row');
    expect(streamingRow.props.children.props.className).toBe('chat-message assistant');
    expect(streamingRow.props.children.props.style).toEqual({ flex: 1, minWidth: 0 });
  });

  test('uses collapse renderer while loading so the latest user message stays pinned', () => {
    const ChatPanelMessageRenderers = require('../../src/components/ChatPanelMessageRenderers');
    const collapseRenderer = { render: jest.fn(() => _React.createElement('div', { className: 'collapsed-message-view' })) };

    const result = ChatPanelMessageRenderers.renderMessages(
      _React,
      [
        { role: 'user', content: 'Earlier question' },
        { role: 'assistant', content: 'Earlier answer' },
        { role: 'user', content: 'Latest question' }
      ],
      true,
      { streamContent: 'streaming response', displayedCount: 18 },
      null,
      true,
      jest.fn(),
      jest.fn(),
      jest.fn(),
      collapseRenderer,
      false,
      jest.fn(),
      { apiUrl: 'http://api.example.com' }
    );

    expect(collapseRenderer.render).toHaveBeenCalled();
    expect(result.props.className).toBe('collapsed-message-view');
  });
});
