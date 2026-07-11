import { act, renderHook, waitFor } from '@testing-library/react';
import useChatPersistence from '../../src/chat/useChatPersistence.js';

describe('useChatPersistence', () => {
  test('normalizes retry snapshots and saves all session state together', async () => {
    const api = { saveChatHistory: jest.fn(async () => ({ success: true })) };
    const { result } = renderHook(() => useChatPersistence({
      messages: [{ role: 'user', content: 'current' }],
      gameState: { score: 2 },
      isLoading: false,
      api
    }));
    act(() => result.current.setRetryBase([
      { role: 'system', content: 'temporary', ttl: 1 },
      { role: 'user', content: 'A\n\n---\n<wa2_turn_context>old</wa2_turn_context>' }
    ], { score: 1 }));
    await act(async () => { await result.current.save(); });
    expect(api.saveChatHistory).toHaveBeenCalledWith([{ role: 'user', content: 'current' }], {
      gameState: { score: 2 },
      retryBaseMessages: [{ role: 'user', content: 'A' }],
      retryBaseState: { score: 1 }
    });
  });

  test('auto-saves only after history is loaded and generation is idle', async () => {
    const api = { saveChatHistory: jest.fn(async () => ({ success: true })) };
    const { result, rerender } = renderHook((props) => useChatPersistence({ ...props, api }), {
      initialProps: { messages: [], gameState: {}, isLoading: false }
    });
    rerender({ messages: [{ role: 'user', content: 'before' }], gameState: {}, isLoading: false });
    expect(api.saveChatHistory).not.toHaveBeenCalled();
    act(() => result.current.markLoaded());
    rerender({ messages: [{ role: 'user', content: 'during' }], gameState: {}, isLoading: true });
    expect(api.saveChatHistory).not.toHaveBeenCalled();
    rerender({ messages: [{ role: 'user', content: 'after' }], gameState: { score: 3 }, isLoading: false });
    await waitFor(() => expect(api.saveChatHistory).toHaveBeenLastCalledWith(
      [{ role: 'user', content: 'after' }],
      { gameState: { score: 3 }, retryBaseMessages: null, retryBaseState: null }
    ));
  });

  test('refreshes retry base from the active session', async () => {
    const persisted = { success: true, retryBaseMessages: [{ role: 'user', content: 'Q' }], retryBaseState: { score: 4 } };
    const api = { getChatHistory: jest.fn(async () => persisted) };
    const { result } = renderHook(() => useChatPersistence({ messages: [], gameState: {}, isLoading: false, api }));
    await act(async () => { await result.current.refreshRetryBase(); });
    expect(result.current.retryBaseRef.current).toEqual(persisted.retryBaseMessages);
    expect(result.current.retryBaseStateRef.current).toEqual({ score: 4 });
  });
});
