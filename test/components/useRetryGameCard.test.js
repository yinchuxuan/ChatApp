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

describe('useRetry game card pipeline', () => {
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

  test('retries from the saved user-turn snapshot and reapplies rules', async () => {
    const R = { useCallback: (fn) => fn };
    const modelConfig = {
      apiUrl: 'http://api.example.com/v1',
      apiKey: 'test-key',
      modelName: 'gpt-4',
      protocol: 'openai'
    };
    const dirtyMessages = [
      { role: 'system', content: 'old rules', _meta: { visibility: 'llm_only' } },
      { role: 'user', content: 'Question' },
      { role: 'assistant', content: 'Old answer' },
      { role: 'system', content: 'old after', _meta: { source: 'game_card' } }
    ];
    const retryBaseRef = { current: [{ role: 'user', content: 'Question' }] };
    const setMessages = jest.fn();
    const setIsLoading = jest.fn();
    const tw = createTw();

    window.preparePreSendMessages = jest.fn(async ({ messages }) => ({
      applied: true,
      card: { id: 'card' },
      messages: [
        { role: 'system', content: 'new rules', _meta: { visibility: 'llm_only' } },
        ...messages
      ]
    }));
    window.toGameCardApiMessages = jest.fn((messages) =>
      messages.map(msg => ({ role: msg.role, content: msg.content }))
    );
    window.sendChatRequest = jest.fn(async (_payload, callbacks) => {
      callbacks.onToken('New answer');
    });
    window.prepareAfterResponseMessages = jest.fn(async ({ messages }) => ({
      applied: true,
      messages: [
        ...messages,
        { role: 'system', content: 'new after', _meta: { source: 'game_card' } }
      ]
    }));

    const retry = useRetry(R, dirtyMessages, setMessages, modelConfig, setIsLoading, tw, retryBaseRef);
    await retry();

    expect(window.preparePreSendMessages).toHaveBeenCalledWith({
      messages: [{ role: 'user', content: 'Question' }],
      state: {}
    });
    expect(window.sendChatRequest.mock.calls[0][0].messages).toEqual([
      { role: 'system', content: 'new rules' },
      { role: 'user', content: 'Question' }
    ]);
    expect(window.prepareAfterResponseMessages.mock.calls[0][0].messages).toEqual([
      { role: 'system', content: 'new rules', _meta: { visibility: 'llm_only' } },
      { role: 'user', content: 'Question' },
      { role: 'assistant', content: 'New answer', _thinking: '', thinking: '' }
    ]);
    expect(setMessages).toHaveBeenLastCalledWith([
      { role: 'system', content: 'new rules', _meta: { visibility: 'llm_only' } },
      { role: 'user', content: 'Question' },
      { role: 'assistant', content: 'New answer', _thinking: '', thinking: '' },
      { role: 'system', content: 'new after', _meta: { source: 'game_card' } }
    ]);
  });

  test('retries from saved gameState and stores returned state', async () => {
    const R = { useCallback: (fn) => fn };
    const modelConfig = { apiUrl: 'http://api.example.com/v1', apiKey: 'key' };
    const retryBaseStateRef = { current: { score: 5 } };
    const setGameState = jest.fn();
    const tw = createTw();

    window.preparePreSendMessages = jest.fn(async ({ messages, state }) => ({
      applied: false,
      card: { id: 'card' },
      messages,
      state: { score: state.score + 1 }
    }));
    window.toGameCardApiMessages = jest.fn(messages => messages);
    window.sendChatRequest = jest.fn(async (_payload, callbacks) => callbacks.onToken('answer'));
    window.prepareAfterResponseMessages = jest.fn(async ({ messages, state }) => ({
      applied: false,
      messages,
      state: { score: state.score + 10 }
    }));

    const retry = useRetry(
      R,
      [{ role: 'user', content: 'Q' }, { role: 'assistant', content: 'old' }],
      jest.fn(),
      modelConfig,
      jest.fn(),
      tw,
      { current: [{ role: 'user', content: 'Q' }] },
      { score: 99 },
      setGameState,
      retryBaseStateRef
    );
    await retry();

    expect(window.preparePreSendMessages.mock.calls[0][0].state).toEqual({ score: 5 });
    expect(window.prepareAfterResponseMessages.mock.calls[0][0].state).toEqual({ score: 6 });
    expect(setGameState).toHaveBeenLastCalledWith({ score: 16 });
  });
});
