const ChatGeneration = require('../../src/renderer/chat/chatGeneration.js');
const generationServices = require('../../src/renderer/chat/generationServices.js').default;

function makeTypewriter(content = 'partial answer') {
  return {
    clearStreaming: jest.fn(),
    startStreaming: jest.fn(),
    pushContent: jest.fn(() => content),
    finishStreaming: jest.fn(),
    getAccumulatedContent: jest.fn(() => content),
    getThinkingContent: jest.fn(() => ''),
    reset: jest.fn()
  };
}

describe('ChatGeneration abort handling', () => {
  let originalSendChatRequest, originalAfterResponse;
  beforeEach(() => {
    originalSendChatRequest = generationServices.sendChatRequest;
    originalAfterResponse = generationServices.prepareAfterResponseMessages;
  });
  afterEach(() => {
    generationServices.sendChatRequest = originalSendChatRequest;
    generationServices.prepareAfterResponseMessages = originalAfterResponse;
  });

  test('passes abort signal and stores partial output without an error message', async () => {
    const signal = { aborted: false };
    const setMessages = jest.fn(), setIsLoading = jest.fn(), tw = makeTypewriter();
    generationServices.prepareAfterResponseMessages = jest.fn();
    generationServices.sendChatRequest = jest.fn(async (config, callbacks) => {
      expect(config.signal).toBe(signal);
      expect(config.reasoningEffort).toBe('high');
      callbacks.onToken('partial answer');
      signal.aborted = true;
      const error = new Error('The operation was aborted');
      error.name = 'AbortError';
      throw error;
    });

    const ok = await ChatGeneration.runChatGeneration({
      messages: [{ role: 'user', content: 'hello' }],
      modelConfig: {
        apiUrl: 'https://api.example.com/v1', apiKey: 'key', modelName: 'gpt-4', reasoningEffort: 'high'
      },
      setMessages,
      setIsLoading,
      tw,
      createAbortSignal: jest.fn(() => signal),
      clearAbortSignal: jest.fn()
    });

    expect(ok).toBe(true);
    expect(setIsLoading).toHaveBeenLastCalledWith(false);
    expect(setMessages).toHaveBeenLastCalledWith([
      { role: 'user', content: 'hello' },
      expect.objectContaining({ role: 'assistant', content: 'partial answer', _thinking: '', thinking: '' })
    ]);
    expect(tw.reset).not.toHaveBeenCalled();
    expect(generationServices.prepareAfterResponseMessages).not.toHaveBeenCalled();
  });
});
