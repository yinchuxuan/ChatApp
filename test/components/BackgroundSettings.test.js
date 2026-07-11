/**
 * Tests for Background Settings Component
 */

const _React = require('react');

const platformMock = global.platformMock;

describe('Background Settings Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    platformMock.getBackgroundConfig.mockResolvedValue({
      success: true,
      config: { backgroundImageUrl: '', backgroundOpacity: 0.5 }
    });
    platformMock.saveBackgroundConfig.mockResolvedValue({ success: true });
    platformMock.selectBackgroundImage.mockResolvedValue({ success: false, canceled: true });
  });

  test('should load background config on mount', async () => {
    const result = await platformMock.getBackgroundConfig();
    expect(result.success).toBe(true);
    expect(result.config.backgroundOpacity).toBe(0.5);
  });

  test('should save background config', async () => {
    const newConfig = {
      backgroundImageUrl: 'data:image/jpeg;base64,base64imagedata',
      backgroundOpacity: 0.7
    };
    const result = await platformMock.saveBackgroundConfig(newConfig);
    expect(result.success).toBe(true);
  });

  test('should return an authorized URL after image selection', async () => {
    platformMock.selectBackgroundImage.mockResolvedValue({
      success: true,
      localUrl: 'local://user-background/current',
      mimeType: 'image/jpeg'
    });

    const selectionResult = await platformMock.selectBackgroundImage();
    expect(selectionResult.success).toBe(true);
    expect(selectionResult.localUrl).toBe('local://user-background/current');
    expect(selectionResult.filePath).toBeUndefined();
  });

  test('should handle canceled image selection', async () => {
    platformMock.selectBackgroundImage.mockResolvedValue({ success: false, canceled: true });
    const result = await platformMock.selectBackgroundImage();
    expect(result.success).toBe(false);
    expect(result.canceled).toBe(true);
  });

  test('should handle full background workflow', async () => {
    platformMock.getBackgroundConfig.mockResolvedValue({
      success: true, config: { backgroundImageUrl: '', backgroundOpacity: 0.5 }
    });
    platformMock.selectBackgroundImage.mockResolvedValue({
      success: true,
      localUrl: 'local://user-background/current',
      mimeType: 'image/jpeg'
    });
    platformMock.saveBackgroundConfig.mockResolvedValue({ success: true });

    const initialConfig = await platformMock.getBackgroundConfig();
    expect(initialConfig.config.backgroundImageUrl).toBe('');

    const selectionResult = await platformMock.selectBackgroundImage();
    expect(selectionResult.filePath).toBeUndefined();

    const saveResult = await platformMock.saveBackgroundConfig({
      backgroundImageUrl: selectionResult.localUrl, backgroundOpacity: 0.3
    });
    expect(saveResult.success).toBe(true);
  });
});
