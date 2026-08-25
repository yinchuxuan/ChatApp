const {
  createGameCardStyleHost,
  isSafeGameCardStylesheetPath
} = require('../../src/renderer/gameCard/gameCardStyleHost');

const STYLE_IDS = [
  'game-card-display-style',
  'game-card-visual-style',
  'game-card-ui-style',
  'game-card-ui-root-style'
];

function deferred() {
  let resolve;
  const promise = new Promise(next => { resolve = next; });
  return { promise, resolve };
}

function styleOrder() {
  return Array.from(document.head.querySelectorAll('style'))
    .map(style => style.id)
    .filter(id => STYLE_IDS.includes(id));
}

describe('game card style host', () => {
  let host;

  afterEach(() => {
    host?.destroy();
    host = null;
    jest.clearAllMocks();
  });

  test('keeps fixed cascade slots when resources finish out of order', async () => {
    const pending = new Map();
    const resources = { readText: jest.fn((_id, path) => {
      const task = deferred();
      pending.set(path, task);
      return task.promise;
    }) };
    host = createGameCardStyleHost(resources, document);
    const loading = host.load({
      id: 'card-a',
      display: { stylesheet: 'display.css' },
      visual: { stylesheet: 'visual.css' },
      ui: { stylesheet: 'ui.css', root: { style: 'root.css' } }
    });

    expect(styleOrder()).toEqual(STYLE_IDS);
    pending.get('root.css').resolve('.root {}');
    pending.get('ui.css').resolve('.ui {}');
    pending.get('visual.css').resolve('.visual {}');
    pending.get('display.css').resolve('.display {}');
    await expect(loading).resolves.toBe(true);

    expect(styleOrder()).toEqual(STYLE_IDS);
    expect(STYLE_IDS.map(id => document.getElementById(id).textContent))
      .toEqual(['.display {}', '.visual {}', '.ui {}', '.root {}']);
  });

  test('ignores a delayed old card after a newer card commits', async () => {
    const oldStyle = deferred();
    const resources = {
      readText: jest.fn((cardId) => cardId === 'card-a'
        ? oldStyle.promise
        : Promise.resolve('.card-b {}'))
    };
    host = createGameCardStyleHost(resources, document);
    const oldLoad = host.load({ id: 'card-a', display: { stylesheet: 'a.css' } });

    await expect(host.load({ id: 'card-b', display: { stylesheet: 'b.css' } }))
      .resolves.toBe(true);
    oldStyle.resolve('.card-a {}');
    await expect(oldLoad).resolves.toBe(false);

    const style = document.getElementById('game-card-display-style');
    expect(style.textContent).toBe('.card-b {}');
    expect(style.dataset.gameCardId).toBe('card-b');
  });

  test('keeps current styles until the next card is ready to commit', async () => {
    const nextStyle = deferred();
    const resources = { readText: jest.fn((cardId) => cardId === 'card-a'
      ? Promise.resolve('.card-a {}')
      : nextStyle.promise) };
    host = createGameCardStyleHost(resources, document);
    await host.load({ id: 'card-a', display: { stylesheet: 'display.css' } });
    const style = document.getElementById('game-card-display-style');

    const loading = host.load({ id: 'card-b', display: { stylesheet: 'display.css' } });
    expect(style.textContent).toBe('.card-a {}');
    expect(style.dataset.gameCardId).toBe('card-a');
    nextStyle.resolve('.card-b {}');
    await expect(loading).resolves.toBe(true);
    expect(style.textContent).toBe('.card-b {}');
    expect(style.dataset.gameCardId).toBe('card-b');
  });

  test('clears missing and failed slots when loading a new card', async () => {
    const resources = { readText: jest.fn().mockResolvedValue('.card-a {}') };
    host = createGameCardStyleHost(resources, document);
    await host.load({
      id: 'card-a',
      display: { stylesheet: 'display.css' },
      visual: { stylesheet: 'visual.css' },
      ui: { stylesheet: 'ui.css', root: { style: 'root.css' } }
    });
    resources.readText.mockImplementation((_id, path) => (
      path === 'visual.css' ? Promise.reject(new Error('missing')) : Promise.resolve('.card-b {}')
    ));

    await host.load({
      id: 'card-b',
      display: { stylesheet: 'display.css' },
      visual: { stylesheet: 'visual.css' }
    });

    expect(document.getElementById(STYLE_IDS[0]).textContent).toBe('.card-b {}');
    STYLE_IDS.slice(1).forEach(id => {
      const style = document.getElementById(id);
      expect(style.textContent).toBe('');
      expect(style.dataset.gameCardId).toBeUndefined();
    });
  });

  test('rejects unsafe and non-css paths before reading resources', async () => {
    const resources = { readText: jest.fn() };
    host = createGameCardStyleHost(resources, document);

    expect(isSafeGameCardStylesheetPath('ui/theme.css')).toBe(true);
    expect(isSafeGameCardStylesheetPath('../theme.css')).toBe(false);
    expect(isSafeGameCardStylesheetPath('/theme.css')).toBe(false);
    expect(isSafeGameCardStylesheetPath('C:/theme.css')).toBe(false);
    expect(isSafeGameCardStylesheetPath('ui\\theme.css')).toBe(false);
    expect(isSafeGameCardStylesheetPath('theme.txt')).toBe(false);
    await expect(host.load({
      id: 'card-a',
      display: { stylesheet: '../display.css' },
      visual: { stylesheet: '/visual.css' },
      ui: { stylesheet: 'ui.txt', root: { style: '\\root.css' } }
    })).resolves.toBe(false);
    expect(resources.readText).not.toHaveBeenCalled();
  });
});
