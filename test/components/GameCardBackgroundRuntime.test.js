import React from 'react';
import { render, waitFor, act } from '@testing-library/react';
import GameCardBackgroundRuntime from '../../src/components/GameCardBackgroundRuntime';

async function flushEffects() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe('GameCardBackgroundRuntime', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.electronAPI.getGameCardImageUrl.mockResolvedValue({ success: true, url: 'local:///school.jpg' });
  });

  test('dispatches resolved background url from game state', async () => {
    const handler = jest.fn();

    render(React.createElement(GameCardBackgroundRuntime, {
      card: { visual: { background: { school: 'images/school.jpg' } } },
      gameState: { visual: { background: 'school' } },
      onBackgroundChange: handler
    }));
    await flushEffects();

    await waitFor(() => expect(window.electronAPI.getGameCardImageUrl).toHaveBeenCalledWith('images/school.jpg'));
    expect(handler).toHaveBeenCalledWith({ url: 'local:///school.jpg' });
  });

  test('clears background when key is missing', async () => {
    const handler = jest.fn();

    render(React.createElement(GameCardBackgroundRuntime, {
      card: { visual: { background: {} } },
      gameState: { visual: { background: 'missing' } },
      onBackgroundChange: handler
    }));
    await flushEffects();

    expect(window.electronAPI.getGameCardImageUrl).not.toHaveBeenCalled();
    expect(handler).toHaveBeenCalledWith({ url: '' });
  });

  test('resolves again when card changes with the same relative path', async () => {
    window.electronAPI.getGameCardImageUrl
      .mockResolvedValueOnce({ success: true, url: 'local:///a/school.jpg' })
      .mockResolvedValueOnce({ success: true, url: 'local:///b/school.jpg' });
    const state = { visual: { background: 'school' } };
    const first = { id: 'card-a', visual: { background: { school: 'images/school.jpg' } } };
    const second = { id: 'card-b', visual: { background: { school: 'images/school.jpg' } } };

    const { rerender } = render(React.createElement(GameCardBackgroundRuntime, {
      card: first,
      gameState: state
    }));
    await flushEffects();
    rerender(React.createElement(GameCardBackgroundRuntime, { card: second, gameState: state }));
    await flushEffects();

    expect(window.electronAPI.getGameCardImageUrl).toHaveBeenCalledTimes(2);
  });

  test('defers background dispatch until response body starts', async () => {
    const handler = jest.fn();

    const { rerender } = render(React.createElement(GameCardBackgroundRuntime, {
      card: { visual: { background: { school: 'images/school.jpg' } } },
      gameState: { visual: { background: 'school' } },
      defer: true,
      revealToken: 0,
      onBackgroundChange: handler
    }));
    await flushEffects();

    await waitFor(() => expect(window.electronAPI.getGameCardImageUrl).toHaveBeenCalledWith('images/school.jpg'));
    expect(handler).not.toHaveBeenCalled();
    rerender(React.createElement(GameCardBackgroundRuntime, {
      card: { visual: { background: { school: 'images/school.jpg' } } },
      gameState: { visual: { background: 'school' } },
      defer: true,
      revealToken: 1,
      onBackgroundChange: handler
    }));
    await flushEffects();

    expect(handler).toHaveBeenCalledWith({ url: 'local:///school.jpg' });
  });

  test('reveals deferred background after the image resolves late', async () => {
    let resolveImage;
    window.electronAPI.getGameCardImageUrl.mockReturnValue(new Promise(resolve => { resolveImage = resolve; }));
    const handler = jest.fn();

    const { rerender } = render(React.createElement(GameCardBackgroundRuntime, {
      card: { visual: { background: { school: 'images/school.jpg' } } },
      gameState: { visual: { background: 'school' } },
      defer: true,
      revealToken: 0,
      onBackgroundChange: handler
    }));
    rerender(React.createElement(GameCardBackgroundRuntime, {
      card: { visual: { background: { school: 'images/school.jpg' } } },
      gameState: { visual: { background: 'school' } },
      defer: true,
      revealToken: 1,
      onBackgroundChange: handler
    }));
    await act(async () => resolveImage({ success: true, url: 'local:///school.jpg' }));

    expect(handler).toHaveBeenCalledWith({ url: 'local:///school.jpg' });
  });

  test('dispatches visual panel state and normalizes invalid values', async () => {
    const handler = jest.fn();

    const { rerender } = render(React.createElement(GameCardBackgroundRuntime, {
      card: { id: 'wa2', visual: { background: { school: 'images/school.jpg' } } },
      gameState: { visual: { background: 'school', textPanel: 'right' } },
      onVisualPanelChange: handler
    }));
    await flushEffects();
    rerender(React.createElement(GameCardBackgroundRuntime, {
      card: { id: 'wa2', visual: { background: { school: 'images/school.jpg' } } },
      gameState: { visual: { background: 'school', textPanel: 'bottom' } },
      onVisualPanelChange: handler
    }));
    await flushEffects();

    expect(handler).toHaveBeenCalledWith({ textPanel: 'right', cardId: 'wa2' });
    expect(handler).toHaveBeenCalledWith({ textPanel: 'center', cardId: 'wa2' });
  });
});
