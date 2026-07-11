import { act, renderHook } from '@testing-library/react';
import useChatGeneration from '../../src/chat/useChatGeneration.js';

test('useChatGeneration saves retry base without transient context', async () => {
  global.fetch.mockResolvedValue(global.createStreamingMock('ok'));
  const setRetryBase = jest.fn();
  const messages = [
    { role: 'system', content: 'old state 08:00', ttl: 1, _meta: { source: 'wa2_state_context' } },
    { role: 'user', content: '旧选择\n\n---\n<wa2_turn_context>\n旧上下文\n</wa2_turn_context>' },
    { role: 'assistant', content: 'old answer' }
  ];
  let content = '';
  const typewriter = {
    clearStreaming: jest.fn(() => { content = ''; }), startStreaming: jest.fn(),
    pushContent: jest.fn(text => { content += text; return text; }), finishStreaming: jest.fn(),
    getAccumulatedContent: jest.fn(() => content), getThinkingContent: jest.fn(() => ''), reset: jest.fn()
  };
  const { result } = renderHook(() => useChatGeneration({
    messages,
    setMessages: jest.fn(),
    gameState: { score: 1 },
    setGameState: jest.fn(),
    modelConfig: { apiUrl: 'https://api.example.com/v1', apiKey: 'key', modelName: 'gpt-4' },
    typewriter,
    persistence: {
      retryBaseRef: { current: null }, retryBaseStateRef: { current: null },
      setRetryBase, refreshRetryBase: jest.fn(async () => null)
    },
    isLoading: false,
    setIsLoading: jest.fn(),
    setRuntimeError: jest.fn(),
    setShowStreamThinking: jest.fn()
  }));

  await act(async () => { await result.current.send('新选择'); });
  expect(setRetryBase).toHaveBeenCalledWith([...messages, { role: 'user', content: '新选择' }], { score: 1 });
});
