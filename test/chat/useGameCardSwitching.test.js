import { act, renderHook } from '@testing-library/react';
import useGameCardSwitching from '../../src/renderer/chat/useGameCardSwitching.js';

function setup({ isLoading = false, importedCard = null } = {}) {
  const events = [];
  const session = {
    saveCurrent: jest.fn(async () => { events.push('save'); }),
    reload: jest.fn(async () => { events.push('reload'); })
  };
  const repository = {
    setActive: jest.fn(async id => { events.push(`activate:${id ?? 'no-card'}`); }),
    importFile: jest.fn(async () => { events.push('import'); return importedCard; })
  };
  const runtime = {
    setRuntimeError: jest.fn(() => events.push('clear-error')),
    changeActiveCard: jest.fn(card => events.push(`runtime:${card?.id || 'no-card'}`))
  };
  const presentation = {
    stopBgm: jest.fn(() => events.push('stop-bgm')),
    updateAll: jest.fn(() => events.push('clear-visual'))
  };
  const hook = renderHook(() => useGameCardSwitching({
    isLoading, presentation, repository, runtime, session
  }));
  return { ...hook, events, presentation, repository, runtime, session };
}

describe('useGameCardSwitching', () => {
  test('saves the card session before switching to normal chat', async () => {
    const context = setup();

    await act(async () => context.result.current.activate(null));

    expect(context.events).toEqual([
      'save',
      'activate:no-card',
      'clear-error',
      'runtime:no-card',
      'stop-bgm',
      'clear-visual',
      'reload'
    ]);
    expect(context.presentation.updateAll).toHaveBeenCalledWith(null, {});
  });

  test('uses the same session and presentation transition after import', async () => {
    const card = { id: 'new-card', name: 'New Card' };
    const context = setup({ importedCard: card });

    await act(async () => context.result.current.importCard());

    expect(context.events).toEqual([
      'save',
      'import',
      'clear-error',
      'runtime:new-card',
      'stop-bgm',
      'clear-visual',
      'reload'
    ]);
  });

  test('does not change scope during generation', async () => {
    const context = setup({ isLoading: true });

    await act(async () => context.result.current.activate({ id: 'card' }));
    await act(async () => context.result.current.importCard());

    expect(context.events).toEqual([]);
  });
});
