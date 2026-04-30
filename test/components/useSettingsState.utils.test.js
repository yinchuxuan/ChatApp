const { renderHook, act: hookAct } = require('@testing-library/react');

const electronAPI = global.window.electronAPI;

describe('useSettingsState Hook - Utilities', () => {
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
  });

  describe('maskApiKey', () => {
    test('should mask long API key', async () => {
      const useSettingsState = require('../../src/components/useSettingsState.js').default;
      const { result } = renderHook(() => useSettingsState(jest.fn()));

      await hookAct(async () => { await Promise.resolve(); });

      const masked = result.current.maskApiKey('test-api-key-12345');
      expect(masked).toBe('test****2345');
    });

    test('should mask short API key as ****', async () => {
      const useSettingsState = require('../../src/components/useSettingsState.js').default;
      const { result } = renderHook(() => useSettingsState(jest.fn()));

      await hookAct(async () => { await Promise.resolve(); });

      const masked = result.current.maskApiKey('short');
      expect(masked).toBe('****');
    });

    test('should return empty string for null key', async () => {
      const useSettingsState = require('../../src/components/useSettingsState.js').default;
      const { result } = renderHook(() => useSettingsState(jest.fn()));

      await hookAct(async () => { await Promise.resolve(); });

      const masked = result.current.maskApiKey(null);
      expect(masked).toBe('');
    });

    test('should return empty string for empty key', async () => {
      const useSettingsState = require('../../src/components/useSettingsState.js').default;
      const { result } = renderHook(() => useSettingsState(jest.fn()));

      await hookAct(async () => { await Promise.resolve(); });

      const masked = result.current.maskApiKey('');
      expect(masked).toBe('');
    });

    test('should mask 8-character key as ****', async () => {
      const useSettingsState = require('../../src/components/useSettingsState.js').default;
      const { result } = renderHook(() => useSettingsState(jest.fn()));

      await hookAct(async () => { await Promise.resolve(); });

      const masked = result.current.maskApiKey('12345678');
      expect(masked).toBe('****');
    });

    test('should mask 9-character key correctly', async () => {
      const useSettingsState = require('../../src/components/useSettingsState.js').default;
      const { result } = renderHook(() => useSettingsState(jest.fn()));

      await hookAct(async () => { await Promise.resolve(); });

      const masked = result.current.maskApiKey('123456789');
      expect(masked).toBe('1234****6789');
    });
  });

  describe('isConfigured', () => {
    test('should return falsy value when no config set', async () => {
      electronAPI.getModelConfig.mockResolvedValue({
        success: true,
        config: { apiUrl: '', apiKey: '', modelName: '' }
      });

      const useSettingsState = require('../../src/components/useSettingsState.js').default;
      const { result } = renderHook(() => useSettingsState(jest.fn()));

      await hookAct(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      expect(result.current.isConfigured).toBeFalsy();
    });

    test('should return truthy value when apiUrl is set', async () => {
      electronAPI.getModelConfig.mockResolvedValue({
        success: true,
        config: { apiUrl: 'http://api.com', apiKey: '', modelName: '' }
      });

      const useSettingsState = require('../../src/components/useSettingsState.js').default;
      const { result } = renderHook(() => useSettingsState(jest.fn()));

      await hookAct(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      expect(result.current.isConfigured).toBeTruthy();
    });

    test('should return truthy value when apiKey is set', async () => {
      electronAPI.getModelConfig.mockResolvedValue({
        success: true,
        config: { apiUrl: '', apiKey: 'key', modelName: '' }
      });

      const useSettingsState = require('../../src/components/useSettingsState.js').default;
      const { result } = renderHook(() => useSettingsState(jest.fn()));

      await hookAct(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      expect(result.current.isConfigured).toBeTruthy();
    });

    test('should return truthy value when modelName is set', async () => {
      electronAPI.getModelConfig.mockResolvedValue({
        success: true,
        config: { apiUrl: '', apiKey: '', modelName: 'model' }
      });

      const useSettingsState = require('../../src/components/useSettingsState.js').default;
      const { result } = renderHook(() => useSettingsState(jest.fn()));

      await hookAct(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      expect(result.current.isConfigured).toBeTruthy();
    });

    test('should return truthy value when all fields are set', async () => {
      electronAPI.getModelConfig.mockResolvedValue({
        success: true,
        config: { apiUrl: 'http://api.com', apiKey: 'key', modelName: 'model' }
      });

      const useSettingsState = require('../../src/components/useSettingsState.js').default;
      const { result } = renderHook(() => useSettingsState(jest.fn()));

      await hookAct(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      expect(result.current.isConfigured).toBeTruthy();
    });
  });

  describe('Return Value', () => {
    test('should return all required properties', async () => {
      const useSettingsState = require('../../src/components/useSettingsState.js').default;
      const { result } = renderHook(() => useSettingsState(jest.fn()));

      await hookAct(async () => { await Promise.resolve(); });

      const returned = result.current;

      expect(returned.config).toBeDefined();
      expect(returned.editConfig).toBeDefined();
      expect(returned.editMode).toBeDefined();
      expect(returned.backgroundConfig).toBeDefined();
      expect(returned.editBackgroundConfig).toBeDefined();
      expect(returned.backgroundEditMode).toBeDefined();
      expect(returned.isConfigured).toBeDefined();
      expect(returned.maskApiKey).toBeDefined();
      expect(returned.handleEditClick).toBeDefined();
      expect(returned.handleCancelEdit).toBeDefined();
      expect(returned.handleChange).toBeDefined();
      expect(returned.handleSave).toBeDefined();
      expect(returned.handleBackgroundEditClick).toBeDefined();
      expect(returned.handleBackgroundCancelEdit).toBeDefined();
      expect(returned.handleBackgroundChange).toBeDefined();
      expect(returned.handleBackgroundSave).toBeDefined();
      expect(returned.handleSelectBackgroundImage).toBeDefined();
      expect(returned.handleClearBackgroundImage).toBeDefined();
    });
  });

  describe('Window Export', () => {
    test('should be available on window when window exists', () => {
      expect(typeof window !== 'undefined').toBe(true);
      expect(window.useSettingsState).toBeDefined();
    });
  });
});