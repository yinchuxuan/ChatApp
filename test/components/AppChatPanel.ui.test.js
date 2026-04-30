/**
 * Tests for ChatPanel Component - UI Tests
 */

const _React = require('react');
const { render: _render, screen: _screen, fireEvent: _fireEvent, waitFor: _waitFor, act } = require('@testing-library/react');

const electronAPI = global.window.electronAPI;

describe('ChatPanel Component - UI', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    electronAPI.getModelConfig.mockResolvedValue({
      success: true,
      config: { apiUrl: 'http://api.example.com/v1', apiKey: 'test-api-key', modelName: 'gpt-4' }
    });
    global.fetch.mockResolvedValue(global.createStreamingMock('Test response'));
    window.ChatPanelRenderers = {
      renderApiRequestDisplay: jest.fn(() => null),
      renderChatHistory: jest.fn(() => null)
    };
  });

  afterEach(() => {
    window.ChatPanelRenderers = undefined;
  });

  test('should render ChatPanel component and toggle header', async () => {
    const ChatPanel = require('../../src/ChatPanel.jsx').default;

    _render(_React.createElement(ChatPanel, null));

    await act(async () => { await Promise.resolve(); });

    expect(_screen.getByText('聊天')).toBeInTheDocument();

    const header = document.querySelector('.chat-header');
    _fireEvent.click(header);

    await act(async () => { await Promise.resolve(); });

    expect(_screen.getByText('API请求')).toBeInTheDocument();
  });

  test('should show model name when configured', async () => {
    const ChatPanel = require('../../src/ChatPanel.jsx').default;

    _render(_React.createElement(ChatPanel, null));

    await act(async () => { await Promise.resolve(); });

    await _waitFor(() => {
      expect(_screen.getByText('gpt-4')).toBeInTheDocument();
    });
  });

  test('should show "已连接" when model name is empty but config exists', async () => {
    electronAPI.getModelConfig.mockResolvedValue({
      success: true,
      config: { apiUrl: 'http://api.example.com', apiKey: 'key', modelName: '' }
    });

    const ChatPanel = require('../../src/ChatPanel.jsx').default;

    _render(_React.createElement(ChatPanel, null));

    await act(async () => { await Promise.resolve(); });

    await _waitFor(() => {
      expect(_screen.getByText('已连接')).toBeInTheDocument();
    });
  });

  test('should disable submit button when input is empty', async () => {
    const ChatPanel = require('../../src/ChatPanel.jsx').default;

    _render(_React.createElement(ChatPanel, null));

    await act(async () => { await Promise.resolve(); });

    const submitBtn = document.querySelector('button[type="submit"]');
    expect(submitBtn.disabled).toBe(true);
  });

  test('should enable submit button when input has value', async () => {
    const ChatPanel = require('../../src/ChatPanel.jsx').default;

    _render(_React.createElement(ChatPanel, null));

    await act(async () => { await Promise.resolve(); });

    const input = _screen.getByPlaceholderText('输入您的问题...');
    _fireEvent.change(input, { target: { value: 'some text' } });

    await act(async () => { await Promise.resolve(); });

    const submitBtn = document.querySelector('button[type="submit"]');
    expect(submitBtn.disabled).toBe(false);
  });

  test('should not submit when input is only whitespace', async () => {
    const ChatPanel = require('../../src/ChatPanel.jsx').default;

    _render(_React.createElement(ChatPanel, null));

    await act(async () => { await Promise.resolve(); });

    const input = _screen.getByPlaceholderText('输入您的问题...');
    _fireEvent.change(input, { target: { value: '   ' } });

    await act(async () => { await Promise.resolve(); });

    _fireEvent.click(_screen.getByText('发送'));

    await act(async () => { await Promise.resolve(); });

    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('should handle no electronAPI gracefully', async () => {
    const originalElectronAPI = window.electronAPI;
    window.electronAPI = undefined;

    const ChatPanel = require('../../src/ChatPanel.jsx').default;

    _render(_React.createElement(ChatPanel, null));

    await act(async () => { await Promise.resolve(); });

    expect(_screen.getByText('聊天')).toBeInTheDocument();

    window.electronAPI = originalElectronAPI;
  });

  test('should handle failed config load', async () => {
    electronAPI.getModelConfig.mockResolvedValue({
      success: false,
      error: 'Config load failed'
    });

    const ChatPanel = require('../../src/ChatPanel.jsx').default;

    _render(_React.createElement(ChatPanel, null));

    await act(async () => { await Promise.resolve(); });

    expect(_screen.queryByText('gpt-4')).not.toBeInTheDocument();
  });
});