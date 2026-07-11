import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import GameCardUIRoot from '../../src/components/GameCardUIRoot.jsx';

describe('game card UI error isolation', () => {
  beforeEach(() => jest.clearAllMocks());

  test('isolates render errors and recovers after the card changes', async () => {
    const onError = jest.fn();
    window.electronAPI.readGameCardFile.mockImplementation(async (cardId) => ({
      success: true,
      content: cardId === 'broken'
        ? 'function Root() { throw new Error("render failed"); }'
        : 'function Root({ React }) { return React.createElement("div", null, "recovered"); }'
    }));
    const { rerender } = render(<GameCardUIRoot
      card={{ id: 'broken', ui: { root: { source: 'ui/root.js' } } }} onError={onError} />);

    expect(await screen.findByRole('alert')).toHaveTextContent('render failed');
    expect(onError).toHaveBeenCalled();
    rerender(<GameCardUIRoot
      card={{ id: 'working', ui: { root: { source: 'ui/root.js' } } }} onError={onError} />);
    expect(await screen.findByText('recovered')).toBeInTheDocument();
  });

  test('isolates synchronous card event handler errors', async () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    window.electronAPI.readGameCardFile.mockResolvedValue({
      success: true,
      content: 'function Root({ React }) { return React.createElement("button", { onClick: () => { throw new Error("event failed"); } }, "fail"); }'
    });
    render(<GameCardUIRoot card={{ id: 'event-error', ui: { root: { source: 'ui/root.js' } } }} />);

    try { fireEvent.click(await screen.findByRole('button', { name: 'fail' })); } catch { /* jsdom rethrows */ }
    expect(await screen.findByRole('alert')).toHaveTextContent('event failed');
    errorSpy.mockRestore();
  });

  test('isolates card effect errors', async () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    window.electronAPI.readGameCardFile.mockResolvedValue({
      success: true,
      content: 'function Root({ React }) { React.useEffect(() => { throw new Error("effect failed"); }, []); return null; }'
    });
    render(<GameCardUIRoot card={{ id: 'effect-error', ui: { root: { source: 'ui/root.js' } } }} />);

    expect(await screen.findByRole('alert')).toHaveTextContent('effect failed');
    errorSpy.mockRestore();
  });
});
