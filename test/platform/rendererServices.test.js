import { createElectronRendererServices } from '../../src/platform/electronRendererServices.js';
import { createMemoryRendererServices } from '../../src/platform/memoryRendererServices.js';
import { createTauriRendererServices } from '../../src/platform/tauriRendererServices.js';
import { verifyRendererServices } from './adapterContracts.js';

function mockTauriClient() {
  const invoke = jest.fn(async (command, args) => {
    const values = {
      get_model_config: {}, save_model_config: args.config,
      get_background_config: {}, save_background_config: args.config,
      select_background_image: 'asset://background',
      get_chat_history: { messages: [] }, save_chat_history: {},
      list_chat_sessions: { sessions: [], activeId: null }, get_active_chat_session: null,
      create_chat_session: { id: 'session-1' }, set_active_chat_session: { id: args.id },
      rename_chat_session: { id: args.id, title: args.title }, delete_chat_session: { activeId: null },
      import_game_card_from_directory: null
    };
    return values[command];
  });
  return {
    invoke,
    listen: jest.fn(async () => () => {}),
    convertFileSrc: path => `asset:///${encodeURIComponent(path)}`
  };
}

describe('renderer service contract', () => {
  test('memory adapter implements the renderer services', async () => {
    await verifyRendererServices(createMemoryRendererServices({
      config: {}, background: {}, sessions: [], selectedImage: 'asset://background'
    }));
  });

  test('Electron adapter unwraps IPC results and subscriptions', async () => {
    const unsubscribe = jest.fn();
    window.electronAPI.getModelConfig.mockResolvedValue({ success: true, config: {} });
    window.electronAPI.saveModelConfig.mockResolvedValue({ success: true, config: { modelName: 'model' } });
    window.electronAPI.getBackgroundConfig.mockResolvedValue({ success: true, config: {} });
    window.electronAPI.saveBackgroundConfig.mockResolvedValue({ success: true, config: {} });
    window.electronAPI.listChatSessions.mockResolvedValue({ success: true, sessions: [], activeId: null });
    window.electronAPI.onBackgroundConfigChanged.mockReturnValue(unsubscribe);
    window.electronAPI.selectBackgroundImage.mockResolvedValue({ success: true, localUrl: 'asset://background' });
    window.electronAPI.importGameCardFromDirectory.mockResolvedValue({ success: true, card: null });
    await verifyRendererServices(createElectronRendererServices());
    expect(window.electronAPI.onBackgroundConfigChanged).toHaveBeenCalled();
  });

  test('Tauri adapter implements the same renderer services', async () => {
    await verifyRendererServices(createTauriRendererServices(mockTauriClient()));
  });

  test('Electron adapter standardizes IPC failures as errors', async () => {
    window.electronAPI.getModelConfig.mockResolvedValue({ success: false, error: 'broken' });
    await expect(createElectronRendererServices().config.load()).rejects.toThrow('broken');
  });

  test('Electron card import matches the direct CardRepository result', async () => {
    const card = { id: 'imported-card' };
    window.electronAPI.importGameCardFromDirectory.mockResolvedValue({ success: true, card });

    await expect(createElectronRendererServices().cards.importDirectory()).resolves.toBe(card);
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
