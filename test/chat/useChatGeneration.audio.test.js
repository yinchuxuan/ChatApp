import { act, renderHook } from '@testing-library/react';
import useChatGeneration from '../../src/renderer/chat/useChatGeneration.js';

function renderGeneration({ pushResult = 'ok', onAudioSubmit = jest.fn(), onStreamContentStart = jest.fn() } = {}) {
  let content = '';
  const typewriter = {
    clearStreaming: jest.fn(() => { content = ''; }),
    startStreaming: jest.fn(),
    pushContent: jest.fn((text, type) => {
      if (type !== 'reasoning') content += text;
      return pushResult;
    }),
    finishStreaming: jest.fn(),
    getAccumulatedContent: jest.fn(() => content),
    getThinkingContent: jest.fn(() => ''),
    reset: jest.fn()
  };
  const options = {
    messages: [],
    setMessages: jest.fn(),
    gameState: {},
    setGameState: jest.fn(),
    modelConfig: { apiUrl: 'https://api.example.com/v1', apiKey: 'key', modelName: 'gpt-4' },
    typewriter,
    persistence: {
      retryBaseRef: { current: null }, retryBaseStateRef: { current: null },
      setRetryBase: jest.fn(), refreshRetryBase: jest.fn(async () => null)
    },
    isLoading: false,
    setIsLoading: jest.fn(),
    setRuntimeError: jest.fn(),
    setShowStreamThinking: jest.fn(),
    onAudioSubmit,
    onStreamContentStart
  };
  return { ...renderHook(() => useChatGeneration(options)), onAudioSubmit, onStreamContentStart, typewriter };
}

describe('useChatGeneration audio timing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch.mockResolvedValue(global.createStreamingMock('ok'));
  });

  test('does not stop audio before a message is submitted', () => {
    const { onAudioSubmit } = renderGeneration();
    expect(onAudioSubmit).not.toHaveBeenCalled();
  });

  test('stops audio when a message is submitted', async () => {
    const { result, onAudioSubmit } = renderGeneration();
    await act(async () => { await result.current.send('hello'); });
    expect(onAudioSubmit).toHaveBeenCalledTimes(1);
  });

  test('resumes audio when response body starts streaming', async () => {
    const { result, onStreamContentStart } = renderGeneration();
    await act(async () => { await result.current.send('hello'); });
    expect(onStreamContentStart).toHaveBeenCalledTimes(1);
  });

  test('does not resume audio before body content is accepted', async () => {
    const { result, onStreamContentStart } = renderGeneration({ pushResult: '' });
    await act(async () => { await result.current.send('hello'); });
    expect(onStreamContentStart).not.toHaveBeenCalled();
  });
});
