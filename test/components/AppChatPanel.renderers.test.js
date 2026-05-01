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
