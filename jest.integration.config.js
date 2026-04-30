module.exports = {
  testEnvironment: 'node',
  testMatch: ['<rootDir>/test/integration/**/*.test.js', '<rootDir>/test/ipc/*.integration.test.js'],
  // Do NOT mock fs for integration tests - use real file system
  moduleNameMapper: {
    '^electron$': '<rootDir>/test/__mocks__/electronMock.js'
  },
  collectCoverage: false,
  transform: {
    '^.+\\.js$': 'babel-jest'
  },
  modulePathIgnorePatterns: ['<rootDir>/test/__mocks__/']
};