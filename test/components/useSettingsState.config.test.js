/**
 * Tests for useSettingsState custom hook - Config Loading
 */

const { renderHook, act: hookAct } = require('@testing-library/react');

const electronAPI = global.window.electronAPI;

describe('useSettingsState Hook - Config Loading', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    electronAPI.getModelConfig.mockResolvedValue({
      success: true,
      config: { apiUrl: 'http://api.example.com', apiKey: 'test-key', modelName: 'gpt-4' }
    });
    electronAPI.saveModelConfig.mockResolvedValue({ success: true });
    electronAPI.getBackgroundConfig.mockResolvedValue({
      success: true,
      config: { backgroundImageUrl: '', backgroundOpacity: 0.5 }
    });
    electronAPI.saveBackgroundConfig.mockResolvedValue({ success: true });
  });

  test('should load model config on mount', async () => {
    electronAPI.getModelConfig.mockResolvedValue({
      success: true,
      config: { apiUrl: 'http://api.test.com', apiKey: 'key123', modelName: 'model-1' }
    });

    const useSettingsState = require('../../src/components/useSettingsState.js').default;
    const { result } = renderHook(() => useSettingsState(jest.fn()));

    await hookAct(async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
    });

    expect(electronAPI.getModelConfig).toHaveBeenCalled();
    expect(result.current.config.apiUrl).toBe('http://api.test.com');
    expect(result.current.config.apiKey).toBe('key123');
    expect(result.current.config.modelName).toBe('model-1');
  });

  test('should load background config on mount', async () => {
    electronAPI.getBackgroundConfig.mockResolvedValue({
      success: true,
      config: { backgroundImageUrl: 'bg-url', backgroundOpacity: 0.8 }
    });

    const onBackgroundChange = jest.fn();
    const useSettingsState = require('../../src/components/useSettingsState.js').default;
    const { result } = renderHook(() => useSettingsState(onBackgroundChange));

    await hookAct(async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
    });

    expect(electronAPI.getBackgroundConfig).toHaveBeenCalled();
    expect(result.current.backgroundConfig.backgroundImageUrl).toBe('bg-url');
    expect(result.current.backgroundConfig.backgroundOpacity).toBe(0.8);
  });

  test('should call onBackgroundChange when background config loaded', async () => {
    const bgConfig = { backgroundImageUrl: 'test-bg', backgroundOpacity: 0.6 };
    electronAPI.getBackgroundConfig.mockResolvedValue({ success: true, config: bgConfig });

    const onBackgroundChange = jest.fn();
    const useSettingsState = require('../../src/components/useSettingsState.js').default;
    renderHook(() => useSettingsState(onBackgroundChange));

    await hookAct(async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
    });

    expect(onBackgroundChange).toHaveBeenCalledWith(bgConfig);
  });

  test('should handle failed config load gracefully', async () => {
    electronAPI.getModelConfig.mockResolvedValue({ success: false, error: 'Failed' });
    electronAPI.getBackgroundConfig.mockResolvedValue({ success: false, error: 'Failed' });

    const useSettingsState = require('../../src/components/useSettingsState.js').default;
    const { result } = renderHook(() => useSettingsState(jest.fn()));

    await hookAct(async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
    });

    expect(result.current.config.apiUrl).toBe('');
    expect(result.current.backgroundConfig.backgroundImageUrl).toBe('');
  });

  test('should handle no electronAPI gracefully', async () => {
    const originalElectronAPI = window.electronAPI;
    window.electronAPI = undefined;

    const useSettingsState = require('../../src/components/useSettingsState.js').default;
    const { result } = renderHook(() => useSettingsState(jest.fn()));

    await hookAct(async () => { await Promise.resolve(); });
    expect(result.current.config.apiUrl).toBe('');

    window.electronAPI = originalElectronAPI;
  });
});