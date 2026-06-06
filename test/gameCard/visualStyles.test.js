const {
  loadGameCardVisualStyle,
  removeGameCardVisualStyle,
  isSafeVisualStylesheetPath
} = require('../../src/gameCard/visualStyles');

describe('game card visual styles', () => {
  afterEach(() => {
    removeGameCardVisualStyle(document);
    jest.clearAllMocks();
  });

  test('loads visual stylesheet content from active game card resources', async () => {
    const api = {
      readGameCardFile: jest.fn().mockResolvedValue({
        success: true,
        content: '.game-card-visual-panel { opacity: 0.9; }'
      })
    };

    await expect(loadGameCardVisualStyle({
      id: 'white-album-2',
      visual: { stylesheet: 'visual.css' }
    }, api, document)).resolves.toBe(true);

    const style = document.getElementById('game-card-visual-style');
    expect(api.readGameCardFile).toHaveBeenCalledWith('white-album-2', 'visual.css');
    expect(style.textContent).toContain('.game-card-visual-panel');
    expect(style.dataset.gameCardId).toBe('white-album-2');
  });

  test('rejects unsafe visual stylesheet paths before IPC read', async () => {
    const api = { readGameCardFile: jest.fn() };

    expect(isSafeVisualStylesheetPath('../visual.css')).toBe(false);
    expect(isSafeVisualStylesheetPath('/visual.css')).toBe(false);
    expect(isSafeVisualStylesheetPath('visual.txt')).toBe(false);
    await expect(loadGameCardVisualStyle({
      id: 'card-a',
      visual: { stylesheet: '../visual.css' }
    }, api, document)).resolves.toBe(false);
    expect(api.readGameCardFile).not.toHaveBeenCalled();
  });
});
