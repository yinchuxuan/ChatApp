const { sendChatRequest } = require('../../src/components/apiClient.js');
const { runChatGeneration } = require('../../src/chat/chatGeneration.js');
const generationServices = require('../../src/chat/generationServices.js').default;

describe('sendChatRequest protocol adapter integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('sends Anthropic system prompt as a top-level field', async () => {
    global.fetch.mockResolvedValue(global.createAnthropicStreamingMock('ok'));

    await sendChatRequest({
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
    const originalPreSend = generationServices.preparePreSendMessages;
    const originalAfterResponse = generationServices.prepareAfterResponseMessages;
    let content = '';
    const tw = {
      clearStreaming: jest.fn(), startStreaming: jest.fn(), finishStreaming: jest.fn(), reset: jest.fn(),
      pushContent: jest.fn(text => { content += text; return true; }),
      getAccumulatedContent: jest.fn(() => content), getThinkingContent: jest.fn(() => '')
    };
    generationServices.preparePreSendMessages = jest.fn(async () => ({
      applied: true,
      messages: [{ role: 'system', content: 'rules' }, { role: 'user', content: 'Hi' }]
    }));
    generationServices.prepareAfterResponseMessages = jest.fn(async () => ({ applied: false }));
    global.fetch.mockResolvedValue(global.createAnthropicStreamingMock('ok'));

    try {
      await runChatGeneration({
        messages: [{ role: 'user', content: 'Hi' }],
        modelConfig: { apiUrl: 'https://proxy.example.com', apiKey: 'key', protocol: 'anthropic' },
        setMessages: jest.fn(), setIsLoading: jest.fn(), tw
      });
      const body = JSON.parse(global.fetch.mock.calls[0][1].body);
      expect(body.system).toBe('rules');
      expect(body.messages).toEqual([{ role: 'user', content: 'Hi' }]);
    } finally {
      generationServices.preparePreSendMessages = originalPreSend;
      generationServices.prepareAfterResponseMessages = originalAfterResponse;
    }
  });
});
