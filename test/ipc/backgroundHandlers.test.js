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
    mockFs.realpathSync.mockImplementation(filePath => filePath);
    mockFs.statSync.mockReturnValue({ isFile: () => true, isDirectory: () => false });
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

    test('should not expose the stored background path', async () => {
      mockFs.readFileSync.mockReturnValue(JSON.stringify({
        backgroundImageUrl: 'local://user-background/current',
        backgroundImagePath: '/private/background.jpg',
        backgroundOpacity: 0.7
      }));

      const result = await electronMock._registeredHandlers['get-background-config']();

      expect(result.success).toBe(true);
      expect(result.config.backgroundImagePath).toBeUndefined();
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
        expect.stringContaining('background.json'),
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

    test('should return an authorized URL without the file path', async () => {
      electronMock.dialog.showOpenDialog.mockResolvedValue({
        canceled: false,
        filePaths: ['/test/image.jpg']
      });

      const handlers = electronMock._registeredHandlers;
      const handler = handlers['select-background-image'];

      const result = await handler({});
      expect(result.success).toBe(true);
      expect(result.localUrl).toBe('local://user-background/current');
      expect(result.filePath).toBeUndefined();
    });

    test('should reject a selected file with an invalid extension', async () => {
      electronMock.dialog.showOpenDialog.mockResolvedValue({
        canceled: false,
        filePaths: ['/test/secret.txt']
      });
      const handler = electronMock._registeredHandlers['select-background-image'];

      const result = await handler({});

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unsupported background image type');
    });
  });

  test('should persist a selected path without returning it', async () => {
    electronMock.dialog.showOpenDialog.mockResolvedValue({
      canceled: false,
      filePaths: ['/test/background.jpg']
    });
    mockFs.existsSync.mockImplementation(filePath => filePath === '/test/background.jpg');
    const handlers = electronMock._registeredHandlers;
    const selected = await handlers['select-background-image']();

    const result = await handlers['save-background-config']({}, {
      backgroundImageUrl: selected.localUrl,
      backgroundOpacity: 0.6
    });

    expect(result.success).toBe(true);
    expect(result.config.backgroundImagePath).toBeUndefined();
    expect(mockFs.writeFileSync).toHaveBeenCalledWith(
      expect.stringContaining('background.json'),
      expect.stringContaining('"backgroundImagePath": "/test/background.jpg"'),
      'utf-8'
    );
  });

  test('should reject an arbitrary local background URL', async () => {
    const result = await electronMock._registeredHandlers['save-background-config']({}, {
      backgroundImageUrl: 'local:///etc/passwd',
      backgroundOpacity: 0.5
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Local background URL is not authorized');
  });
});
