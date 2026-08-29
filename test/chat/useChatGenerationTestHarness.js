import { renderHook } from '@testing-library/react';
import useChatGeneration from '../../src/renderer/chat/useChatGeneration.js';

function createTypewriter(pushContent) {
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

function renderRetryGeneration(overrides = {}) {
  const retryBaseRef = { current: overrides.retryBaseMessages || [{ role: 'user', content: 'Q' }] };
  const retryBaseStateRef = { current: overrides.retryBaseState ?? {} };
  const persistence = {
    retryBaseRef,
    retryBaseStateRef,
    setRetryBase: jest.fn((messages, state) => {
      retryBaseRef.current = messages;
      retryBaseStateRef.current = state;
    })
  };
  const options = {
    messages: overrides.messages || [{ role: 'user', content: 'Q' }, { role: 'assistant', content: 'old' }],
    setMessages: jest.fn(),
    gameState: overrides.gameState || {},
    setGameState: jest.fn(),
    modelConfig: { apiUrl: 'http://api.example.com/v1', apiKey: 'key', modelName: 'gpt-4' },
    typewriter: overrides.typewriter || createTypewriter(overrides.pushContent),
    persistence,
    isLoading: false,
    setIsLoading: jest.fn(),
    setRuntimeError: jest.fn(),
    setRequestError: jest.fn(),
    setShowStreamThinking: jest.fn(),
    onStreamContentStart: overrides.onStreamContentStart,
    ...overrides.options
  };
  return { ...renderHook(() => useChatGeneration(options)), options, persistence };
}

export { createTypewriter, renderRetryGeneration };
