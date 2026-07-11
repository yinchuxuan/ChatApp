import { createElectronRendererServices } from '../../src/platform/electronRendererServices.js';
import { createMemoryRendererServices } from '../../src/platform/memoryRendererServices.js';

async function verifyServiceContract(services) {
  expect(await services.config.load()).toEqual(expect.any(Object));
  expect(await services.config.save({ modelName: 'model' })).toEqual(expect.anything());
  expect(await services.background.load()).toEqual(expect.any(Object));
  expect(typeof services.background.subscribe(() => {})).toBe('function');
  expect(await services.sessions.list()).toEqual(expect.objectContaining({ sessions: expect.any(Array) }));
  expect(services.cards.importDirectory).toEqual(expect.any(Function));
}

describe('renderer service contract', () => {
  test('memory adapter implements the renderer services', async () => {
    await verifyServiceContract(createMemoryRendererServices({
      config: {}, background: {}, sessions: [], importedCard: { id: 'card' }
    }));
  });

  test('Electron adapter unwraps IPC results and subscriptions', async () => {
    const unsubscribe = jest.fn();
    window.electronAPI.getModelConfig.mockResolvedValue({ success: true, config: {} });
    window.electronAPI.saveModelConfig.mockResolvedValue({ success: true, config: { modelName: 'model' } });
    window.electronAPI.getBackgroundConfig.mockResolvedValue({ success: true, config: {} });
    window.electronAPI.listChatSessions.mockResolvedValue({ success: true, sessions: [], activeId: null });
    window.electronAPI.onBackgroundConfigChanged.mockReturnValue(unsubscribe);
    await verifyServiceContract(createElectronRendererServices());
    expect(window.electronAPI.onBackgroundConfigChanged).toHaveBeenCalled();
  });

  test('Electron adapter standardizes IPC failures as errors', async () => {
    window.electronAPI.getModelConfig.mockResolvedValue({ success: false, error: 'broken' });
    await expect(createElectronRendererServices().config.load()).rejects.toThrow('broken');
  });

  test('Electron adapter allows the desktop shell to mount before a bridge is available', () => {
    const originalApi = window.electronAPI;
    window.electronAPI = undefined;

    try {
      const unsubscribe = createElectronRendererServices().background.subscribe(() => {});
      expect(unsubscribe).toEqual(expect.any(Function));
    } finally {
      window.electronAPI = originalApi;
    }
  });
});
