const {
  loadGameCardDisplayStyle,
  removeGameCardDisplayStyle,
  isSafeStylesheetPath
} = require('../../src/gameCard/displayStyles');

describe('game card display styles', () => {
  afterEach(() => {
    removeGameCardDisplayStyle(document);
    jest.clearAllMocks();
  });

  test('loads stylesheet content from active game card resources', async () => {
    const api = {
      readGameCardFile: jest.fn().mockResolvedValue({
        success: true,
        content: '.wa2-choice { display: grid; }'
      })
    };

    await expect(loadGameCardDisplayStyle({
      id: 'white-album-2',
      display: { stylesheet: 'display.css' }
    }, api, document)).resolves.toBe(true);

    const style = document.getElementById('game-card-display-style');
    expect(api.readGameCardFile).toHaveBeenCalledWith('white-album-2', 'display.css');
    expect(style.textContent).toContain('.wa2-choice');
    expect(style.dataset.gameCardId).toBe('white-album-2');
  });

  test('removes prior stylesheet when no card stylesheet is active', async () => {
    const api = { readGameCardFile: jest.fn().mockResolvedValue({ success: true, content: '.x{}' }) };
    await loadGameCardDisplayStyle({ id: 'card-a', display: { stylesheet: 'a.css' } }, api, document);

    await expect(loadGameCardDisplayStyle(null, api, document)).resolves.toBe(false);

    expect(document.getElementById('game-card-display-style')).toBeNull();
  });

  test('rejects unsafe stylesheet paths before IPC read', async () => {
    const api = { readGameCardFile: jest.fn() };

    expect(isSafeStylesheetPath('../x.css')).toBe(false);
    expect(isSafeStylesheetPath('/x.css')).toBe(false);
    await expect(loadGameCardDisplayStyle({
      id: 'card-a',
      display: { stylesheet: '../x.css' }
    }, api, document)).resolves.toBe(false);
    expect(api.readGameCardFile).not.toHaveBeenCalled();
  });
});
