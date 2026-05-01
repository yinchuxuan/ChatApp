/**
 * Tests for ChatPanel - Protocol-aware API request display
 */

const React = require('react');
const { render, screen, fireEvent, act } = require('@testing-library/react');

const electronAPI = global.window.electronAPI;

describe('ChatPanel - Protocol-Aware API Request Display', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    electronAPI.getModelConfig.mockResolvedValue({
      success: true,
      config: { apiUrl: 'https://api.openai.com/v1', apiKey: 'test-key', modelName: 'gpt-4' }
    });
    global.fetch.mockResolvedValue(global.createStreamingMock('Test'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('should show OpenAI protocol badge in API request display', async () => {
    const ChatPanel = require('../../src/ChatPanel.jsx').default;
    render(React.createElement(ChatPanel));

    await act(async () => {
      await Promise.resolve();
      jest.advanceTimersByTime(100);
    });

    const input = screen.getByPlaceholderText('输入您的问题...');
    fireEvent.change(input, { target: { value: 'test message' } });
    fireEvent.click(document.querySelector('button[type="submit"]'));

    await act(async () => {
      await Promise.resolve();
      jest.advanceTimersByTime(100);
    });

    const chatHeader = screen.getByText('聊天').closest('.chat-header');
    fireEvent.click(chatHeader);

    await act(async () => {
      await Promise.resolve();
      jest.advanceTimersByTime(100);
    });

    const badge = document.querySelector('.api-protocol-badge');
    expect(badge).toBeTruthy();
    expect(badge.textContent).toBe('OpenAI');
  });

  test('should show Anthropic protocol badge when using Anthropic URL', async () => {
    electronAPI.getModelConfig.mockResolvedValue({
      success: true,
      config: { apiUrl: 'https://proxy.example.com/anthropic', apiKey: 'sk-ant-test', modelName: 'claude-sonnet-4-20250514', protocol: 'anthropic' }
    });
    global.fetch.mockResolvedValue(global.createAnthropicStreamingMock('Claude response'));

    const ChatPanel = require('../../src/ChatPanel.jsx').default;
    render(React.createElement(ChatPanel));

    await act(async () => {
      await Promise.resolve();
      jest.advanceTimersByTime(100);
    });

    const input = screen.getByPlaceholderText('输入您的问题...');
    fireEvent.change(input, { target: { value: 'hello claude' } });
    fireEvent.click(document.querySelector('button[type="submit"]'));

    await act(async () => {
      await Promise.resolve();
      jest.advanceTimersByTime(100);
    });

    const chatHeader = screen.getByText('聊天').closest('.chat-header');
    fireEvent.click(chatHeader);

    await act(async () => {
      await Promise.resolve();
      jest.advanceTimersByTime(100);
    });

    const badge = document.querySelector('.api-protocol-badge');
    expect(badge).toBeTruthy();
    expect(badge.textContent).toBe('Anthropic');
  });

  test('should handle OpenAI API errors', async () => {
    global.fetch.mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ error: { message: 'Invalid API key' } })
    });

    await expect(
      window.sendChatRequest(
        {
          apiUrl: 'https://api.openai.com/v1',
          apiKey: 'bad-key',
          modelName: 'gpt-4',
          messages: [{ role: 'user', content: 'Hi' }]
        },
        { onToken: jest.fn() }
      )
    ).rejects.toThrow('Invalid API key');
  });

  test('should handle OpenAI API errors with default message', async () => {
    global.fetch.mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({})
    });

    await expect(
      window.sendChatRequest(
        {
          apiUrl: 'https://api.openai.com/v1',
          apiKey: 'test-key',
          modelName: 'gpt-4',
          messages: [{ role: 'user', content: 'Hi' }]
        },
        { onToken: jest.fn() }
      )
    ).rejects.toThrow('API 错误: 500');
  });
});
