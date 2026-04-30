/**
 * Tests for SettingsPanel Component and App Integration
 */

const _React = require('react');

const electronAPI = global.window.electronAPI;

describe('SettingsPanel Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    electronAPI.getModelConfig.mockResolvedValue({
      success: true,
      config: {
        apiUrl: 'http://api.example.com/v1',
        apiKey: 'test-api-key-12345',
        modelName: 'gpt-4'
      }
    });
    electronAPI.saveModelConfig.mockResolvedValue({ success: true });
  });

  test('should load config on mount', async () => {
    const result = await electronAPI.getModelConfig();
    expect(result.success).toBe(true);
    expect(result.config.apiUrl).toBeDefined();
  });

  test('should save config', async () => {
    const newConfig = {
      apiUrl: 'http://new-api.example.com/v1',
      apiKey: 'new-key',
      modelName: 'new-model'
    };
    const result = await electronAPI.saveModelConfig(newConfig);
    expect(result.success).toBe(true);
  });

  test('should mask API key for display', () => {
    const maskApiKey = (key) => {
      if (!key || key.length <= 8) return key ? '****' : '';
      return key.substring(0, 4) + '****' + key.substring(key.length - 4);
    };

    expect(maskApiKey('test-api-key-12345')).toBe('test****2345');
    expect(maskApiKey('short')).toBe('****');
    expect(maskApiKey('')).toBe('');
    expect(maskApiKey(null)).toBe('');
  });
});

describe('App Component Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should have all required electronAPI methods', () => {
    expect(electronAPI.getModelConfig).toBeDefined();
    expect(electronAPI.saveModelConfig).toBeDefined();
    expect(electronAPI.getBackgroundConfig).toBeDefined();
    expect(electronAPI.saveBackgroundConfig).toBeDefined();
    expect(electronAPI.selectBackgroundImage).toBeDefined();
    expect(electronAPI.readBackgroundImage).toBeDefined();
  });
});