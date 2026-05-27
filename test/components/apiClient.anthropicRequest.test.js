/**
 * Tests for apiClient - sendChatRequest with Anthropic protocol
 */

describe('sendChatRequest - Anthropic protocol', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should call fetch with Anthropic endpoint and headers', async () => {
    global.fetch.mockResolvedValue(global.createAnthropicStreamingMock('Hello from Claude'));
    const onToken = jest.fn();
    const onThinkingToken = jest.fn();

    await window.sendChatRequest(
      {
        apiUrl: 'https://proxy.example.com/anthropic',
        apiKey: 'sk-ant-test-key',
        modelName: 'claude-sonnet-4-20250514',
        protocol: 'anthropic',
        messages: [{ role: 'user', content: 'Hello Claude' }]
      },
      { onToken, onThinkingToken }
    );

    expect(global.fetch).toHaveBeenCalled();
    const [url, options] = global.fetch.mock.calls[0];
    expect(url).toBe('https://proxy.example.com/anthropic/v1/messages');
    expect(options.method).toBe('POST');
    expect(options.headers['x-api-key']).toBe('sk-ant-test-key');
    expect(options.headers['anthropic-version']).toBe('2023-06-01');
    expect(options.headers['Content-Type']).toBe('application/json');

    const body = JSON.parse(options.body);
    expect(body.model).toBe('claude-sonnet-4-20250514');
    expect(body.messages).toEqual([{ role: 'user', content: 'Hello Claude' }]);
    expect(body.stream).toBe(true);
    expect(body.max_tokens).toBe(4096);
  });

  test('should use default Anthropic model when not specified', async () => {
    global.fetch.mockResolvedValue(global.createAnthropicStreamingMock('Response'));

    await window.sendChatRequest(
      {
        apiUrl: 'https://proxy.example.com/anthropic',
        apiKey: 'sk-ant-test',
        modelName: '',
        protocol: 'anthropic',
        messages: [{ role: 'user', content: 'Hi' }]
      },
      { onToken: jest.fn() }
    );

    const [, options] = global.fetch.mock.calls[0];
    const body = JSON.parse(options.body);
    expect(body.model).toBe('claude-sonnet-4-20250514');
    expect(body.max_tokens).toBe(4096);
    expect(body.temperature).toBe(0.8);
    expect(body.top_p).toBe(0.9);
    expect(body.frequency_penalty).toBeUndefined();
    expect(body.presence_penalty).toBeUndefined();
  });

  test('should include supported Anthropic generation parameters only', async () => {
    global.fetch.mockResolvedValue(global.createAnthropicStreamingMock('Response'));

    await window.sendChatRequest(
      {
        apiUrl: 'https://proxy.example.com/anthropic',
        apiKey: 'sk-ant-test',
        modelName: 'claude-sonnet-4-20250514',
        protocol: 'anthropic',
        maxTokens: '1024',
        temperature: '0.7',
        topP: '0.95',
        frequencyPenalty: '0.2',
        presencePenalty: '0.4',
        messages: [{ role: 'user', content: 'Hi' }]
      },
      { onToken: jest.fn() }
    );

    const [, options] = global.fetch.mock.calls[0];
    const body = JSON.parse(options.body);
    expect(body.max_tokens).toBe(1024);
    expect(body.temperature).toBe(0.7);
    expect(body.top_p).toBe(0.95);
    expect(body.frequency_penalty).toBeUndefined();
    expect(body.presence_penalty).toBeUndefined();
  });

  test('should parse Anthropic SSE streaming tokens', async () => {
    global.fetch.mockResolvedValue(global.createAnthropicStreamingMock('Hello from streaming'));
    const onToken = jest.fn();
    const onThinkingToken = jest.fn();

    await window.sendChatRequest(
      {
        apiUrl: 'https://proxy.example.com/anthropic',
        apiKey: 'sk-ant-test',
        modelName: 'claude-sonnet-4-20250514',
        protocol: 'anthropic',
        messages: [{ role: 'user', content: 'Hi' }]
      },
      { onToken, onThinkingToken }
    );

    expect(onToken).toHaveBeenCalled();
    const allTokens = onToken.mock.calls.map(c => c[0]).join('');
    expect(allTokens).toBe('Hello from streaming');
  });

  test('should parse Anthropic SSE thinking tokens', async () => {
    global.fetch.mockResolvedValue(
      global.createAnthropicThinkingStreamingMock('Let me think about this', 'Here is my answer')
    );
    const onToken = jest.fn();
    const onThinkingToken = jest.fn();

    await window.sendChatRequest(
      {
        apiUrl: 'https://proxy.example.com/anthropic',
        apiKey: 'sk-ant-test',
        modelName: 'claude-sonnet-4-20250514',
        protocol: 'anthropic',
        messages: [{ role: 'user', content: 'Complex question' }]
      },
      { onToken, onThinkingToken }
    );

    expect(onThinkingToken).toHaveBeenCalledWith('Let me think about this');
    expect(onToken).toHaveBeenCalled();
    const allText = onToken.mock.calls.map(c => c[0]).join('');
    expect(allText).toBe('Here is my answer');
  });

  test('should handle Anthropic API errors', async () => {
    global.fetch.mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ error: { message: 'Invalid API key' } })
    });

    await expect(
      window.sendChatRequest(
        {
          apiUrl: 'https://proxy.example.com/anthropic',
          apiKey: 'bad-key',
          modelName: 'claude-sonnet-4-20250514',
          protocol: 'anthropic',
          messages: [{ role: 'user', content: 'Hi' }]
        },
        { onToken: jest.fn() }
      )
    ).rejects.toThrow('Invalid API key');
  });
});
