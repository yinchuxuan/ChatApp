/**
 * Mock fs module for Jest testing
 */

const mockFs = {
  readdirSync: jest.fn().mockReturnValue([]),
  statSync: jest.fn().mockReturnValue({
    isDirectory: () => false,
    isFile: () => true,
    mtime: new Date()
  }),
  realpathSync: jest.fn(filePath => filePath),
  writeFileSync: jest.fn(),
  unlinkSync: jest.fn(),
  copyFileSync: jest.fn(),
  cpSync: jest.fn(),
  rmSync: jest.fn(),
  renameSync: jest.fn(),
  existsSync: jest.fn().mockReturnValue(true),
  readFileSync: jest.fn().mockReturnValue(''),
  mkdirSync: jest.fn()
};

module.exports = mockFs;
