describe('sendChatRequest protocol adapter integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('sends Anthropic system prompt as a top-level field', async () => {
    global.fetch.mockResolvedValue(global.createAnthropicStreamingMock('ok'));

    await window.sendChatRequest({
      apiUrl: 'https://proxy.example.com/anthropic',
      apiKey: 'sk-ant-test',
      modelName: 'claude-sonnet-4-20250514',
      protocol: 'anthropic',
      messages: [
        { role: 'system', content: 'rules', ttl: 1 },
        { role: 'user', content: 'Hi' }
      ]
    }, { onToken: jest.fn() });

    const [, options] = global.fetch.mock.calls[0];
    const body = JSON.parse(options.body);
    expect(body.system).toBe('rules');
    expect(body.messages).toEqual([{ role: 'user', content: 'Hi' }]);
  });
});
