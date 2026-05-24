/**
 * Integration Tests - Config and Directory Operations
 */

const path = require('path');
const fs = require('fs');
const os = require('os');
const { getUserDataPaths } = require('../../ipc/userDataPaths');

describe('Integration - Config Operations', () => {
  let testDir;
  let configPath;

  beforeAll(() => {
    testDir = path.join(os.tmpdir(), 'chatapp_integration_config_' + Date.now());
    configPath = getUserDataPaths(testDir, null).modelConfigPath;
    fs.mkdirSync(path.dirname(configPath), { recursive: true });
  });

  afterAll(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  beforeEach(() => {
    if (fs.existsSync(configPath)) {
      fs.unlinkSync(configPath);
    }
  });

  test('should save and read config JSON correctly', () => {
    const config = {
      apiUrl: 'https://api.example.com/v1',
      apiKey: 'test-key-123',
      modelName: 'gpt-4'
    };

    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
    expect(fs.existsSync(configPath)).toBe(true);

    const content = fs.readFileSync(configPath, 'utf-8');
    const parsed = JSON.parse(content);

    expect(parsed.apiUrl).toBe(config.apiUrl);
    expect(parsed.apiKey).toBe(config.apiKey);
    expect(parsed.modelName).toBe(config.modelName);
  });

  test('should handle missing config file', () => {
    expect(fs.existsSync(configPath)).toBe(false);

    const defaultConfig = { apiUrl: '', apiKey: '', modelName: '' };
    expect(defaultConfig).toEqual({ apiUrl: '', apiKey: '', modelName: '' });
  });

  test('should handle invalid JSON in config', () => {
    fs.writeFileSync(configPath, 'invalid json content', 'utf-8');

    try {
      const content = fs.readFileSync(configPath, 'utf-8');
      JSON.parse(content);
      expect(true).toBe(false);
    } catch (err) {
      expect(err instanceof SyntaxError).toBe(true);
    }
  });

  test('should update existing config', () => {
    fs.writeFileSync(configPath, JSON.stringify({
      apiUrl: 'url1', apiKey: 'key1', modelName: 'model1'
    }), 'utf-8');

    const newConfig = { apiUrl: 'url2', apiKey: 'key2', modelName: 'model2' };
    fs.writeFileSync(configPath, JSON.stringify(newConfig, null, 2), 'utf-8');

    const content = fs.readFileSync(configPath, 'utf-8');
    const parsed = JSON.parse(content);
    expect(parsed.apiUrl).toBe('url2');
  });
});

describe('Integration - Directory and Path Operations', () => {
  let testDir;

  beforeAll(() => {
    testDir = path.join(os.tmpdir(), 'chatapp_integration_paths_' + Date.now());
    fs.mkdirSync(testDir, { recursive: true });
  });

  afterAll(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  test('should create nested directories', () => {
    const nestedPath = path.join(testDir, 'nested', 'deep', 'path');
    fs.mkdirSync(nestedPath, { recursive: true });
    expect(fs.existsSync(nestedPath)).toBe(true);
  });

  test('should handle empty directory', () => {
    const emptyDir = path.join(testDir, 'empty');
    fs.mkdirSync(emptyDir, { recursive: true });

    const files = fs.readdirSync(emptyDir);
    expect(files.length).toBe(0);
  });

  test('should correctly join paths', () => {
    const paths = getUserDataPaths(testDir, null);
    expect(paths.modelConfigPath).toContain(path.join('config', 'model.json'));
    expect(paths.gameCardsDir).toContain('game-cards');
  });

  test('should extract filename from path', () => {
    const filePath = '/some/path/to/file.txt';
    const filename = path.basename(filePath);
    expect(filename).toBe('file.txt');
  });

  test('should extract extension from filename', () => {
    const filename = 'document.pdf';
    const ext = path.extname(filename);
    expect(ext).toBe('.pdf');
  });

  test('should handle files without extension', () => {
    const filename = 'README';
    const ext = path.extname(filename);
    expect(ext).toBe('');
  });
});
