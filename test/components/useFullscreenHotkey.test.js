import { act, renderHook } from '@testing-library/react';
import useFullscreenHotkey from '../../src/renderer/useFullscreenHotkey.js';

describe('fullscreen hotkey', () => {
  test('toggles native fullscreen with F11', async () => {
    const windowService = {
      isFullscreen: jest.fn()
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(true),
      setFullscreen: jest.fn().mockResolvedValue(undefined)
    };
    renderHook(() => useFullscreenHotkey(windowService));

    const enter = new KeyboardEvent('keydown', {
      key: 'F11', bubbles: true, cancelable: true
    });
    await act(async () => { window.dispatchEvent(enter); });
    expect(enter.defaultPrevented).toBe(true);
    expect(windowService.setFullscreen).toHaveBeenLastCalledWith(true);

    await act(async () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'F11' }));
    });
    expect(windowService.setFullscreen).toHaveBeenLastCalledWith(false);
  });

  test('ignores other keys and repeated F11 events', async () => {
    const windowService = {
      isFullscreen: jest.fn().mockResolvedValue(false),
      setFullscreen: jest.fn()
    };
    renderHook(() => useFullscreenHotkey(windowService));

    await act(async () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'F11', repeat: true }));
    });
    expect(windowService.isFullscreen).not.toHaveBeenCalled();
    expect(windowService.setFullscreen).not.toHaveBeenCalled();
  });
});
