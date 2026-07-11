const fs = require('fs');
const os = require('os');
const path = require('path');
const { createJsonStore } = require('../../ipc/storage/jsonStore');

describe('Atomic JSON store', () => {
  let tempDir;
  let filePath;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'chatapp-json-store-'));
    filePath = path.join(tempDir, 'nested', 'state.json');
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  test('writes JSON through a same-directory temporary file', async () => {
    const store = createJsonStore(fs);

    await store.writeJson(filePath, { turn: 2 });

    expect(JSON.parse(fs.readFileSync(filePath, 'utf-8'))).toEqual({ turn: 2 });
    expect(fs.readdirSync(path.dirname(filePath))).toEqual(['state.json']);
  });

  test('keeps the previous JSON when atomic replacement fails', async () => {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify({ turn: 1 }), 'utf-8');
    const failingFs = {
      promises: {
        ...fs.promises,
        rename: jest.fn().mockRejectedValue(new Error('rename failed'))
      }
    };
    const store = createJsonStore(failingFs);

    await expect(store.writeJson(filePath, { turn: 2 })).rejects.toThrow('rename failed');

    expect(JSON.parse(fs.readFileSync(filePath, 'utf-8'))).toEqual({ turn: 1 });
    expect(fs.readdirSync(path.dirname(filePath))).toEqual(['state.json']);
  });
});
