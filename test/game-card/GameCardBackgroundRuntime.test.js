import React from 'react';
import { act, render, waitFor } from '@testing-library/react';
import GameCardBackgroundRuntime from '../../src/renderer/components/GameCardBackgroundRuntime';

const card = {
  id: 'wa2',
  visual: {
    background: {
      school: 'images/school.jpg',
      room: 'images/room.jpg'
    },
    portrait: { touma: 'images/touma.png' }
  }
};

function request(id, state, targetCard = card) {
  return { id, card: targetCard, state };
}

async function flushEffects() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe('GameCardBackgroundRuntime explicit updates', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.platformMock.getGameCardImageUrl.mockImplementation(async (_cardId, path) => ({
      success: true,
      url: `local:///${path}`
    }));
  });

  test('resolves only the explicitly requested background channel', async () => {
    const background = jest.fn();
    const portrait = jest.fn();
    render(React.createElement(GameCardBackgroundRuntime, {
      backgroundRequest: request(1, {
        visual: { background: 'school', portrait: 'touma' }
      }),
      onBackgroundChange: background,
      onPortraitChange: portrait
    }));

    await waitFor(() => expect(background).toHaveBeenCalledWith({
      url: 'local:///images/school.jpg'
    }));
    expect(portrait).not.toHaveBeenCalled();
  });

  test('resolves a portrait only after updatePortrait requests it', async () => {
    const portrait = jest.fn();
    render(React.createElement(GameCardBackgroundRuntime, {
      portraitRequest: request(1, { visual: { portrait: 'touma' } }),
      onPortraitChange: portrait
    }));

    await waitFor(() => expect(portrait).toHaveBeenCalledWith({
      url: 'local:///images/touma.png'
    }));
    expect(global.platformMock.getGameCardImageUrl)
      .toHaveBeenCalledWith('wa2', 'images/touma.png');
  });

  test('clears a requested channel when its state key is missing', async () => {
    const background = jest.fn();
    render(React.createElement(GameCardBackgroundRuntime, {
      backgroundRequest: request(1, { visual: { background: 'missing' } }),
      onBackgroundChange: background
    }));
    await flushEffects();

    expect(global.platformMock.getGameCardImageUrl).not.toHaveBeenCalled();
    expect(background).toHaveBeenCalledWith({ url: '' });
  });

  test('does not resolve the same card and path twice', async () => {
    const state = { visual: { background: 'school' } };
    const { rerender } = render(React.createElement(GameCardBackgroundRuntime, {
      backgroundRequest: request(1, state)
    }));
    await flushEffects();
    rerender(React.createElement(GameCardBackgroundRuntime, {
      backgroundRequest: request(2, state)
    }));
    await flushEffects();

    expect(global.platformMock.getGameCardImageUrl).toHaveBeenCalledTimes(1);
  });

  test('resolves again when the card changes with the same path', async () => {
    const state = { visual: { background: 'school' } };
    const secondCard = {
      id: 'other',
      visual: { background: { school: 'images/school.jpg' } }
    };
    const { rerender } = render(React.createElement(GameCardBackgroundRuntime, {
      backgroundRequest: request(1, state)
    }));
    await flushEffects();
    rerender(React.createElement(GameCardBackgroundRuntime, {
      backgroundRequest: request(2, state, secondCard)
    }));
    await flushEffects();

    expect(global.platformMock.getGameCardImageUrl).toHaveBeenCalledTimes(2);
  });

  test('ignores a stale image resolution after a newer update', async () => {
    const resolvers = [];
    global.platformMock.getGameCardImageUrl.mockImplementation(() => (
      new Promise(resolve => resolvers.push(resolve))
    ));
    const background = jest.fn();
    const { rerender } = render(React.createElement(GameCardBackgroundRuntime, {
      backgroundRequest: request(1, { visual: { background: 'school' } }),
      onBackgroundChange: background
    }));
    await waitFor(() => expect(resolvers).toHaveLength(1));
    rerender(React.createElement(GameCardBackgroundRuntime, {
      backgroundRequest: request(2, { visual: { background: 'room' } }),
      onBackgroundChange: background
    }));
    await waitFor(() => expect(resolvers).toHaveLength(2));

    await act(async () => {
      resolvers[1]({ success: true, url: 'local:///room.jpg' });
      resolvers[0]({ success: true, url: 'local:///school.jpg' });
    });
    expect(background).toHaveBeenCalledTimes(1);
    expect(background).toHaveBeenCalledWith({ url: 'local:///room.jpg' });
  });

  test('updates the text panel with an explicit background request', async () => {
    const panel = jest.fn();
    const { rerender } = render(React.createElement(GameCardBackgroundRuntime, {
      backgroundRequest: request(1, {
        visual: { background: 'school', textPanel: 'right' }
      }),
      onVisualPanelChange: panel
    }));
    await flushEffects();
    rerender(React.createElement(GameCardBackgroundRuntime, {
      backgroundRequest: request(2, {
        visual: { background: 'school', textPanel: 'bottom' }
      }),
      onVisualPanelChange: panel
    }));
    await flushEffects();

    expect(panel).toHaveBeenCalledWith({ textPanel: 'right', cardId: 'wa2' });
    expect(panel).toHaveBeenCalledWith({ textPanel: 'center', cardId: 'wa2' });
  });
});
