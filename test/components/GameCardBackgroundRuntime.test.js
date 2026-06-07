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
    window.addEventListener('game-card-background-changed', handler);

    render(React.createElement(GameCardBackgroundRuntime, {
      card: { visual: { background: { school: 'images/school.jpg' } } },
      gameState: { visual: { background: 'school' } }
    }));
    await flushEffects();

    await waitFor(() => expect(window.electronAPI.getGameCardImageUrl).toHaveBeenCalledWith('images/school.jpg'));
    expect(handler).toHaveBeenCalledWith(expect.objectContaining({ detail: { url: 'local:///school.jpg' } }));
    window.removeEventListener('game-card-background-changed', handler);
  });

  test('clears background when key is missing', async () => {
    const handler = jest.fn();
    window.addEventListener('game-card-background-changed', handler);

    render(React.createElement(GameCardBackgroundRuntime, {
      card: { visual: { background: {} } },
      gameState: { visual: { background: 'missing' } }
    }));
    await flushEffects();

    expect(window.electronAPI.getGameCardImageUrl).not.toHaveBeenCalled();
    expect(handler).toHaveBeenCalledWith(expect.objectContaining({ detail: { url: '' } }));
    window.removeEventListener('game-card-background-changed', handler);
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
    window.addEventListener('game-card-background-changed', handler);

    const { rerender } = render(React.createElement(GameCardBackgroundRuntime, {
      card: { visual: { background: { school: 'images/school.jpg' } } },
      gameState: { visual: { background: 'school' } },
      defer: true,
      revealToken: 0
    }));
    await flushEffects();

    await waitFor(() => expect(window.electronAPI.getGameCardImageUrl).toHaveBeenCalledWith('images/school.jpg'));
    expect(handler).not.toHaveBeenCalled();
    rerender(React.createElement(GameCardBackgroundRuntime, {
      card: { visual: { background: { school: 'images/school.jpg' } } },
      gameState: { visual: { background: 'school' } },
      defer: true,
      revealToken: 1
    }));
    await flushEffects();

    expect(handler).toHaveBeenCalledWith(expect.objectContaining({ detail: { url: 'local:///school.jpg' } }));
    window.removeEventListener('game-card-background-changed', handler);
  });

  test('reveals deferred background after the image resolves late', async () => {
    let resolveImage;
    window.electronAPI.getGameCardImageUrl.mockReturnValue(new Promise(resolve => { resolveImage = resolve; }));
    const handler = jest.fn();
    window.addEventListener('game-card-background-changed', handler);

    const { rerender } = render(React.createElement(GameCardBackgroundRuntime, {
      card: { visual: { background: { school: 'images/school.jpg' } } },
      gameState: { visual: { background: 'school' } },
      defer: true,
      revealToken: 0
    }));
    rerender(React.createElement(GameCardBackgroundRuntime, {
      card: { visual: { background: { school: 'images/school.jpg' } } },
      gameState: { visual: { background: 'school' } },
      defer: true,
      revealToken: 1
    }));
    await act(async () => resolveImage({ success: true, url: 'local:///school.jpg' }));

    expect(handler).toHaveBeenCalledWith(expect.objectContaining({ detail: { url: 'local:///school.jpg' } }));
    window.removeEventListener('game-card-background-changed', handler);
  });

  test('dispatches visual panel state and normalizes invalid values', async () => {
    const handler = jest.fn();
    window.addEventListener('game-card-visual-panel-changed', handler);

    const { rerender } = render(React.createElement(GameCardBackgroundRuntime, {
      card: { id: 'wa2', visual: { background: { school: 'images/school.jpg' } } },
      gameState: { visual: { background: 'school', textPanel: 'right' } }
    }));
    await flushEffects();
    rerender(React.createElement(GameCardBackgroundRuntime, {
      card: { id: 'wa2', visual: { background: { school: 'images/school.jpg' } } },
      gameState: { visual: { background: 'school', textPanel: 'bottom' } }
    }));
    await flushEffects();

    expect(handler).toHaveBeenCalledWith(expect.objectContaining({
      detail: { textPanel: 'right', cardId: 'wa2' }
    }));
    expect(handler).toHaveBeenCalledWith(expect.objectContaining({
      detail: { textPanel: 'center', cardId: 'wa2' }
    }));
    window.removeEventListener('game-card-visual-panel-changed', handler);
  });
});
