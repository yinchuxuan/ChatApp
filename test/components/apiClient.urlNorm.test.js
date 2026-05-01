/**
 * Tests for apiClient - URL normalization
 */
describe('sendChatRequest - URL normalization (OpenAI)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should append /v1/chat/completions to bare domain URL', async () => {
    global.fetch.mockResolvedValue(global.createStreamingMock('Hello'));

    await window.sendChatRequest(
      {
        apiUrl: 'https://api.deepseek.com',
        apiKey: 'sk-test',
        modelName: 'gpt-4',
        messages: [{ role: 'user', content: 'Hello' }]
      },
      { onToken: jest.fn() }
    );

    const [url] = global.fetch.mock.calls[0];
    expect(url).toBe('https://api.deepseek.com/v1/chat/completions');
  });

  test('should strip trailing /v1 to avoid duplicate in OpenAI path', async () => {
    global.fetch.mockResolvedValue(global.createStreamingMock('Hello'));

    await window.sendChatRequest(
      {
        apiUrl: 'https://api.openai.com/v1',
        apiKey: 'sk-test',
        modelName: 'gpt-4',
        messages: [{ role: 'user', content: 'Hello' }]
      },
      { onToken: jest.fn() }
    );

    const [url] = global.fetch.mock.calls[0];
    expect(url).toBe('https://api.openai.com/v1/chat/completions');
  });

  test('should strip trailing /v1/ to avoid duplicate in OpenAI path', async () => {
    global.fetch.mockResolvedValue(global.createStreamingMock('Hello'));

    await window.sendChatRequest(
      {
        apiUrl: 'https://api.openai.com/v1/',
        apiKey: 'sk-test',
        modelName: 'gpt-4',
        messages: [{ role: 'user', content: 'Hello' }]
      },
      { onToken: jest.fn() }
    );

    const [url] = global.fetch.mock.calls[0];
    expect(url).toBe('https://api.openai.com/v1/chat/completions');
  });

  test('should strip trailing slash before appending OpenAI path', async () => {
    global.fetch.mockResolvedValue(global.createStreamingMock('Hello'));

    await window.sendChatRequest(
      {
        apiUrl: 'https://api.deepseek.com/',
        apiKey: 'sk-test',
        modelName: 'gpt-4',
        messages: [{ role: 'user', content: 'Hello' }]
      },
      { onToken: jest.fn() }
    );

    const [url] = global.fetch.mock.calls[0];
    expect(url).toBe('https://api.deepseek.com/v1/chat/completions');
  });
});

describe('sendChatRequest - URL normalization (Anthropic)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should append /v1/messages to URL without /v1', async () => {
    global.fetch.mockResolvedValue(global.createAnthropicStreamingMock('Hello'));

    await window.sendChatRequest(
      {
        apiUrl: 'https://proxy.example.com/anthropic',
        apiKey: 'sk-ant-test',
        modelName: 'claude-sonnet-4-20250514',
        protocol: 'anthropic',
        messages: [{ role: 'user', content: 'Hi' }]
      },
      { onToken: jest.fn() }
    );

    const [url] = global.fetch.mock.calls[0];
    expect(url).toBe('https://proxy.example.com/anthropic/v1/messages');
  });

  test('should strip trailing /v1 before appending /v1/messages', async () => {
    global.fetch.mockResolvedValue(global.createAnthropicStreamingMock('Hello'));

    await window.sendChatRequest(
      {
        apiUrl: 'https://proxy.example.com/anthropic/v1',
        apiKey: 'sk-ant-test',
        modelName: 'claude-sonnet-4-20250514',
        protocol: 'anthropic',
        messages: [{ role: 'user', content: 'Hi' }]
      },
      { onToken: jest.fn() }
    );

    const [url] = global.fetch.mock.calls[0];
    expect(url).toBe('https://proxy.example.com/anthropic/v1/messages');
  });

  test('should strip trailing /v1/ before appending /v1/messages', async () => {
    global.fetch.mockResolvedValue(global.createAnthropicStreamingMock('Hello'));

    await window.sendChatRequest(
      {
        apiUrl: 'https://proxy.example.com/anthropic/v1/',
        apiKey: 'sk-ant-test',
        modelName: 'claude-sonnet-4-20250514',
        protocol: 'anthropic',
        messages: [{ role: 'user', content: 'Hi' }]
      },
      { onToken: jest.fn() }
    );

    const [url] = global.fetch.mock.calls[0];
    expect(url).toBe('https://proxy.example.com/anthropic/v1/messages');
  });
});
