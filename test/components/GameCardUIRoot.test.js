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

  test('applies controlled game state actions from card React root', async () => {
    const setGameState = jest.fn();
    window.electronAPI.readGameCardFile.mockResolvedValue({
      success: true,
      content: `
        function Root({ React, state, emit }) {
          return React.createElement(
            'button',
            {
              style: { pointerEvents: 'auto' },
              onClick: () => emit({
                type: 'game.state.apply',
                actions: [
                  { type: 'state.set', path: 'score', value: state.score + 5 },
                  { type: 'state.set', path: 'events.queue', value: state.events.queue.slice(1) }
                ]
              })
            },
            'consume'
          );
        }
      `
    });
    const card = {
      id: 'event-card',
      state: { schema: { schema: { score: { type: 'number', min: 0, max: 10, onInvalid: 'clamp' } } } },
      ui: { root: { source: 'ui/root.js' } }
    };

    render(React.createElement(GameCardUIRoot, {
      card,
      gameState: { score: 8, events: { queue: [{ id: 'a' }, { id: 'b' }] } },
      setGameState,
      messages: [],
      isLoading: false
    }));

    fireEvent.click(await screen.findByRole('button', { name: 'consume' }));

    await waitFor(() => expect(setGameState).toHaveBeenCalledWith({
      score: 10,
      events: { queue: [{ id: 'b' }] }
    }));
  });

  test('exposes platform assistant message rendering to card React root', async () => {
    window.electronAPI.readGameCardFile.mockResolvedValue({
      success: true,
      content: `
        function Root({ React, ui }) {
          return React.createElement(
            'div',
            { style: { pointerEvents: 'auto' } },
            ui.renderAssistantMessage('第一段“高亮”。\\n\\n第二段。', {
              rowClassName: 'event-row',
              messageClassName: 'event-message'
            })
          );
        }
      `
    });
    const card = { id: 'render-card', ui: { root: { source: 'ui/root.js' } } };
    const { container } = render(React.createElement(GameCardUIRoot, {
      card,
      gameState: {},
      messages: [],
      isLoading: false
    }));

    await screen.findByText('第二段。');

    expect(container.querySelector('.event-row')).not.toBeNull();
    expect(container.querySelectorAll('.event-message .chat-bubble-content p')).toHaveLength(2);
    expect(container.querySelector('.event-message .quoted-text')).toHaveTextContent('“高亮”');
  });

  test('runs controlled game scripts from card React root', async () => {
    const setGameState = jest.fn();
    window.electronAPI.readGameCardFile.mockImplementation(async (_id, filePath) => ({
      success: true,
      content: filePath === 'ui/root.js'
        ? `
          function Root({ React, emit }) {
            return React.createElement(
              'button',
              { style: { pointerEvents: 'auto' }, onClick: () => emit({ type: 'game.script.run', sourceFile: 'ui/pick.js', payload: { delta: 3 } }) },
              'script'
            );
          }
        `
        : 'function run(ctx) { ctx.state.score += ctx.event.payload.delta; return { state: ctx.state }; }'
    }));
    const card = { id: 'script-card', ui: { root: { source: 'ui/root.js' } } };

    render(React.createElement(GameCardUIRoot, {
      card,
      gameState: { score: 2 },
      setGameState,
      messages: [],
      isLoading: false
    }));

    fireEvent.click(await screen.findByRole('button', { name: 'script' }));

    await waitFor(() => expect(setGameState).toHaveBeenCalledWith({ score: 5 }));
    expect(window.electronAPI.readGameCardFile).toHaveBeenCalledWith('script-card', 'ui/pick.js');
  });
});
