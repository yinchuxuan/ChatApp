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

  test('keeps system messages through the chat generation pipeline', async () => {
    const originalPreSend = window.preparePreSendMessages;
    const originalAfterResponse = window.prepareAfterResponseMessages;
    let content = '';
    const tw = {
      clearStreaming: jest.fn(), startStreaming: jest.fn(), finishStreaming: jest.fn(), reset: jest.fn(),
      pushContent: jest.fn(text => { content += text; return true; }),
      getAccumulatedContent: jest.fn(() => content), getThinkingContent: jest.fn(() => '')
    };
    window.preparePreSendMessages = jest.fn(async () => ({
      applied: true,
      messages: [{ role: 'system', content: 'rules' }, { role: 'user', content: 'Hi' }]
    }));
    window.prepareAfterResponseMessages = jest.fn(async () => ({ applied: false }));
    global.fetch.mockResolvedValue(global.createAnthropicStreamingMock('ok'));

    try {
      await window.ChatGeneration.runChatGeneration({
        messages: [{ role: 'user', content: 'Hi' }],
        modelConfig: { apiUrl: 'https://proxy.example.com', apiKey: 'key', protocol: 'anthropic' },
        setMessages: jest.fn(), setIsLoading: jest.fn(), tw
      });
      const body = JSON.parse(global.fetch.mock.calls[0][1].body);
      expect(body.system).toBe('rules');
      expect(body.messages).toEqual([{ role: 'user', content: 'Hi' }]);
    } finally {
      window.preparePreSendMessages = originalPreSend;
      window.prepareAfterResponseMessages = originalAfterResponse;
    }
  });
});
