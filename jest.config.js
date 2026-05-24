module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/test/setup.js'],
  moduleNameMapper: {
    '\\.css$': 'identity-obj-proxy',
    '^electron$': '<rootDir>/test/__mocks__/electronMock.js',
    '^fs$': '<rootDir>/test/__mocks__/fsMock.js'
  },
  testMatch: ['<rootDir>/test/**/*.test.js'],
  testPathIgnorePatterns: [
    '<rootDir>/test/integration/',
    '<rootDir>/test/ipc/',
    '<rootDir>/test/e2e/',
    '<rootDir>/test/e2e-real-api/'
  ],
  collectCoverage: true,
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.jsx',
    'src/**/*.js',
    '!**/node_modules/**'
  ],
  coverageThreshold: {
    global: { branches: 15, functions: 20, lines: 20, statements: 20 }
  },
  transform: {
    '^.+\\.jsx?$': 'babel-jest'
  },
  moduleDirectories: ['node_modules', 'src'],
  modulePathIgnorePatterns: ['<rootDir>/test/__mocks__/']
};
