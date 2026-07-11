/**
 * Tests for Background Settings Component
 */

const _React = require('react');

const electronAPI = global.window.electronAPI;

describe('Background Settings Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    electronAPI.getBackgroundConfig.mockResolvedValue({
      success: true,
      config: { backgroundImageUrl: '', backgroundOpacity: 0.5 }
    });
    electronAPI.saveBackgroundConfig.mockResolvedValue({ success: true });
    electronAPI.selectBackgroundImage.mockResolvedValue({ success: false, canceled: true });
  });

  test('should load background config on mount', async () => {
    const result = await electronAPI.getBackgroundConfig();
    expect(result.success).toBe(true);
    expect(result.config.backgroundOpacity).toBe(0.5);
  });

  test('should save background config', async () => {
    const newConfig = {
      backgroundImageUrl: 'data:image/jpeg;base64,base64imagedata',
      backgroundOpacity: 0.7
    };
    const result = await electronAPI.saveBackgroundConfig(newConfig);
    expect(result.success).toBe(true);
  });

  test('should return an authorized URL after image selection', async () => {
    electronAPI.selectBackgroundImage.mockResolvedValue({
      success: true,
      localUrl: 'local://user-background/current',
      mimeType: 'image/jpeg'
    });

    const selectionResult = await electronAPI.selectBackgroundImage();
    expect(selectionResult.success).toBe(true);
    expect(selectionResult.localUrl).toBe('local://user-background/current');
    expect(selectionResult.filePath).toBeUndefined();
  });

  test('should handle canceled image selection', async () => {
    electronAPI.selectBackgroundImage.mockResolvedValue({ success: false, canceled: true });
    const result = await electronAPI.selectBackgroundImage();
    expect(result.success).toBe(false);
    expect(result.canceled).toBe(true);
  });

  test('should handle full background workflow', async () => {
    electronAPI.getBackgroundConfig.mockResolvedValue({
      success: true, config: { backgroundImageUrl: '', backgroundOpacity: 0.5 }
    });
    electronAPI.selectBackgroundImage.mockResolvedValue({
      success: true,
      localUrl: 'local://user-background/current',
      mimeType: 'image/jpeg'
    });
    electronAPI.saveBackgroundConfig.mockResolvedValue({ success: true });

    const initialConfig = await electronAPI.getBackgroundConfig();
    expect(initialConfig.config.backgroundImageUrl).toBe('');

    const selectionResult = await electronAPI.selectBackgroundImage();
    expect(selectionResult.filePath).toBeUndefined();

    const saveResult = await electronAPI.saveBackgroundConfig({
      backgroundImageUrl: selectionResult.localUrl, backgroundOpacity: 0.3
    });
    expect(saveResult.success).toBe(true);
  });
});
