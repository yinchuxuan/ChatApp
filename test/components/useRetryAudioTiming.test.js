const useRetry = require('../../src/components/useRetry.js');

function createTw(pushContent) {
  let content = '';
  return {
    clearStreaming: jest.fn(() => { content = ''; }),
    startStreaming: jest.fn(),
    pushContent: jest.fn((text, type) => {
      const result = pushContent ? pushContent(text, type) : text;
      if (type !== 'reasoning') content += text;
      return result;
    }),
    finishStreaming: jest.fn(),
    getAccumulatedContent: jest.fn(() => content),
    getThinkingContent: jest.fn(() => ''),
    reset: jest.fn(() => { content = ''; })
  };
}

function setupRetry(tw, onStreamContentStart) {
  window.preparePreSendMessages = jest.fn(async ({ messages, state }) => ({
    applied: false,
    card: { id: 'card' },
    messages,
    state
  }));
  window.toGameCardApiMessages = jest.fn(messages => messages);
  window.prepareAfterResponseMessages = jest.fn(async ({ messages, state }) => ({ applied: false, messages, state }));
  return useRetry(
    { useCallback: (fn) => fn },
    [{ role: 'user', content: 'Q' }, { role: 'assistant', content: 'old' }],
    jest.fn(),
    { apiUrl: 'http://api.example.com/v1', apiKey: 'key' },
    jest.fn(),
    tw,
    { current: [{ role: 'user', content: 'Q' }] },
    {},
    jest.fn(),
    { current: {} },
    onStreamContentStart
  );
}

describe('useRetry audio timing hooks', () => {
  const originalPreparePreSend = window.preparePreSendMessages;
  const originalToApiMessages = window.toGameCardApiMessages;
  const originalSendChatRequest = window.sendChatRequest;
  const originalPrepareAfterResponse = window.prepareAfterResponseMessages;

  afterEach(() => {
    window.preparePreSendMessages = originalPreparePreSend;
    window.toGameCardApiMessages = originalToApiMessages;
    window.sendChatRequest = originalSendChatRequest;
    window.prepareAfterResponseMessages = originalPrepareAfterResponse;
  });

  test('notifies once when retry body content starts streaming', async () => {
    const onStreamContentStart = jest.fn();
    const tw = createTw(() => 'body');
    window.sendChatRequest = jest.fn(async (_payload, callbacks) => {
      callbacks.onToken('first');
      callbacks.onToken('second');
    });

    await setupRetry(tw, onStreamContentStart)();

    expect(onStreamContentStart).toHaveBeenCalledTimes(1);
  });

  test('does not notify for retry thinking-only tokens', async () => {
    const onStreamContentStart = jest.fn();
    const tw = createTw(() => '');
    window.sendChatRequest = jest.fn(async (_payload, callbacks) => {
      callbacks.onThinkingToken('thinking');
    });

    await setupRetry(tw, onStreamContentStart)();

    expect(onStreamContentStart).not.toHaveBeenCalled();
  });
});
