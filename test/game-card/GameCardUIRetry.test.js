import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import GameCardUIRoot from '../../src/renderer/components/GameCardUIRoot.jsx';

describe('GameCardUIRoot retry event', () => {
  test('exposes the retry source and delegates chat.retry to the platform', async () => {
    const onRetry = jest.fn(() => true);
    global.platformMock.readGameCardFile.mockResolvedValue({
      success: true,
      content: `
        function Root({ React, ui, emit }) {
          return React.createElement('button', {
            onClick: () => emit({ type: 'chat.retry', content: ui.retrySource + '（修改）' })
          }, ui.canRetry ? ui.retrySource : '不可重试');
        }
      `
    });
    const card = { id: 'retry-card', ui: { root: { source: 'ui/root.js' } } };

    render(<GameCardUIRoot card={card} gameState={{}} messages={[]}
      canRetry retrySource="去第三音乐室" onRetry={onRetry} />);

    fireEvent.click(await screen.findByRole('button', { name: '去第三音乐室' }));

    expect(onRetry).toHaveBeenCalledWith('去第三音乐室（修改）');
  });

  test('rejects a retry event with non-string content', async () => {
    global.platformMock.readGameCardFile.mockResolvedValue({
      success: true,
      content: `
        function Root({ React, emit }) {
          return React.createElement('button', {
            onClick: () => emit({ type: 'chat.retry', content: 42 })
          }, 'retry');
        }
      `
    });
    const card = { id: 'invalid-retry-card', ui: { root: { source: 'ui/root.js' } } };
    const { container } = render(
      <GameCardUIRoot card={card} gameState={{}} messages={[]} onRetry={jest.fn()} />
    );

    fireEvent.click(await screen.findByRole('button', { name: 'retry' }));

    expect(container.querySelector('#game-card-ui-root'))
      .toHaveAttribute('data-error', 'chat.retry content must be a string');
  });
});
