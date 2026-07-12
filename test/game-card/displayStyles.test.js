const {
  loadGameCardDisplayStyle,
  removeGameCardDisplayStyle,
  isSafeStylesheetPath
} = require('../../src/renderer/gameCard/displayStyles');

describe('game card display styles', () => {
  afterEach(() => {
    removeGameCardDisplayStyle(document);
    jest.clearAllMocks();
  });

  test('loads stylesheet content from active game card resources', async () => {
    const resources = {
      readText: jest.fn().mockResolvedValue('.wa2-choice { display: grid; }')
    };

    await expect(loadGameCardDisplayStyle({
      id: 'white-album-2',
      display: { stylesheet: 'display.css' }
    }, resources, document)).resolves.toBe(true);

    const style = document.getElementById('game-card-display-style');
    expect(resources.readText).toHaveBeenCalledWith('white-album-2', 'display.css');
    expect(style.textContent).toContain('.wa2-choice');
    expect(style.dataset.gameCardId).toBe('white-album-2');
  });

  test('removes prior stylesheet when no card stylesheet is active', async () => {
    const resources = { readText: jest.fn().mockResolvedValue('.x{}') };
    await loadGameCardDisplayStyle({ id: 'card-a', display: { stylesheet: 'a.css' } }, resources, document);

    await expect(loadGameCardDisplayStyle(null, resources, document)).resolves.toBe(false);

    expect(document.getElementById('game-card-display-style')).toBeNull();
  });

  test('rejects unsafe stylesheet paths before IPC read', async () => {
    const resources = { readText: jest.fn() };

    expect(isSafeStylesheetPath('../x.css')).toBe(false);
    expect(isSafeStylesheetPath('/x.css')).toBe(false);
    await expect(loadGameCardDisplayStyle({
      id: 'card-a',
      display: { stylesheet: '../x.css' }
    }, resources, document)).resolves.toBe(false);
    expect(resources.readText).not.toHaveBeenCalled();
  });
});
