import { act, renderHook, waitFor } from '@testing-library/react';
import useChatSession from '../../src/chat/useChatSession.js';

function createOptions(api) {
  return {
    setMessages: jest.fn(),
    setGameState: jest.fn(),
    setRuntimeError: jest.fn(),
    isLoading: false,
    persistence: {
      hydrate: jest.fn(), markLoaded: jest.fn(), reset: jest.fn(),
      save: jest.fn(async () => ({ success: true }))
    },
    typewriter: { clearStreaming: jest.fn() },
    onResetView: jest.fn(),
    api
  };
}

describe('useChatSession', () => {
  test('loads messages and game state from the active session', async () => {
    const history = { success: true, messages: [{ role: 'user', content: 'saved' }], gameState: { score: 2 } };
    const api = { getChatHistory: jest.fn(async () => history) };
    const options = createOptions(api);
    renderHook(() => useChatSession(options));
    await waitFor(() => expect(options.setMessages).toHaveBeenCalledWith(history.messages));
    expect(options.setGameState).toHaveBeenCalledWith({ score: 2 });
    expect(options.persistence.hydrate).toHaveBeenCalledWith(history);
    expect(options.persistence.markLoaded).toHaveBeenCalled();
  });

  test('saves, switches, resets, and reloads a session in order', async () => {
    const api = {
      getChatHistory: jest.fn(async () => ({ success: true, messages: [], gameState: {} })),
      setActiveChatSession: jest.fn(async id => ({ success: true, id }))
    };
    const options = createOptions(api);
    const { result } = renderHook(() => useChatSession(options));
    await waitFor(() => expect(api.getChatHistory).toHaveBeenCalledTimes(1));
    await act(async () => { await result.current.switchSession('chapter-2'); });
    expect(options.persistence.save).toHaveBeenCalled();
    expect(api.setActiveChatSession).toHaveBeenCalledWith('chapter-2');
    expect(options.persistence.reset).toHaveBeenCalled();
    expect(options.typewriter.clearStreaming).toHaveBeenCalled();
    expect(api.getChatHistory).toHaveBeenCalledTimes(2);
  });
});
