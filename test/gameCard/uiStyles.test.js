const {
  loadGameCardUiStyle,
  removeGameCardUiStyle,
  isSafeUiStylesheetPath
} = require('../../src/gameCard/uiStyles');

describe('game card ui styles', () => {
  afterEach(() => {
    removeGameCardUiStyle(document);
    jest.clearAllMocks();
  });

  test('loads ui stylesheet content from active game card resources', async () => {
    const api = {
      readGameCardFile: jest.fn().mockResolvedValue({
        success: true,
        content: '[data-gc-part="chat-input"] { opacity: 1; }'
      })
    };

    await expect(loadGameCardUiStyle({
      id: 'white-album-2',
      ui: { stylesheet: 'ui.css' }
    }, api, document)).resolves.toBe(true);

    const style = document.getElementById('game-card-ui-style');
    expect(api.readGameCardFile).toHaveBeenCalledWith('white-album-2', 'ui.css');
    expect(style.textContent).toContain('[data-gc-part="chat-input"]');
    expect(style.dataset.gameCardId).toBe('white-album-2');
  });

  test('removes prior stylesheet when no card ui stylesheet is active', async () => {
    const api = { readGameCardFile: jest.fn().mockResolvedValue({ success: true, content: '.x{}' }) };
    await loadGameCardUiStyle({ id: 'card-a', ui: { stylesheet: 'ui.css' } }, api, document);

    await expect(loadGameCardUiStyle(null, api, document)).resolves.toBe(false);

    expect(document.getElementById('game-card-ui-style')).toBeNull();
  });

  test('rejects unsafe ui stylesheet paths before IPC read', async () => {
    const api = { readGameCardFile: jest.fn() };

    expect(isSafeUiStylesheetPath('../ui.css')).toBe(false);
    expect(isSafeUiStylesheetPath('/ui.css')).toBe(false);
    expect(isSafeUiStylesheetPath('\\ui.css')).toBe(false);
    expect(isSafeUiStylesheetPath('ui.txt')).toBe(false);
    await expect(loadGameCardUiStyle({
      id: 'card-a',
      ui: { stylesheet: '../ui.css' }
    }, api, document)).resolves.toBe(false);
    expect(api.readGameCardFile).not.toHaveBeenCalled();
  });
});
