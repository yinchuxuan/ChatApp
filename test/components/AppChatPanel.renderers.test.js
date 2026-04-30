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
      renderApiRequestDisplay: jest.fn(() => _React.createElement('div', null, 'API Request Display')),
      renderChatHistory: jest.fn(() => _React.createElement('div', null, 'Chat History'))
    };

    const ChatPanel = require('../../src/ChatPanel.jsx').default;

    _render(_React.createElement(ChatPanel, null));

    await act(async () => { await Promise.resolve(); });

    // ChatPanel now renders messages directly instead of using renderChatHistory
    expect(document.querySelector('.chat-empty')).toBeTruthy();
  });

  test('should toggle to API request view', async () => {
    window.ChatPanelRenderers = {
      renderApiRequestDisplay: jest.fn(() => _React.createElement('div', null, 'API Request Display')),
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

    expect(window.ChatPanelRenderers.renderApiRequestDisplay).toHaveBeenCalled();
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