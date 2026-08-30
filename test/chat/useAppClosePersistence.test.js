import { act, renderHook, waitFor } from '@testing-library/react';
import useAppClosePersistence from '../../src/renderer/chat/useAppClosePersistence.js';

describe('useAppClosePersistence', () => {
  test('stops generation and flushes chat state before destroying the window', async () => {
    let closeHandler;
    let finishStop;
    const unlisten = jest.fn();
    const order = [];
    const windowService = {
      onCloseRequested: jest.fn(handler => {
        closeHandler = handler;
        return unlisten;
      }),
      destroy: jest.fn(async () => { order.push('destroy'); })
    };
    const stopGeneration = jest.fn(async () => {
      order.push('stop');
      await new Promise(resolve => { finishStop = resolve; });
    });
    const flush = jest.fn(async () => { order.push('flush'); });
    const { unmount } = renderHook(() => useAppClosePersistence({
      stopGeneration, flush, windowService
    }));
    await waitFor(() => expect(closeHandler).toEqual(expect.any(Function)));
    const event = { preventDefault: jest.fn() };

    let closing;
    act(() => { closing = closeHandler(event); });
    expect(event.preventDefault).toHaveBeenCalledTimes(1);
    expect(windowService.destroy).not.toHaveBeenCalled();
    await act(async () => {
      finishStop();
      await closing;
    });

    expect(order).toEqual(['stop', 'flush', 'destroy']);
    unmount();
    expect(unlisten).toHaveBeenCalledTimes(1);
  });
});
