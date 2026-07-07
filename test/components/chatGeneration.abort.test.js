const ChatGeneration = require('../../src/components/chatGeneration.js');

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
    originalSendChatRequest = window.sendChatRequest;
    originalAfterResponse = window.prepareAfterResponseMessages;
  });
  afterEach(() => {
    window.sendChatRequest = originalSendChatRequest;
    window.prepareAfterResponseMessages = originalAfterResponse;
  });

  test('passes abort signal and stores partial output without an error message', async () => {
    const signal = { aborted: false };
    const setMessages = jest.fn(), setIsLoading = jest.fn(), tw = makeTypewriter();
    window.prepareAfterResponseMessages = jest.fn();
    window.sendChatRequest = jest.fn(async (config, callbacks) => {
      expect(config.signal).toBe(signal);
      callbacks.onToken('partial answer');
      signal.aborted = true;
      const error = new Error('The operation was aborted');
      error.name = 'AbortError';
      throw error;
    });

    const ok = await ChatGeneration.runChatGeneration({
      messages: [{ role: 'user', content: 'hello' }],
      modelConfig: { apiUrl: 'https://api.example.com/v1', apiKey: 'key', modelName: 'gpt-4' },
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
      { role: 'assistant', content: 'partial answer', _thinking: '', thinking: '' }
    ]);
    expect(tw.reset).not.toHaveBeenCalled();
    expect(window.prepareAfterResponseMessages).not.toHaveBeenCalled();
  });
});
