/**
 * Tests for useSettingsState custom hook - Initial State
 */

const { renderHook, act: hookAct } = require('@testing-library/react');

const electronAPI = global.window.electronAPI;

describe('useSettingsState Hook - Initial State', () => {
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
    electronAPI.selectBackgroundImage.mockResolvedValue({ success: false, canceled: true });
    electronAPI.readBackgroundImage.mockResolvedValue({
      success: true, localUrl: 'local-url', mimeType: 'image/jpeg'
    });
  });

  test('should initialize with empty config', async () => {
    electronAPI.getModelConfig.mockResolvedValue({ success: false, error: 'Not found' });
    electronAPI.getBackgroundConfig.mockResolvedValue({ success: false, error: 'Not found' });

    const useSettingsState = require('../../src/components/useSettingsState.js').default;
    const { result } = renderHook(() => useSettingsState(jest.fn()));

    await hookAct(async () => { await Promise.resolve(); });

    expect(result.current.config.apiUrl).toBe('');
    expect(result.current.config.apiKey).toBe('');
    expect(result.current.config.modelName).toBe('');
  });

  test('should initialize editMode as false', async () => {
    const useSettingsState = require('../../src/components/useSettingsState.js').default;
    const { result } = renderHook(() => useSettingsState(jest.fn()));

    await hookAct(async () => { await Promise.resolve(); });
    expect(result.current.editMode).toBe(false);
  });

  test('should initialize backgroundEditMode as false', async () => {
    const useSettingsState = require('../../src/components/useSettingsState.js').default;
    const { result } = renderHook(() => useSettingsState(jest.fn()));

    await hookAct(async () => { await Promise.resolve(); });
    expect(result.current.backgroundEditMode).toBe(false);
  });
});