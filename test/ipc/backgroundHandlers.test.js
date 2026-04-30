/**
 * Tests for main.js IPC Handlers - Background Configuration
 */

const electronMock = require('electron');
const mockFs = require('fs');

require('../../main');

describe('Background IPC Handlers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readFileSync.mockReturnValue('');
    mockFs.writeFileSync.mockReturnValue(undefined);
    electronMock.dialog.showOpenDialog.mockResolvedValue({ canceled: true, filePaths: [] });
  });

  describe('get-background-config handler', () => {
    test('should return config when file exists', async () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue(JSON.stringify({
        backgroundImageUrl: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD',
        backgroundOpacity: 0.7
      }));

      const handlers = electronMock._registeredHandlers;
      const handler = handlers['get-background-config'];

      const result = await handler();
      expect(result.success).toBe(true);
      expect(result.config.backgroundImageUrl).toBe('data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD');
      expect(result.config.backgroundOpacity).toBe(0.7);
    });

    test('should return default config when file missing', async () => {
      mockFs.existsSync.mockReturnValue(false);

      const handlers = electronMock._registeredHandlers;
      const handler = handlers['get-background-config'];

      const result = await handler();
      expect(result.success).toBe(true);
      expect(result.config).toEqual({
        backgroundImageUrl: '',
        backgroundOpacity: 0.5
      });
    });

    test('should handle JSON parse error', async () => {
      mockFs.existsSync.mockReturnValue(true);
      mockFs.readFileSync.mockReturnValue('invalid json');

      const handlers = electronMock._registeredHandlers;
      const handler = handlers['get-background-config'];

      const result = await handler();
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('save-background-config handler', () => {
    test('should save config successfully', async () => {
      const handlers = electronMock._registeredHandlers;
      const handler = handlers['save-background-config'];

      const config = {
        backgroundImageUrl: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD',
        backgroundOpacity: 0.3
      };

      const result = await handler({}, config);
      expect(result.success).toBe(true);
      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('background-config.json'),
        expect.stringContaining('backgroundImageUrl'),
        'utf-8'
      );
    });

    test('should handle save error', async () => {
      mockFs.writeFileSync.mockImplementation(() => { throw new Error('Save error'); });

      const handlers = electronMock._registeredHandlers;
      const handler = handlers['save-background-config'];

      const config = { backgroundImageUrl: 'test', backgroundOpacity: 0.5 };
      const result = await handler({}, config);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Save error');
    });
  });

  describe('select-background-image handler', () => {
    test('should return canceled when dialog canceled', async () => {
      electronMock.dialog.showOpenDialog.mockResolvedValue({ canceled: true, filePaths: [] });

      const handlers = electronMock._registeredHandlers;
      const handler = handlers['select-background-image'];

      const result = await handler({});
      expect(result.success).toBe(false);
      expect(result.canceled).toBe(true);
    });

    test('should return file path when file selected', async () => {
      electronMock.dialog.showOpenDialog.mockResolvedValue({
        canceled: false,
        filePaths: ['/test/image.jpg']
      });

      const handlers = electronMock._registeredHandlers;
      const handler = handlers['select-background-image'];

      const result = await handler({});
      expect(result.success).toBe(true);
      expect(result.filePath).toBe('/test/image.jpg');
    });
  });

  describe('read-background-image handler', () => {
    test('should return local:// URL for JPG file successfully', async () => {
      mockFs.existsSync.mockReturnValue(true);

      const handlers = electronMock._registeredHandlers;
      const handler = handlers['read-background-image'];

      const result = await handler({}, '/test/background.jpg');
      expect(result.success).toBe(true);
      expect(result.localUrl).toBe('local:///test/background.jpg');
      expect(result.mimeType).toBe('image/jpeg');
    });

    test('should read PNG file with correct mime type', async () => {
      mockFs.existsSync.mockReturnValue(true);

      const handlers = electronMock._registeredHandlers;
      const handler = handlers['read-background-image'];

      const result = await handler({}, '/test/image.png');
      expect(result.success).toBe(true);
      expect(result.mimeType).toBe('image/png');
    });

    test('should handle file not found', async () => {
      mockFs.existsSync.mockReturnValue(false);

      const handlers = electronMock._registeredHandlers;
      const handler = handlers['read-background-image'];

      const result = await handler({}, '/missing/image.jpg');
      expect(result.success).toBe(false);
      expect(result.error).toBe('File not found');
    });
  });
});