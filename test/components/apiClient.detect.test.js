/**
 * Tests for apiClient - Protocol routing via config.protocol field
 */

describe('sendChatRequest - protocol routing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should use OpenAI protocol when config.protocol is "openai"', async () => {
    global.fetch.mockResolvedValue(global.createStreamingMock('Hello'));

    await window.sendChatRequest(
      {
        apiUrl: 'https://proxy.example.com/v1',
        apiKey: 'sk-test',
        modelName: 'gpt-4',
        protocol: 'openai',
        messages: [{ role: 'user', content: 'Hi' }]
      },
      { onToken: jest.fn() }
    );

    const [url, options] = global.fetch.mock.calls[0];
    expect(url).toBe('https://proxy.example.com/v1/chat/completions');
    expect(options.headers['Authorization']).toBe('Bearer sk-test');
  });

  test('should use Anthropic protocol when config.protocol is "anthropic"', async () => {
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

    const [url, options] = global.fetch.mock.calls[0];
    expect(url).toBe('https://proxy.example.com/anthropic/v1/messages');
    expect(options.headers['x-api-key']).toBe('sk-ant-test');
  });

  test('should default to OpenAI protocol when config.protocol is missing', async () => {
    global.fetch.mockResolvedValue(global.createStreamingMock('Hello'));

    await window.sendChatRequest(
      {
        apiUrl: 'https://proxy.example.com/v1',
        apiKey: 'sk-test',
        modelName: 'gpt-4',
        messages: [{ role: 'user', content: 'Hi' }]
      },
      { onToken: jest.fn() }
    );

    const [url] = global.fetch.mock.calls[0];
    expect(url).toBe('https://proxy.example.com/v1/chat/completions');
  });
});
