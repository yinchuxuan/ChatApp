/**
 * IPC Integration Tests - Config Operations
 */

const fs = require('fs');
const path = require('path');

process.env.INTEGRATION_TEST_DIR = path.join(require('os').tmpdir(), 'chatapp_ipc_config_' + Date.now());
jest.mock('electron', () => require('../__mocks__/electronMock.integration.js'));
require('../../main');

const electronMock = require('electron');
const handlers = electronMock._registeredHandlers;
const configPath = electronMock._configPath;
const backgroundConfigPath = electronMock._backgroundConfigPath;

describe('IPC Config Operations', () => {
  afterAll(() => { electronMock._cleanup(); });

  beforeEach(() => {
    electronMock.dialog.showOpenDialog.mockReset();
    electronMock.dialog.showOpenDialog.mockResolvedValue({ canceled: true, filePaths: [] });
    fs.mkdirSync(path.dirname(configPath), { recursive: true });
    if (fs.existsSync(configPath)) fs.unlinkSync(configPath);
    if (fs.existsSync(backgroundConfigPath)) fs.unlinkSync(backgroundConfigPath);
  });

  test('should return empty config when no file', async () => {
    const result = await handlers['get-model-config']();
    expect(result.success).toBe(true);
    expect(result.config).toEqual({ apiUrl: '', apiKey: '', modelName: '' });
  });

  test('should return saved config', async () => {
    const config = { apiUrl: 'https://api.test.com', apiKey: 'test-key', modelName: 'test-model' };
    fs.writeFileSync(configPath, JSON.stringify(config), 'utf-8');

    const result = await handlers['get-model-config']();
    expect(result.success).toBe(true);
    expect(result.config.apiUrl).toBe('https://api.test.com');
  });

  test('should handle invalid JSON', async () => {
    fs.writeFileSync(configPath, 'invalid json', 'utf-8');
    const result = await handlers['get-model-config']();
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  test('should save config to file', async () => {
    const config = { apiUrl: 'https://api.new.com', apiKey: 'new-key', modelName: 'new-model' };
    const result = await handlers['save-model-config']({}, config);
    expect(result.success).toBe(true);
    expect(fs.existsSync(configPath)).toBe(true);

    const saved = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    expect(saved.apiUrl).toBe('https://api.new.com');
  });

  test('should update existing config', async () => {
    fs.writeFileSync(configPath, JSON.stringify({ apiUrl: 'old-url', apiKey: 'old-key', modelName: 'old-model' }), 'utf-8');
    const newConfig = { apiUrl: 'updated-url', apiKey: 'updated-key', modelName: 'updated-model' };

    await handlers['save-model-config']({}, newConfig);
    const saved = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    expect(saved.apiUrl).toBe('updated-url');
  });
});

describe('IPC Background Config Operations', () => {
  afterAll(() => { electronMock._cleanup(); });

  beforeAll(() => {
    fs.mkdirSync(path.dirname(backgroundConfigPath), { recursive: true });
  });

  beforeEach(() => {
    fs.mkdirSync(path.dirname(backgroundConfigPath), { recursive: true });
    if (fs.existsSync(backgroundConfigPath)) fs.unlinkSync(backgroundConfigPath);
  });

  test('should return default background config when no file', async () => {
    const result = await handlers['get-background-config']();
    expect(result.success).toBe(true);
    expect(result.config).toEqual({ backgroundImageUrl: '', backgroundOpacity: 0.5 });
  });

  test('should return saved background config', async () => {
    const bgConfig = { backgroundImageUrl: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD', backgroundOpacity: 0.7 };
    fs.writeFileSync(backgroundConfigPath, JSON.stringify(bgConfig), 'utf-8');

    const result = await handlers['get-background-config']();
    expect(result.success).toBe(true);
    expect(result.config.backgroundOpacity).toBe(0.7);
  });

  test('should save background config', async () => {
    const bgConfig = { backgroundImageUrl: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABIAAD', backgroundOpacity: 0.3 };
    const result = await handlers['save-background-config']({}, bgConfig);
    expect(result.success).toBe(true);

    const saved = JSON.parse(fs.readFileSync(backgroundConfigPath, 'utf-8'));
    expect(saved.backgroundOpacity).toBe(0.3);
  });
});
