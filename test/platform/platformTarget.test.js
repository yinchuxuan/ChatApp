import { createPlatformAdapters, getDesktopTarget } from '../../src/platform/platformTarget.js';

describe('desktop platform target', () => {
  test('defaults tests and non-Tauri builds to Electron', () => {
    expect(getDesktopTarget()).toBe('electron');
  });

  test.each(['electron', 'tauri'])('selects the %s factories', (target) => {
    const factories = {
      electron: {
        createGameCardPlatform: jest.fn(() => 'electron-card'),
        createRendererServices: jest.fn(() => 'electron-services')
      },
      tauri: {
        createGameCardPlatform: jest.fn(() => 'tauri-card'),
        createRendererServices: jest.fn(() => 'tauri-services')
      }
    };

    expect(createPlatformAdapters(target, factories)).toEqual({
      gameCardPlatform: `${target}-card`, rendererServices: `${target}-services`
    });
    expect(factories[target].createGameCardPlatform).toHaveBeenCalledTimes(1);
    expect(factories[target].createRendererServices).toHaveBeenCalledTimes(1);
  });
});
