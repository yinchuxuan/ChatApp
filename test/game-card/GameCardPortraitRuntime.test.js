import React from 'react';
import { render, waitFor } from '@testing-library/react';
import GameCardBackgroundRuntime from '../../src/renderer/components/GameCardBackgroundRuntime';

const card = {
  id: 'wa2',
  visual: {
    background: { school: 'images/school.jpg' },
    cg: { invite: 'images/invite.jpg' },
    portrait: {
      touma: { normal: 'images/touma.png' },
      setsuna: { happy: 'images/setsuna.png' }
    }
  }
};

function request(id, state) {
  return { id, card, state };
}

describe('GameCardBackgroundRuntime portraits', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.platformMock.getGameCardImageUrl.mockImplementation(async (_cardId, path) => ({
      success: true,
      url: `local:///${path}`
    }));
  });

  test('resolves portraits in card character order', async () => {
    const onChange = jest.fn();
    render(React.createElement(GameCardBackgroundRuntime, {
      portraitRequest: request(1, {
        visual: { portraits: { setsuna: 'happy', touma: 'normal' } }
      }),
      onPortraitChange: onChange
    }));

    await waitFor(() => expect(onChange).toHaveBeenCalledWith({
      portraits: [
        {
          character: 'touma',
          expression: 'normal',
          path: 'images/touma.png',
          url: 'local:///images/touma.png'
        },
        {
          character: 'setsuna',
          expression: 'happy',
          path: 'images/setsuna.png',
          url: 'local:///images/setsuna.png'
        }
      ]
    }));
  });

  test('hides portraits on cg without clearing their state', async () => {
    const onChange = jest.fn();
    const cgState = { visual: { scene: 'invite', portraits: { touma: 'normal' } } };
    const { rerender } = render(React.createElement(GameCardBackgroundRuntime, {
      portraitRequest: request(1, {
        visual: { scene: 'school', portraits: { touma: 'normal' } }
      }),
      onPortraitChange: onChange
    }));
    await waitFor(() => expect(onChange).toHaveBeenLastCalledWith({
      portraits: [{
        character: 'touma',
        expression: 'normal',
        path: 'images/touma.png',
        url: 'local:///images/touma.png'
      }]
    }));

    rerender(React.createElement(GameCardBackgroundRuntime, {
      portraitRequest: request(2, cgState),
      onPortraitChange: onChange
    }));
    await waitFor(() => expect(onChange).toHaveBeenLastCalledWith({
      portraits: [],
      immediate: true
    }));
    expect(cgState.visual.portraits).toEqual({ touma: 'normal' });

    rerender(React.createElement(GameCardBackgroundRuntime, {
      portraitRequest: request(3, {
        visual: { scene: 'school', portraits: { touma: 'normal' } }
      }),
      onPortraitChange: onChange
    }));
    await waitFor(() => expect(onChange).toHaveBeenLastCalledWith({
      portraits: [{
        character: 'touma',
        expression: 'normal',
        path: 'images/touma.png',
        url: 'local:///images/touma.png'
      }]
    }));
  });
});
