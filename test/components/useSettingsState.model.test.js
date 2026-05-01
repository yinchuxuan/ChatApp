/**
 * Tests for useSettingsState custom hook - Model Handlers
 */

const { renderHook, act: hookAct } = require('@testing-library/react');

const electronAPI = global.window.electronAPI;

describe('useSettingsState Hook - Model Handlers', () => {
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

  test('should handle handleChange to update and auto-save config', async () => {
    const useSettingsState = require('../../src/components/useSettingsState.js').default;
    const { result } = renderHook(() => useSettingsState(jest.fn()));

    await hookAct(async () => { await Promise.resolve(); });

    hookAct(() => { result.current.handleChange('apiUrl', 'http://new-api.com'); });

    // State updated immediately
    expect(result.current.config.apiUrl).toBe('http://new-api.com');

    // Auto-save triggered
    await hookAct(async () => { await Promise.resolve(); });
    expect(electronAPI.saveModelConfig).toHaveBeenCalled();
  });

  test('should handle handleChange for apiKey', async () => {
    const useSettingsState = require('../../src/components/useSettingsState.js').default;
    const { result } = renderHook(() => useSettingsState(jest.fn()));

    await hookAct(async () => { await Promise.resolve(); });

    hookAct(() => { result.current.handleChange('apiKey', 'new-key-123'); });
    expect(result.current.config.apiKey).toBe('new-key-123');
  });

  test('should handle handleChange for modelName', async () => {
    const useSettingsState = require('../../src/components/useSettingsState.js').default;
    const { result } = renderHook(() => useSettingsState(jest.fn()));

    await hookAct(async () => { await Promise.resolve(); });

    hookAct(() => { result.current.handleChange('modelName', 'new-model'); });
    expect(result.current.config.modelName).toBe('new-model');
  });

  test('should dispatch model-config-changed event on save', async () => {
    const useSettingsState = require('../../src/components/useSettingsState.js').default;
    const dispatchSpy = jest.spyOn(window, 'dispatchEvent');

    const { result } = renderHook(() => useSettingsState(jest.fn()));

    await hookAct(async () => { await Promise.resolve(); });

    hookAct(() => { result.current.handleChange('apiUrl', 'http://saved-api.com'); });

    // Wait for async save
    await hookAct(async () => { await new Promise(r => setTimeout(r, 10)); });

    expect(dispatchSpy).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'model-config-changed' })
    );
    dispatchSpy.mockRestore();
  });
});
