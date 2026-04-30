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

  test('should handle handleEditClick', async () => {
    electronAPI.getModelConfig.mockResolvedValue({
      success: true,
      config: { apiUrl: 'http://api.com', apiKey: 'key', modelName: 'model' }
    });

    const useSettingsState = require('../../src/components/useSettingsState.js').default;
    const { result } = renderHook(() => useSettingsState(jest.fn()));

    await hookAct(async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
    });

    expect(result.current.editMode).toBe(false);

    hookAct(() => { result.current.handleEditClick(); });

    expect(result.current.editMode).toBe(true);
    expect(result.current.editConfig.apiUrl).toBe('http://api.com');
  });

  test('should handle handleCancelEdit', async () => {
    electronAPI.getModelConfig.mockResolvedValue({
      success: true,
      config: { apiUrl: 'http://api.com', apiKey: 'key', modelName: 'model' }
    });

    const useSettingsState = require('../../src/components/useSettingsState.js').default;
    const { result } = renderHook(() => useSettingsState(jest.fn()));

    await hookAct(async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
    });

    hookAct(() => { result.current.handleEditClick(); });
    expect(result.current.editMode).toBe(true);

    hookAct(() => { result.current.handleCancelEdit(); });

    expect(result.current.editMode).toBe(false);
    expect(result.current.editConfig.apiUrl).toBe('http://api.com');
  });

  test('should handle handleChange', async () => {
    const useSettingsState = require('../../src/components/useSettingsState.js').default;
    const { result } = renderHook(() => useSettingsState(jest.fn()));

    await hookAct(async () => { await Promise.resolve(); });

    hookAct(() => { result.current.handleChange('apiUrl', 'http://new-api.com'); });
    expect(result.current.editConfig.apiUrl).toBe('http://new-api.com');
  });

  test('should handle handleChange for apiKey', async () => {
    const useSettingsState = require('../../src/components/useSettingsState.js').default;
    const { result } = renderHook(() => useSettingsState(jest.fn()));

    await hookAct(async () => { await Promise.resolve(); });

    hookAct(() => { result.current.handleChange('apiKey', 'new-key-123'); });
    expect(result.current.editConfig.apiKey).toBe('new-key-123');
  });

  test('should handle handleChange for modelName', async () => {
    const useSettingsState = require('../../src/components/useSettingsState.js').default;
    const { result } = renderHook(() => useSettingsState(jest.fn()));

    await hookAct(async () => { await Promise.resolve(); });

    hookAct(() => { result.current.handleChange('modelName', 'new-model'); });
    expect(result.current.editConfig.modelName).toBe('new-model');
  });

  test('should handle handleSave successfully', async () => {
    electronAPI.getModelConfig.mockResolvedValue({
      success: true,
      config: { apiUrl: 'http://api.com', apiKey: 'key', modelName: 'model' }
    });
    electronAPI.saveModelConfig.mockResolvedValue({ success: true });

    const useSettingsState = require('../../src/components/useSettingsState.js').default;
    const { result } = renderHook(() => useSettingsState(jest.fn()));

    await hookAct(async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
    });

    hookAct(() => {
      result.current.handleEditClick();
      result.current.handleChange('apiUrl', 'http://saved-api.com');
    });

    await hookAct(async () => { await result.current.handleSave(); });

    expect(electronAPI.saveModelConfig).toHaveBeenCalled();
    expect(result.current.editMode).toBe(false);
    expect(result.current.config.apiUrl).toBe('http://saved-api.com');
  });

  test('should not update state on failed save', async () => {
    electronAPI.getModelConfig.mockResolvedValue({
      success: true,
      config: { apiUrl: 'http://api.com', apiKey: 'key', modelName: 'model' }
    });
    electronAPI.saveModelConfig.mockResolvedValue({ success: false, error: 'Save failed' });

    const useSettingsState = require('../../src/components/useSettingsState.js').default;
    const { result } = renderHook(() => useSettingsState(jest.fn()));

    await hookAct(async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
    });

    hookAct(() => {
      result.current.handleEditClick();
      result.current.handleChange('apiUrl', 'http://new-api.com');
    });

    await hookAct(async () => { await result.current.handleSave(); });

    expect(result.current.editMode).toBe(true);
    expect(result.current.config.apiUrl).toBe('http://api.com');
  });
});