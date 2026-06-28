import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import GameCardUIRoot from '../../src/components/GameCardUIRoot.jsx';

describe('GameCardUIRoot', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('mounts card React root and emits controlled input events', async () => {
    const emitted = [];
    window.addEventListener('game-card-chat-input-action', (event) => emitted.push(event.detail), { once: true });
    window.electronAPI.readGameCardFile.mockImplementation(async (_id, filePath) => ({
      success: true,
      content: filePath.endsWith('.css')
        ? '.choice-button { pointer-events: auto; }'
        : `
          function Root({ React, props, state, emit }) {
            return React.createElement(
              'button',
              {
                className: 'choice-button',
                style: { pointerEvents: 'auto' },
                onClick: () => emit({ type: 'chat.input.set', value: props.label + state.turn, focus: true })
              },
              props.label
            );
          }
        `
    }));
    const card = {
      id: 'choice-card',
      ui: { root: { source: 'ui/root.js', style: 'ui/root.css', props: { label: 'A' } } }
    };

    render(React.createElement(GameCardUIRoot, {
      card,
      gameState: { turn: 2 },
      messages: [],
      isLoading: false
    }));

    const button = await screen.findByRole('button', { name: 'A' });
    fireEvent.click(button);

    await waitFor(() => expect(emitted[0]).toEqual({
      type: 'chat.input.set',
      value: 'A2',
      focus: true
    }));
    expect(document.getElementById('game-card-ui-root-style').textContent)
      .toContain('choice-button');
  });
});
