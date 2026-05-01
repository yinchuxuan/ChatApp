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

    // Verify only raw JSON is displayed in <pre> elements
    const preElements = document.querySelectorAll('.chat-history pre');
    expect(preElements.length).toBe(2);
    expect(preElements[0].textContent).toContain('"role": "user"');
    expect(preElements[0].textContent).toContain('"content": "test message"');
    expect(preElements[1].textContent).toContain('"role": "assistant"');
    expect(preElements[1].textContent).toContain('"content": "Test"');
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

    // Verify thinking field is shown in the JSON structure
    const preElements = document.querySelectorAll('.chat-history pre');
    const assistantJson = preElements[1].textContent;
    expect(assistantJson).toContain('_thinking');
    expect(assistantJson).toContain('How to respond...');
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
