/**
 * Tests for apiClient - sendChatRequest with OpenAI protocol
 */

describe('sendChatRequest - OpenAI protocol', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch.mockResolvedValue(global.createStreamingMock('Hello from OpenAI'));
  });

  test('should call fetch with OpenAI endpoint and headers', async () => {
    const onToken = jest.fn();
    const onThinkingToken = jest.fn();

    await window.sendChatRequest(
      {
        apiUrl: 'https://api.openai.com/v1',
        apiKey: 'sk-test-key',
        modelName: 'gpt-4',
        messages: [{ role: 'user', content: 'Hello' }]
      },
      { onToken, onThinkingToken }
    );

    expect(global.fetch).toHaveBeenCalled();
    const [url, options] = global.fetch.mock.calls[0];
    expect(url).toBe('https://api.openai.com/v1/chat/completions');
    expect(options.method).toBe('POST');
    expect(options.headers['Authorization']).toBe('Bearer sk-test-key');
    expect(options.headers['Content-Type']).toBe('application/json');

    const body = JSON.parse(options.body);
    expect(body.model).toBe('gpt-4');
    expect(body.messages).toEqual([{ role: 'user', content: 'Hello' }]);
    expect(body.stream).toBe(true);
  });

  test('should use default model when not specified', async () => {
    global.fetch.mockResolvedValue(global.createStreamingMock('Response'));
    const onToken = jest.fn();

    await window.sendChatRequest(
      {
        apiUrl: 'https://api.openai.com/v1',
        apiKey: 'sk-test',
        modelName: '',
        messages: [{ role: 'user', content: 'Hi' }]
      },
      { onToken }
    );

    const [, options] = global.fetch.mock.calls[0];
    const body = JSON.parse(options.body);
    expect(body.model).toBe('gpt-3.5-turbo');
    expect(body.max_tokens).toBe(4096);
    expect(body.temperature).toBe(0.8);
    expect(body.top_p).toBe(0.9);
    expect(body.frequency_penalty).toBe(0);
    expect(body.presence_penalty).toBe(0);
  });

  test('should include supported OpenAI generation parameters only', async () => {
    global.fetch.mockResolvedValue(global.createStreamingMock('Response'));

    await window.sendChatRequest(
      {
        apiUrl: 'https://api.openai.com/v1',
        apiKey: 'sk-test',
        modelName: 'gpt-4',
        maxTokens: '2048',
        temperature: '0.8',
        topP: '0.9',
        frequencyPenalty: '0.2',
        presencePenalty: '0.4',
        topK: '40',
        messages: [{ role: 'user', content: 'Hi' }]
      },
      { onToken: jest.fn() }
    );

    const [, options] = global.fetch.mock.calls[0];
    const body = JSON.parse(options.body);
    expect(body.max_tokens).toBe(2048);
    expect(body.temperature).toBe(0.8);
    expect(body.top_p).toBe(0.9);
    expect(body.frequency_penalty).toBe(0.2);
    expect(body.presence_penalty).toBe(0.4);
    expect(body.top_k).toBeUndefined();
  });
});
