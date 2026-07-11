/**
 * Tests for useSettingsState custom hook - Initial State
 */

const { renderHook, act: hookAct } = require('@testing-library/react');

const platformMock = global.platformMock;

describe('useSettingsState Hook - Initial State', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    platformMock.getModelConfig.mockResolvedValue({
      success: true,
      config: { apiUrl: 'http://api.example.com', apiKey: 'test-key', modelName: 'gpt-4' }
    });
    platformMock.saveModelConfig.mockResolvedValue({ success: true });
    platformMock.getBackgroundConfig.mockResolvedValue({
      success: true,
      config: { backgroundImageUrl: '', backgroundOpacity: 0.5 }
    });
    platformMock.saveBackgroundConfig.mockResolvedValue({ success: true });
    platformMock.selectBackgroundImage.mockResolvedValue({ success: false, canceled: true });
  });

  test('should initialize with empty config', async () => {
    platformMock.getModelConfig.mockResolvedValue({ success: false, error: 'Not found' });
    platformMock.getBackgroundConfig.mockResolvedValue({ success: false, error: 'Not found' });

    const useSettingsState = require('../../src/settings/useSettingsState.js').default;
    const { result } = renderHook(() => useSettingsState(jest.fn()));

    await hookAct(async () => { await Promise.resolve(); });

    expect(result.current.config.apiUrl).toBe('');
    expect(result.current.config.apiKey).toBe('');
    expect(result.current.config.modelName).toBe('');
  });

  test('should initialize protocol as openai', async () => {
    const useSettingsState = require('../../src/settings/useSettingsState.js').default;
    const { result } = renderHook(() => useSettingsState(jest.fn()));

    await hookAct(async () => { await Promise.resolve(); });
    expect(result.current.config.protocol).toBe('openai');
  });

  test('should initialize backgroundConfig with default values', async () => {
    const useSettingsState = require('../../src/settings/useSettingsState.js').default;
    const { result } = renderHook(() => useSettingsState(jest.fn()));

    await hookAct(async () => { await Promise.resolve(); });
    expect(result.current.backgroundConfig.backgroundOpacity).toBe(0.5);
    expect(result.current.backgroundConfig.backgroundImageUrl).toBe('');
  });
});
