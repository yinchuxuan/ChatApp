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
});
