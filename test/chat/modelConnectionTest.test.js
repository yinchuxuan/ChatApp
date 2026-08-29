const {
  testModelConnection,
  validateConnectionConfig
} = require('../../src/renderer/chat/modelConnectionTest.js');

const OPENAI_CONFIG = {
  apiUrl: 'https://api.example.com/v1',
  apiKey: 'test-key',
  modelName: 'test-model',
  protocol: 'openai',
  maxTokens: '50000',
  temperature: '1',
  topP: '1'
};

describe('model connection test', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('sends a short request through the configured model protocol', async () => {
    global.fetch.mockResolvedValue(global.createStreamingMock('Hi'));

    await testModelConnection(OPENAI_CONFIG);

    const [url, options] = global.fetch.mock.calls[0];
    const body = JSON.parse(options.body);
    expect(url).toBe('https://api.example.com/v1/chat/completions');
    expect(body).toMatchObject({
      model: 'test-model',
      messages: [{ role: 'user', content: 'Hi' }],
      max_tokens: 8,
      stream: true
    });
  });

  test('surfaces provider failures', async () => {
    global.fetch.mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ error: { message: 'Invalid API key' } })
    });

    await expect(testModelConnection(OPENAI_CONFIG)).rejects.toThrow('Invalid API key');
  });

  test('requires all connection fields', () => {
    expect(() => validateConnectionConfig({ apiUrl: 'https://api.example.com' }))
      .toThrow('API Key、模型名称');
  });
});
