import { act, renderHook, waitFor } from '@testing-library/react';
import useChatPersistence from '../../src/renderer/chat/useChatPersistence.js';

describe('useChatPersistence', () => {
  test('normalizes retry snapshots and saves all session state together', async () => {
    const repository = { saveHistory: jest.fn(async () => ({})) };
    const { result } = renderHook(() => useChatPersistence({
      messages: [{ role: 'user', content: 'current' }],
      gameState: { score: 2 },
      isLoading: false,
      repository
    }));
    act(() => result.current.setRetryBase([
      { role: 'system', content: 'temporary', ttl: 1 },
      { role: 'user', content: 'A\n\n---\n<wa2_turn_context>old</wa2_turn_context>' }
    ], { score: 1 }));
    await act(async () => { await result.current.save(); });
    expect(repository.saveHistory).toHaveBeenCalledWith([{ role: 'user', content: 'current' }], {
      gameState: { score: 2 },
      retryBaseMessages: [{ role: 'user', content: 'A' }],
      retryBaseState: { score: 1 },
      viewState: {}
    });
  });

  test('auto-saves only after history is loaded and generation is idle', async () => {
    const repository = { saveHistory: jest.fn(async () => ({})) };
    const { result, rerender } = renderHook((props) => useChatPersistence({ ...props, repository }), {
      initialProps: { messages: [], gameState: {}, isLoading: false }
    });
    rerender({ messages: [{ role: 'user', content: 'before' }], gameState: {}, isLoading: false });
    expect(repository.saveHistory).not.toHaveBeenCalled();
    act(() => result.current.markLoaded());
    rerender({ messages: [{ role: 'user', content: 'during' }], gameState: {}, isLoading: true });
    expect(repository.saveHistory).not.toHaveBeenCalled();
    rerender({ messages: [{ role: 'user', content: 'after' }], gameState: { score: 3 }, isLoading: false });
    await waitFor(() => expect(repository.saveHistory).toHaveBeenLastCalledWith(
      [{ role: 'user', content: 'after' }],
      { gameState: { score: 3 }, retryBaseMessages: null, retryBaseState: null, viewState: {} }
    ));
  });

  test('hydrates and saves the current segmented reading position', async () => {
    const repository = { saveHistory: jest.fn(async () => ({})) };
    const { result } = renderHook(() => useChatPersistence({
      messages: [{ id: 'reply', role: 'assistant', content: 'response' }],
      gameState: { score: 2 }, isLoading: false, repository
    }));
    act(() => result.current.hydrate({
      viewState: { reading: { messageId: 'reply', segmentIndex: 2 } }
    }));
    expect(result.current.readingPosition).toEqual({ messageId: 'reply', segmentIndex: 2 });

    act(() => result.current.setReadingPosition({ messageId: 'reply', segmentIndex: 3 }));
    await act(async () => { await result.current.save(); });
    expect(repository.saveHistory).toHaveBeenLastCalledWith(expect.any(Array),
      expect.objectContaining({
        gameState: { score: 2 },
        viewState: { reading: { messageId: 'reply', segmentIndex: 3 } }
      }));
  });

  test('does not auto-save stale session data while a new session is loading', async () => {
    const repository = { saveHistory: jest.fn(async () => ({})) };
    const { result } = renderHook(() => useChatPersistence({
      messages: [{ role: 'user', content: 'old session' }],
      gameState: { score: 9 }, isLoading: false, repository
    }));
    act(() => result.current.markLoaded());
    act(() => result.current.reset());
    await act(async () => { await Promise.resolve(); });

    expect(repository.saveHistory).not.toHaveBeenCalled();
  });

  test('hydrates retry base with the active session', () => {
    const persisted = { retryBaseMessages: [{ role: 'user', content: 'Q' }], retryBaseState: { score: 4 } };
    const repository = { saveHistory: jest.fn() };
    const { result } = renderHook(() => useChatPersistence({ messages: [], gameState: {}, isLoading: false, repository }));
    act(() => result.current.hydrate(persisted));
    expect(result.current.retryBaseRef.current).toEqual(persisted.retryBaseMessages);
    expect(result.current.retryBaseStateRef.current).toEqual({ score: 4 });
  });
});
