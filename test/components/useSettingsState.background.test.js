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

  test('should load background config on mount', async () => {
    electronAPI.getBackgroundConfig.mockResolvedValue({
      success: true,
      config: { backgroundImageUrl: 'bg-url', backgroundOpacity: 0.5 }
    });

    const useSettingsState = require('../../src/components/useSettingsState.js').default;
    const { result } = renderHook(() => useSettingsState(jest.fn()));

    await hookAct(async () => {
      await new Promise(resolve => setTimeout(resolve, 10));
    });

    expect(result.current.backgroundConfig.backgroundImageUrl).toBe('bg-url');
    expect(result.current.backgroundConfig.backgroundOpacity).toBe(0.5);
  });

  test('should handle handleBackgroundChange for backgroundImageUrl with auto-save', async () => {
    const useSettingsState = require('../../src/components/useSettingsState.js').default;
    const { result } = renderHook(() => useSettingsState(jest.fn()));

    await hookAct(async () => { await Promise.resolve(); });

    hookAct(() => {
      result.current.handleBackgroundChange('backgroundImageUrl', 'new-bg-url');
    });

    expect(result.current.backgroundConfig.backgroundImageUrl).toBe('new-bg-url');
    expect(electronAPI.saveBackgroundConfig).toHaveBeenCalledWith({
      backgroundImageUrl: 'new-bg-url',
      backgroundOpacity: 0.5
    });
  });

  test('should handle handleBackgroundChange for backgroundOpacity with auto-save', async () => {
    const useSettingsState = require('../../src/components/useSettingsState.js').default;
    const { result } = renderHook(() => useSettingsState(jest.fn()));

    await hookAct(async () => { await Promise.resolve(); });

    hookAct(() => { result.current.handleBackgroundChange('backgroundOpacity', 0.8); });

    expect(result.current.backgroundConfig.backgroundOpacity).toBe(0.8);
    expect(electronAPI.saveBackgroundConfig).toHaveBeenCalledWith({
      backgroundImageUrl: '',
      backgroundOpacity: 0.8
    });
  });

  test('should handle handleSelectBackgroundImage successfully with auto-save', async () => {
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
    expect(result.current.backgroundConfig.backgroundImageUrl).toBe('local://image.jpg');
  });

  test('should handle canceled image selection', async () => {
    electronAPI.selectBackgroundImage.mockResolvedValue({ success: false, canceled: true });

    const useSettingsState = require('../../src/components/useSettingsState.js').default;
    const { result } = renderHook(() => useSettingsState(jest.fn()));

    await hookAct(async () => { await Promise.resolve(); });

    const initialUrl = result.current.backgroundConfig.backgroundImageUrl;

    await hookAct(async () => { await result.current.handleSelectBackgroundImage(); });

    expect(result.current.backgroundConfig.backgroundImageUrl).toBe(initialUrl);
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

    const initialUrl = result.current.backgroundConfig.backgroundImageUrl;

    await hookAct(async () => { await result.current.handleSelectBackgroundImage(); });

    expect(result.current.backgroundConfig.backgroundImageUrl).toBe(initialUrl);
  });

  test('should handle handleClearBackgroundImage with auto-save', async () => {
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

    expect(result.current.backgroundConfig.backgroundImageUrl).toBe('');
    expect(electronAPI.saveBackgroundConfig).toHaveBeenCalledWith({
      backgroundImageUrl: '',
      backgroundOpacity: 0.5
    });
  });

  test('should call onBackgroundChange callback on save success', async () => {
    const onBackgroundChange = jest.fn();
    const useSettingsState = require('../../src/components/useSettingsState.js').default;
    const { result } = renderHook(() => useSettingsState(onBackgroundChange));

    await hookAct(async () => { await Promise.resolve(); });

    await hookAct(async () => {
      result.current.handleBackgroundChange('backgroundImageUrl', 'saved-bg');
    });

    await new Promise(resolve => setTimeout(resolve, 10));

    expect(onBackgroundChange).toHaveBeenCalledWith({
      backgroundImageUrl: 'saved-bg',
      backgroundOpacity: 0.5
    });
  });
});
