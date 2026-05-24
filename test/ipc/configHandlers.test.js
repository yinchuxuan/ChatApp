/**
 * Tests for main.js IPC Handlers - Model Configuration
 */

const electronMock = require('electron');
const mockFs = require('fs');

require('../../main');

describe('Model Config IPC Handlers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readFileSync.mockReturnValue('');
    mockFs.writeFileSync.mockReturnValue(undefined);
    electronMock.dialog.showOpenDialog.mockResolvedValue({ canceled: true, filePaths: [] });
  });

  describe('get-model-config handler', () => {
    test('should return config when file exists', async () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify({
        apiUrl: 'http://api.example.com',
        apiKey: 'test-key',
        modelName: 'gpt-4'
      }));

      const handlers = electronMock._registeredHandlers;
      const handler = handlers['get-model-config'];

      const result = await handler();
      expect(result.success).toBe(true);
      expect(result.config.apiUrl).toBe('http://api.example.com');
    });

    test('should return empty config when file missing', async () => {
      mockFs.existsSync.mockReturnValue(false);

      const handlers = electronMock._registeredHandlers;
      const handler = handlers['get-model-config'];

      const result = await handler();
      expect(result.success).toBe(true);
      expect(result.config).toEqual({
        apiUrl: '',
        apiKey: '',
        modelName: ''
      });
    });

    test('should handle JSON parse error', async () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue('invalid json');

      const handlers = electronMock._registeredHandlers;
      const handler = handlers['get-model-config'];

      const result = await handler();
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('save-model-config handler', () => {
    test('should save config successfully', async () => {
      const handlers = electronMock._registeredHandlers;
      const handler = handlers['save-model-config'];

      const config = {
        apiUrl: 'http://api.example.com',
        apiKey: 'new-key',
        modelName: 'gpt-4'
      };

      const result = await handler({}, config);
      expect(result.success).toBe(true);
      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('model.json'),
        expect.stringContaining('apiUrl'),
        'utf-8'
      );
    });

    test('should handle save error', async () => {
      mockFs.writeFileSync.mockImplementation(() => { throw new Error('Save error'); });

      const handlers = electronMock._registeredHandlers;
      const handler = handlers['save-model-config'];

      const config = { apiUrl: 'test', apiKey: 'test', modelName: 'test' };
      const result = await handler({}, config);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Save error');
    });
  });
});
