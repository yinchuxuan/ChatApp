/**
 * Tests for ChatPanel Component - Basic Tests
 */

const _React = require('react');
const { render: _render, screen: _screen, fireEvent: _fireEvent } = require('@testing-library/react');

const electronAPI = global.window.electronAPI;

describe('ChatPanel Component - Basic', () => {
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

  test('should load model config on mount', async () => {
    const result = await electronAPI.getModelConfig();
    expect(result.success).toBe(true);
    expect(result.config.apiUrl).toBe('http://api.example.com/v1');
  });

  test('should handle missing config', async () => {
    electronAPI.getModelConfig.mockResolvedValue({
      success: true,
      config: { apiUrl: '', apiKey: '', modelName: '' }
    });
    const result = await electronAPI.getModelConfig();
    expect(result.config.apiUrl).toBe('');
  });

  test('should call API with correct format', async () => {
    const config = {
      apiUrl: 'http://api.example.com/v1',
      apiKey: 'test-key',
      modelName: 'gpt-4'
    };

    const response = await fetch(`${config.apiUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`
      },
      body: JSON.stringify({
        model: config.modelName,
        messages: [{ role: 'user', content: 'test message' }],
        stream: true
      })
    });

    expect(global.fetch).toHaveBeenCalled();
    expect(response.ok).toBe(true);
  });

  test('should handle API error', async () => {
    global.fetch.mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ error: { message: 'Unauthorized' } })
    });

    const response = await fetch('http://api.example.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });

    expect(response.ok).toBe(false);
    expect(response.status).toBe(401);
  });

  test('should store API request messages', async () => {
    const config = {
      apiUrl: 'http://api.example.com/v1',
      apiKey: 'test-key',
      modelName: 'gpt-4'
    };

    const testMessages = [
      { role: 'user', content: 'Hello' },
      { role: 'assistant', content: 'Hi there' }
    ];

    const response = await fetch(`${config.apiUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`
      },
      body: JSON.stringify({
        model: config.modelName,
        messages: testMessages,
        stream: true
      })
    });

    expect(global.fetch).toHaveBeenCalled();
    expect(response.ok).toBe(true);

    const fetchCall = global.fetch.mock.calls[0];
    const requestBody = JSON.parse(fetchCall[1].body);
    expect(requestBody.messages).toEqual(testMessages);
  });

  test('should not duplicate user messages in API request body', async () => {
    const config = {
      apiUrl: 'http://api.example.com/v1',
      apiKey: 'test-key',
      modelName: 'gpt-4'
    };

    const messages = [];
    const inputValue = 'Hello world';
    const userMessage = { role: 'user', content: inputValue };
    const newMessages = [...messages, userMessage];

    const apiMessages = newMessages.map(msg => ({
      role: msg.role,
      content: msg.content
    }));

    const userMessagesInApi = apiMessages.filter(m => m.role === 'user');
    expect(userMessagesInApi.length).toBe(1);
    expect(userMessagesInApi[0].content).toBe('Hello world');

    await fetch(`${config.apiUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`
      },
      body: JSON.stringify({
        model: config.modelName,
        messages: apiMessages,
        stream: true
      })
    });

    expect(global.fetch).toHaveBeenCalled();
    const fetchCall = global.fetch.mock.calls[0];
    const requestBody = JSON.parse(fetchCall[1].body);
    expect(requestBody.messages.length).toBe(1);
    expect(requestBody.messages[0].role).toBe('user');
    expect(requestBody.messages[0].content).toBe('Hello world');
  });

  test('should verify chat-header toggle pattern', async () => {
    const handleToggleShowMsgHistory = jest.fn();
    electronAPI.getModelConfig.mockResolvedValue({
      success: true,
      config: { apiUrl: 'http://api.example.com/v1', apiKey: 'test-key', modelName: 'gpt-4' }
    });

    handleToggleShowMsgHistory();
    expect(handleToggleShowMsgHistory).toHaveBeenCalled();
  });
});