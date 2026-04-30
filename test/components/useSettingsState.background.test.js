const { renderHook, act: hookAct } = require('@testing-library/react');

const electronAPI = global.window.electronAPI;

describe('useSettingsState Hook - Background Handlers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    electronAPI.getModelConfig.mockResolvedValue({
      success: true,
      config: { apiUrl: 'http://api.example.com', apiKey: 'test-key', modelName: 'gpt-4' }
    });
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

  test('should handle handleBackgroundEditClick', async () => {
    electronAPI.getBackgroundConfig.mockResolvedValue({
      success: true,
      config: { backgroundImageUrl: 'bg-url', backgroundOpacity: 0.5 }
    });

    const useSettingsState = require('../../src/components/useSettingsState.js').default;
    const { result } = renderHook(() => useSettingsState(jest.fn()));

    await hookAct(async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
    });

    expect(result.current.backgroundEditMode).toBe(false);

    hookAct(() => { result.current.handleBackgroundEditClick(); });

    expect(result.current.backgroundEditMode).toBe(true);
    expect(result.current.editBackgroundConfig.backgroundImageUrl).toBe('bg-url');
  });

  test('should handle handleBackgroundCancelEdit', async () => {
    electronAPI.getBackgroundConfig.mockResolvedValue({
      success: true,
      config: { backgroundImageUrl: 'bg-url', backgroundOpacity: 0.5 }
    });

    const useSettingsState = require('../../src/components/useSettingsState.js').default;
    const { result } = renderHook(() => useSettingsState(jest.fn()));

    await hookAct(async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
    });

    hookAct(() => { result.current.handleBackgroundEditClick(); });
    expect(result.current.backgroundEditMode).toBe(true);

    hookAct(() => { result.current.handleBackgroundCancelEdit(); });

    expect(result.current.backgroundEditMode).toBe(false);
    expect(result.current.editBackgroundConfig.backgroundImageUrl).toBe('bg-url');
  });

  test('should handle handleBackgroundChange for backgroundImageUrl', async () => {
    const useSettingsState = require('../../src/components/useSettingsState.js').default;
    const { result } = renderHook(() => useSettingsState(jest.fn()));

    await hookAct(async () => { await Promise.resolve(); });

    hookAct(() => {
      result.current.handleBackgroundChange('backgroundImageUrl', 'new-bg-url');
    });

    expect(result.current.editBackgroundConfig.backgroundImageUrl).toBe('new-bg-url');
  });

  test('should handle handleBackgroundChange for backgroundOpacity', async () => {
    const useSettingsState = require('../../src/components/useSettingsState.js').default;
    const { result } = renderHook(() => useSettingsState(jest.fn()));

    await hookAct(async () => { await Promise.resolve(); });

    hookAct(() => { result.current.handleBackgroundChange('backgroundOpacity', 0.8); });

    expect(result.current.editBackgroundConfig.backgroundOpacity).toBe(0.8);
  });

  test('should handle handleBackgroundSave successfully', async () => {
    electronAPI.getBackgroundConfig.mockResolvedValue({
      success: true,
      config: { backgroundImageUrl: '', backgroundOpacity: 0.5 }
    });
    electronAPI.saveBackgroundConfig.mockResolvedValue({ success: true });

    const onBackgroundChange = jest.fn();
    const useSettingsState = require('../../src/components/useSettingsState.js').default;
    const { result } = renderHook(() => useSettingsState(onBackgroundChange));

    await hookAct(async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
    });

    hookAct(() => {
      result.current.handleBackgroundEditClick();
      result.current.handleBackgroundChange('backgroundImageUrl', 'saved-bg');
      result.current.handleBackgroundChange('backgroundOpacity', 0.3);
    });

    await hookAct(async () => { await result.current.handleBackgroundSave(); });

    expect(electronAPI.saveBackgroundConfig).toHaveBeenCalledWith({
      backgroundImageUrl: 'saved-bg',
      backgroundOpacity: 0.3
    });
    expect(result.current.backgroundEditMode).toBe(false);
    expect(result.current.backgroundConfig.backgroundImageUrl).toBe('saved-bg');
    expect(onBackgroundChange).toHaveBeenCalledWith({
      backgroundImageUrl: 'saved-bg',
      backgroundOpacity: 0.3
    });
  });

  test('should handle handleSelectBackgroundImage successfully', async () => {
    electronAPI.selectBackgroundImage.mockResolvedValue({
      success: true,
      filePath: '/path/to/image.jpg'
    });
    electronAPI.readBackgroundImage.mockResolvedValue({
      success: true,
      localUrl: 'local://image.jpg'
    });

    const useSettingsState = require('../../src/components/useSettingsState.js').default;
    const { result } = renderHook(() => useSettingsState(jest.fn()));

    await hookAct(async () => { await Promise.resolve(); });

    await hookAct(async () => { await result.current.handleSelectBackgroundImage(); });

    expect(electronAPI.selectBackgroundImage).toHaveBeenCalled();
    expect(electronAPI.readBackgroundImage).toHaveBeenCalledWith('/path/to/image.jpg');
    expect(result.current.editBackgroundConfig.backgroundImageUrl).toBe('local://image.jpg');
  });

  test('should handle canceled image selection', async () => {
    electronAPI.selectBackgroundImage.mockResolvedValue({ success: false, canceled: true });

    const useSettingsState = require('../../src/components/useSettingsState.js').default;
    const { result } = renderHook(() => useSettingsState(jest.fn()));

    await hookAct(async () => { await Promise.resolve(); });

    const initialUrl = result.current.editBackgroundConfig.backgroundImageUrl;

    await hookAct(async () => { await result.current.handleSelectBackgroundImage(); });

    expect(result.current.editBackgroundConfig.backgroundImageUrl).toBe(initialUrl);
  });

  test('should handle failed image read', async () => {
    electronAPI.selectBackgroundImage.mockResolvedValue({
      success: true,
      filePath: '/path/to/image.jpg'
    });
    electronAPI.readBackgroundImage.mockResolvedValue({ success: false, error: 'Read failed' });

    const useSettingsState = require('../../src/components/useSettingsState.js').default;
    const { result } = renderHook(() => useSettingsState(jest.fn()));

    await hookAct(async () => { await Promise.resolve(); });

    const initialUrl = result.current.editBackgroundConfig.backgroundImageUrl;

    await hookAct(async () => { await result.current.handleSelectBackgroundImage(); });

    expect(result.current.editBackgroundConfig.backgroundImageUrl).toBe(initialUrl);
  });

  test('should handle handleClearBackgroundImage', async () => {
    electronAPI.getBackgroundConfig.mockResolvedValue({
      success: true,
      config: { backgroundImageUrl: 'bg-url', backgroundOpacity: 0.5 }
    });

    const useSettingsState = require('../../src/components/useSettingsState.js').default;
    const { result } = renderHook(() => useSettingsState(jest.fn()));

    await hookAct(async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
    });

    hookAct(() => { result.current.handleClearBackgroundImage(); });

    expect(result.current.editBackgroundConfig.backgroundImageUrl).toBe('');
  });
});