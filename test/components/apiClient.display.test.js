/**
 * Tests for ChatPanel - Msg history display from file
 */

const React = require('react');
const { render, screen, fireEvent, act } = require('@testing-library/react');

const electronAPI = global.window.electronAPI;

describe('ChatPanel - Msg History Display from File', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    electronAPI.getModelConfig.mockResolvedValue({
      success: true,
      config: { apiUrl: 'https://api.openai.com/v1', apiKey: 'test-key', modelName: 'gpt-4' }
    });
    electronAPI.getChatHistory.mockResolvedValue({ success: true, messages: [] });
    global.fetch.mockResolvedValue(global.createStreamingMock('Test'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('should show msg history with correct message roles', async () => {
    const savedMessages = [
      { role: 'user', content: 'test message' },
      { role: 'assistant', content: 'Test' }
    ];
    electronAPI.getChatHistory.mockResolvedValue({ success: true, messages: savedMessages });

    const ChatPanel = require('../../src/ChatPanel.jsx').default;
    render(React.createElement(ChatPanel));

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

    expect(screen.getByText('msg历史记录')).toBeInTheDocument();

    // Verify the card with msgs JSON structure
    const card = document.querySelector('.msg-history-card');
    expect(card).toBeTruthy();
    const jsonPre = document.querySelector('.msg-history-json');
    expect(jsonPre).toBeTruthy();
    const jsonText = jsonPre.textContent;
    expect(jsonText).toContain('"role": "user"');
    expect(jsonText).toContain('"content": "test message"');
    expect(jsonText).toContain('"role": "assistant"');
    expect(jsonText).toContain('"content": "Test"');
  });

  test('should show msg history with assistant message thinking field', async () => {
    const savedMessages = [
      { role: 'user', content: 'hello claude' },
      { role: 'assistant', content: 'Claude response', _thinking: 'How to respond...' }
    ];
    electronAPI.getChatHistory.mockResolvedValue({ success: true, messages: savedMessages });

    const ChatPanel = require('../../src/ChatPanel.jsx').default;
    render(React.createElement(ChatPanel));

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

    expect(screen.getByText('msg历史记录')).toBeInTheDocument();

    // Verify thinking field is present in the msgs JSON structure
    const jsonPre = document.querySelector('.msg-history-json');
    const jsonText = jsonPre.textContent;
    expect(jsonText).toContain('thinking');
    expect(jsonText).toContain('How to respond...');
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
