/**
 * Mock fs module for Jest testing
 */

const mockFs = {
  readdirSync: jest.fn().mockReturnValue([]),
  statSync: jest.fn().mockReturnValue({
    isDirectory: () => false,
    mtime: new Date()
  }),
  writeFileSync: jest.fn(),
  unlinkSync: jest.fn(),
  copyFileSync: jest.fn(),
  existsSync: jest.fn().mockReturnValue(true),
  readFileSync: jest.fn().mockReturnValue(''),
  mkdirSync: jest.fn()
};

module.exports = mockFs;