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
    electronAPI.readBackgroundImage.mockResolvedValue({
      success: true,
      data: 'base64imagedata',
      mimeType: 'image/jpeg',
      path: '/test/background.jpg'
    });
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

  test('should handle image selection and reading', async () => {
    electronAPI.selectBackgroundImage.mockResolvedValue({
      success: true, filePath: '/test/background.jpg'
    });
    electronAPI.readBackgroundImage.mockResolvedValue({
      success: true, data: 'base64imagedata', mimeType: 'image/jpeg', path: '/test/background.jpg'
    });

    const selectionResult = await electronAPI.selectBackgroundImage();
    expect(selectionResult.success).toBe(true);

    const imageResult = await electronAPI.readBackgroundImage(selectionResult.filePath);
    expect(imageResult.success).toBe(true);
    expect(imageResult.mimeType).toBe('image/jpeg');
  });

  test('should handle canceled image selection', async () => {
    electronAPI.selectBackgroundImage.mockResolvedValue({ success: false, canceled: true });
    const result = await electronAPI.selectBackgroundImage();
    expect(result.success).toBe(false);
    expect(result.canceled).toBe(true);
  });

  test('should handle image read error', async () => {
    electronAPI.readBackgroundImage.mockResolvedValue({ success: false, error: 'File not found' });
    const result = await electronAPI.readBackgroundImage('/missing/image.jpg');
    expect(result.success).toBe(false);
    expect(result.error).toBe('File not found');
  });

  test('should handle full background workflow', async () => {
    electronAPI.getBackgroundConfig.mockResolvedValue({
      success: true, config: { backgroundImageUrl: '', backgroundOpacity: 0.5 }
    });
    electronAPI.selectBackgroundImage.mockResolvedValue({
      success: true, filePath: '/test/new-bg.jpg'
    });
    electronAPI.readBackgroundImage.mockResolvedValue({
      success: true, localUrl: 'local:///test/new-bg.jpg', mimeType: 'image/jpeg', path: '/test/new-bg.jpg'
    });
    electronAPI.saveBackgroundConfig.mockResolvedValue({ success: true });

    const initialConfig = await electronAPI.getBackgroundConfig();
    expect(initialConfig.config.backgroundImageUrl).toBe('');

    const selectionResult = await electronAPI.selectBackgroundImage();
    expect(selectionResult.filePath).toBe('/test/new-bg.jpg');

    const imageResult = await electronAPI.readBackgroundImage(selectionResult.filePath);
    expect(imageResult.success).toBe(true);

    const saveResult = await electronAPI.saveBackgroundConfig({
      backgroundImageUrl: imageResult.localUrl, backgroundOpacity: 0.3
    });
    expect(saveResult.success).toBe(true);
  });
});