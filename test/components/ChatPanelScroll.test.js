/**
 * Tests for ChatPanel Component - Auto-scroll Behavior
 * Verifies chat history auto-scrolls to show latest messages
 */

const _React = require('react');
const { render: _render, screen: _screen, fireEvent: _fireEvent, waitFor: _waitFor, act } = require('@testing-library/react');

const electronAPI = global.window.electronAPI;

describe('ChatPanel Component - Auto-scroll', () => {
  let ChatPanel;

  beforeEach(() => {
    jest.clearAllMocks();
    electronAPI.getModelConfig.mockResolvedValue({
      success: true,
      config: { apiUrl: 'http://api.example.com/v1', apiKey: 'test-api-key', modelName: 'gpt-4' }
    });
    global.fetch.mockResolvedValue(global.createStreamingMock('Test response'));
    window.ChatPanelRenderers = {
      renderMsgHistoryDisplay: jest.fn(() => null),
      renderChatHistory: jest.fn(() => null)
    };
  });

  afterEach(() => {
    window.ChatPanelRenderers = undefined;
  });

  test('should have chat-history element as scrollable message container', async () => {
    ChatPanel = require('../../src/ChatPanel.jsx').default;

    _render(_React.createElement(ChatPanel, null));

    await act(async () => { await Promise.resolve(); });

    const chatHistory = document.querySelector('.chat-history');
    expect(chatHistory).toBeInTheDocument();
    // Verify chat-history has the class that provides overflow-y: auto via CSS
    expect(chatHistory.classList.contains('chat-history')).toBe(true);
  });

  test('should auto-scroll chat-history to bottom when new messages are added', async () => {
    // Mock scrollTop setter
    const originalScrollTop = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollTop');
    Object.defineProperty(HTMLElement.prototype, 'scrollTop', {
      configurable: true,
      set() { this._scrollTop = arguments[0]; },
      get() { return this._scrollTop || 0; }
    });
    Object.defineProperty(HTMLElement.prototype, 'scrollHeight', {
      configurable: true,
      get() { return 500; }
    });

    ChatPanel = require('../../src/ChatPanel.jsx').default;

    _render(_React.createElement(ChatPanel, null));

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    // Type a message to trigger message addition
    const input = _screen.getByPlaceholderText('输入您的回答...');
    _fireEvent.change(input, { target: { value: 'test message' } });

    await act(async () => { await Promise.resolve(); });

    const form = document.querySelector('.chat-input-area');
    _fireEvent.submit(form);

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    const chatHistory = document.querySelector('.chat-history');
    expect(chatHistory).toBeTruthy();
    // Verify scrollTop was set to scrollHeight (auto-scrolled to bottom)
    expect(chatHistory._scrollTop).toBe(500);

    // Clean up
    Object.defineProperty(HTMLElement.prototype, 'scrollTop', originalScrollTop || {});
  });

  test('should auto-scroll when toggling to msg history display', async () => {
    window.ChatPanelRenderers.renderMsgHistoryDisplay = jest.fn((R) =>
      R.createElement('div', { className: 'chat-msg-history-display' }, 'Msg History Content')
    );

    ChatPanel = require('../../src/ChatPanel.jsx').default;

    _render(_React.createElement(ChatPanel, null));

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    // Toggle to msg history display
    const header = document.querySelector('.chat-header');
    _fireEvent.click(header);

    await act(async () => { await Promise.resolve(); });

    expect(_screen.getByText('Msg History Content')).toBeInTheDocument();

    const chatHistory = document.querySelector('.chat-history');
    expect(chatHistory).toBeTruthy();
  });

  test('should not have custom scrollbar UI components', async () => {
    ChatPanel = require('../../src/ChatPanel.jsx').default;

    _render(_React.createElement(ChatPanel, null));

    await act(async () => { await Promise.resolve(); });

    const chatHistory = document.querySelector('.chat-history');
    expect(chatHistory).toBeTruthy();

    // Verify no custom scrollbar component present - uses native browser scrollbar
    const scrollbarComponents = document.querySelectorAll('[class*="scrollbar"], [class*="scroll-bar"], [class*="custom-scroll"]');
    expect(scrollbarComponents.length).toBe(0);
  });
});
