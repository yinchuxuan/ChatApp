/**
 * Tests for ChatPanel Component - Renderers
 */

const _React = require('react');
const { render: _render, screen: _screen, fireEvent: _fireEvent, act } = require('@testing-library/react');

const platformMock = global.platformMock;
const chatPanelRenderers = require('../../src/components/ChatPanelRenderers').default;

describe('ChatPanel Component - Renderers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    platformMock.getModelConfig.mockResolvedValue({
      success: true,
      config: { apiUrl: 'http://api.example.com/v1', apiKey: 'test-api-key', modelName: 'gpt-4' }
    });
    global.fetch.mockResolvedValue(global.createStreamingMock('Test response'));
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('should render with ChatPanelRenderers', async () => {
    const ChatPanel = require('../../src/ChatPanel.jsx').default;

    _render(_React.createElement(ChatPanel, null));

    await act(async () => { await Promise.resolve(); });

    // ChatPanel now renders messages directly instead of using renderChatHistory
    expect(document.querySelector('.chat-empty')).toBeTruthy();
  });

  test('should toggle to msg history view', async () => {
    const renderHistory = jest.spyOn(chatPanelRenderers, 'renderMsgHistoryDisplay')
      .mockReturnValue(_React.createElement('div', null, 'Msg History Display'));

    const ChatPanel = require('../../src/ChatPanel.jsx').default;

    _render(_React.createElement(ChatPanel, null));

    await act(async () => { await Promise.resolve(); });

    // Verify chat history is shown initially
    expect(document.querySelector('.chat-empty')).toBeTruthy();

    const header = document.querySelector('.chat-header');
    _fireEvent.click(header);

    await act(async () => { await Promise.resolve(); });

    expect(renderHistory).toHaveBeenCalled();
  });

  test('should render through imported renderers without globals', async () => {
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

  test('should not poll for globally registered renderers', async () => {
    const intervalSpy = jest.spyOn(global, 'setInterval');

    const ChatPanel = require('../../src/ChatPanel.jsx').default;

    const { unmount } = _render(_React.createElement(ChatPanel, null));

    await act(async () => { await Promise.resolve(); });

    unmount();

    expect(intervalSpy).not.toHaveBeenCalled();
  });
});
