const useRetry = require('../../src/components/useRetry.js');

function createTw() {
  let content = '';
  return {
    clearStreaming: jest.fn(() => { content = ''; }),
    startStreaming: jest.fn(),
    pushContent: jest.fn((text) => { content += text; }),
    finishStreaming: jest.fn(),
    getAccumulatedContent: jest.fn(() => content),
    getThinkingContent: jest.fn(() => ''),
    reset: jest.fn(() => { content = ''; })
  };
}

describe('useRetry state snapshot', () => {
  const originalPreparePreSend = window.preparePreSendMessages;
  const originalToApiMessages = window.toGameCardApiMessages;
  const originalSendChatRequest = window.sendChatRequest;
  const originalPrepareAfterResponse = window.prepareAfterResponseMessages;
  const originalStructuredClone = global.structuredClone;
  afterEach(() => {
    window.preparePreSendMessages = originalPreparePreSend;
    window.toGameCardApiMessages = originalToApiMessages;
    window.sendChatRequest = originalSendChatRequest;
    window.prepareAfterResponseMessages = originalPrepareAfterResponse;
    global.structuredClone = originalStructuredClone;
  });
  test('keeps timeline base state but reruns random pre_send rules', async () => {
    const randomValues = [11, 88], setGameState = jest.fn();
    window.preparePreSendMessages = jest.fn(async ({ messages, state }) => ({
      applied: true,
      card: { id: 'card' },
      messages,
      state: { ...state, temp: { plotDirectionRoll: randomValues.shift() } }
    }));
    window.toGameCardApiMessages = jest.fn(messages => messages);
    window.sendChatRequest = jest.fn(async (_payload, callbacks) => callbacks.onToken('retry answer'));
    window.prepareAfterResponseMessages = jest.fn(async ({ messages, state }) => ({ applied: false, messages, state }));

    const retry = useRetry(
      { useCallback: (fn) => fn },
      [{ role: 'user', content: 'Q' }, { role: 'assistant', content: 'old' }],
      jest.fn(),
      { apiUrl: 'http://api.example.com/v1', apiKey: 'key' },
      jest.fn(),
      createTw(),
      { current: [{ role: 'user', content: 'Q' }] },
      { timeline: { currentTime: 'advanced-time' } },
      setGameState,
      { current: { timeline: { currentTime: 'old-time' } } }
    );
    await retry();
    await retry();

    expect(window.preparePreSendMessages.mock.calls.map(call => call[0].state)).toEqual([
      { timeline: { currentTime: 'old-time' } },
      { timeline: { currentTime: 'old-time' } }
    ]);
    expect(setGameState).toHaveBeenCalledWith({ timeline: { currentTime: 'old-time' }, temp: { plotDirectionRoll: 11 } });
    expect(setGameState).toHaveBeenLastCalledWith({ timeline: { currentTime: 'old-time' }, temp: { plotDirectionRoll: 88 } });
  });

  test('does not fall back to current advanced gameState when retry base state is missing', async () => {
    window.preparePreSendMessages = jest.fn(async ({ messages, state }) => ({
      applied: false,
      card: { id: 'card' },
      messages,
      state
    }));
    window.toGameCardApiMessages = jest.fn(messages => messages);
    window.sendChatRequest = jest.fn(async (_payload, callbacks) => callbacks.onToken('retry answer'));
    window.prepareAfterResponseMessages = jest.fn(async ({ messages, state }) => ({ applied: false, messages, state }));

    const retry = useRetry(
      { useCallback: (fn) => fn },
      [{ role: 'user', content: 'Q' }, { role: 'assistant', content: 'old' }],
      jest.fn(),
      { apiUrl: 'http://api.example.com/v1', apiKey: 'key' },
      jest.fn(),
      createTw(),
      { current: [{ role: 'user', content: 'Q' }] },
      { timeline: { currentTime: 'advanced-time' } },
      jest.fn(),
      { current: null }
    );
    await retry();

    expect(window.preparePreSendMessages.mock.calls[0][0].state).toEqual({});
  });

  test('refreshes retry base from persisted session before retrying', async () => {
    window.electronAPI.getChatHistory.mockResolvedValueOnce({
      success: true,
      retryBaseMessages: [{ role: 'user', content: 'Q' }],
      retryBaseState: { timeline: { currentTime: '2007.10.21: 10:30 星期日' } }
    });
    window.preparePreSendMessages = jest.fn(async ({ messages, state }) => ({
      applied: false,
      card: { id: 'card' },
      messages,
      state
    }));
    window.toGameCardApiMessages = jest.fn(messages => messages);
    window.sendChatRequest = jest.fn(async (_payload, callbacks) => callbacks.onToken('retry answer'));
    window.prepareAfterResponseMessages = jest.fn(async ({ messages, state }) => ({ applied: false, messages, state }));

    const retry = useRetry(
      { useCallback: (fn) => fn },
      [{ role: 'user', content: 'Q' }, { role: 'assistant', content: 'old' }],
      jest.fn(),
      { apiUrl: 'http://api.example.com/v1', apiKey: 'key' },
      jest.fn(),
      createTw(),
      { current: [{ role: 'user', content: 'Q' }] },
      { timeline: { currentTime: 'advanced-time' } },
      jest.fn(),
      { current: { timeline: { currentTime: '2007.10.21: 08:00 星期日' } } }
    );
    await retry();

    expect(window.preparePreSendMessages.mock.calls[0][0].state).toEqual({
      timeline: { currentTime: '2007.10.21: 10:30 星期日' }
    });
  });

  test('removes transient turn context before rerunning pre_send', async () => {
    window.electronAPI.getChatHistory.mockResolvedValueOnce({
      success: true,
      retryBaseMessages: [
        { role: 'system', content: 'old state 08:00', ttl: 1, _meta: { source: 'wa2_state_context' } },
        { role: 'user', content: '选择A\n\n---\n<wa2_turn_context>\n旧上下文\n</wa2_turn_context>' }
      ],
      retryBaseState: { timeline: { currentTime: '2007.10.21: 10:30 星期日' } }
    });
    window.preparePreSendMessages = jest.fn(async ({ messages, state }) => ({
      applied: false,
      card: { id: 'card' },
      messages,
      state
    }));
    window.toGameCardApiMessages = jest.fn(messages => messages);
    window.sendChatRequest = jest.fn(async (_payload, callbacks) => callbacks.onToken('retry answer'));
    window.prepareAfterResponseMessages = jest.fn(async ({ messages, state }) => ({ applied: false, messages, state }));

    const retry = useRetry(
      { useCallback: (fn) => fn },
      [{ role: 'user', content: '选择A' }, { role: 'assistant', content: 'old' }],
      jest.fn(),
      { apiUrl: 'http://api.example.com/v1', apiKey: 'key' },
      jest.fn(),
      createTw(),
      { current: [] },
      {},
      jest.fn(),
      { current: {} }
    );
    await retry();

    expect(window.preparePreSendMessages.mock.calls[0][0].messages).toEqual([
      { role: 'user', content: '选择A' }
    ]);
  });

  test('does not rely on structuredClone for persisted retry state', async () => {
    global.structuredClone = jest.fn(() => ({}));
    window.electronAPI.getChatHistory.mockResolvedValueOnce({
      success: true,
      retryBaseMessages: [{ role: 'user', content: 'Q' }],
      retryBaseState: { timeline: { currentTime: '2007.10.21: 10:30 星期日' } }
    });
    window.preparePreSendMessages = jest.fn(async ({ messages, state }) => ({
      applied: false,
      card: { id: 'card' },
      messages,
      state
    }));
    window.toGameCardApiMessages = jest.fn(messages => messages);
    window.sendChatRequest = jest.fn(async (_payload, callbacks) => callbacks.onToken('retry answer'));
    window.prepareAfterResponseMessages = jest.fn(async ({ messages, state }) => ({ applied: false, messages, state }));

    const retry = useRetry(
      { useCallback: (fn) => fn },
      [{ role: 'user', content: 'Q' }, { role: 'assistant', content: 'old' }],
      jest.fn(),
      { apiUrl: 'http://api.example.com/v1', apiKey: 'key' },
      jest.fn(),
      createTw(),
      { current: [] },
      {},
      jest.fn(),
      { current: {} }
    );
    await retry();

    expect(window.preparePreSendMessages.mock.calls[0][0].state).toEqual({
      timeline: { currentTime: '2007.10.21: 10:30 星期日' }
    });
  });
});
