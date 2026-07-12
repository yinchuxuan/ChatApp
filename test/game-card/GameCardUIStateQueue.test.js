import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import GameCardUIRoot from '../../src/renderer/components/GameCardUIRoot.jsx';

function cardRoot(source, id = 'queue-card') {
  global.platformMock.readGameCardFile.mockImplementation(async (_cardId, filePath) => ({
    success: true,
    content: filePath === 'ui/root.js' ? source : ''
  }));
  return { id, ui: { root: { source: 'ui/root.js' } } };
}

describe('GameCardUIRoot state event queue', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('applies rapid state events cumulatively', async () => {
    const setGameState = jest.fn();
    const card = cardRoot(`
      function Root({ React, emit }) {
        const append = () => emit({
          type: 'game.state.apply',
          action: { type: 'state.append', path: 'steps', value: 'state' }
        });
        return React.createElement('button', {
          style: { pointerEvents: 'auto' },
          onClick: () => { append(); append(); }
        }, 'append');
      }
    `);

    render(<GameCardUIRoot card={card} gameState={{ steps: [] }}
      setGameState={setGameState} messages={[]} />);
    fireEvent.click(await screen.findByRole('button', { name: 'append' }));

    await waitFor(() => expect(setGameState).toHaveBeenCalledTimes(2));
    expect(setGameState).toHaveBeenLastCalledWith({ steps: ['state', 'state'] });
  });

  test('preserves order across state and script events', async () => {
    const setGameState = jest.fn();
    const card = { id: 'queue-card', ui: { root: { source: 'ui/root.js' } } };
    global.platformMock.readGameCardFile.mockImplementation(async (_cardId, filePath) => ({
      success: true,
      content: filePath === 'ui/root.js'
        ? `function Root({ React, emit }) {
            return React.createElement('button', {
              style: { pointerEvents: 'auto' },
              onClick: () => {
                emit({ type: 'game.state.apply', action: { type: 'state.append', path: 'steps', value: 'action' }});
                emit({ type: 'game.script.run', sourceFile: 'ui/append.js' });
              }
            }, 'mixed');
          }`
        : `function run(ctx) { ctx.state.steps.push('script'); return { state: ctx.state }; }`
    }));

    render(<GameCardUIRoot card={card} gameState={{ steps: [] }}
      setGameState={setGameState} messages={[]} />);
    fireEvent.click(await screen.findByRole('button', { name: 'mixed' }));

    await waitFor(() => expect(setGameState).toHaveBeenCalledTimes(2));
    expect(setGameState).toHaveBeenLastCalledWith({ steps: ['action', 'script'] });
  });

  test('does not commit an old card event after switching cards', async () => {
    let resolveScript;
    const script = new Promise(resolve => { resolveScript = resolve; });
    const setGameState = jest.fn();
    const rootSource = `function Root({ React, emit }) {
      return React.createElement('button', {
        style: { pointerEvents: 'auto' },
        onClick: () => emit({ type: 'game.script.run', sourceFile: 'ui/slow.js' })
      }, 'slow');
    }`;
    global.platformMock.readGameCardFile.mockImplementation(async (cardId, filePath) => {
      if (cardId === 'card-a' && filePath === 'ui/slow.js') return script;
      return { success: true, content: rootSource };
    });
    const cardA = { id: 'card-a', ui: { root: { source: 'ui/root.js' } } };
    const cardB = { id: 'card-b', ui: { root: { source: 'ui/root.js' } } };
    const view = render(<GameCardUIRoot card={cardA} gameState={{ score: 0 }}
      setGameState={setGameState} messages={[]} />);

    fireEvent.click(await screen.findByRole('button', { name: 'slow' }));
    await waitFor(() => expect(global.platformMock.readGameCardFile)
      .toHaveBeenCalledWith('card-a', 'ui/slow.js'));
    view.rerender(<GameCardUIRoot card={cardB} gameState={{ score: 10 }}
      setGameState={setGameState} messages={[]} />);
    await act(async () => resolveScript({
      success: true,
      content: 'function run(ctx) { ctx.state.score += 1; return { state: ctx.state }; }'
    }));

    await act(async () => Promise.resolve());
    expect(setGameState).not.toHaveBeenCalled();
  });

  test('does not commit an old event after the session scope changes', async () => {
    let resolveScript;
    const script = new Promise(resolve => { resolveScript = resolve; });
    const setGameState = jest.fn();
    const rootSource = `function Root({ React, emit }) {
      return React.createElement('button', {
        style: { pointerEvents: 'auto' },
        onClick: () => emit({ type: 'game.script.run', sourceFile: 'ui/slow.js' })
      }, 'session-slow');
    }`;
    global.platformMock.readGameCardFile.mockImplementation(async (_cardId, filePath) => (
      filePath === 'ui/slow.js' ? script : { success: true, content: rootSource }
    ));
    const card = { id: 'same-card', ui: { root: { source: 'ui/root.js' } } };
    const view = render(<GameCardUIRoot card={card} gameState={{ score: 0 }}
      setGameState={setGameState} messages={[]} uiScopeKey={1} />);

    fireEvent.click(await screen.findByRole('button', { name: 'session-slow' }));
    await waitFor(() => expect(global.platformMock.readGameCardFile)
      .toHaveBeenCalledWith('same-card', 'ui/slow.js'));
    view.rerender(<GameCardUIRoot card={card} gameState={{ score: 20 }}
      setGameState={setGameState} messages={[]} uiScopeKey={2} />);
    await act(async () => resolveScript({
      success: true,
      content: 'function run(ctx) { ctx.state.score += 1; return { state: ctx.state }; }'
    }));

    await act(async () => Promise.resolve());
    expect(setGameState).not.toHaveBeenCalled();
  });
});
