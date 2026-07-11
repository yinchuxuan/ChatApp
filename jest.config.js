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
    // Removed document-reader IPC tests are retained as an explicit legacy specification.
    '<rootDir>/test/ipc/fileHandlers.test.js',
    '<rootDir>/test/e2e/',
    '<rootDir>/test/e2e-real-api/',
    '\\.integration\\.test\\.js$'
  ],
  collectCoverage: true,
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.jsx',
    'src/**/*.js',
    'shared/**/*.js',
    '!**/node_modules/**'
  ],
  coverageThreshold: {
    global: { branches: 70, functions: 80, lines: 85, statements: 82 }
  },
  transform: {
    '^.+\\.jsx?$': 'babel-jest'
  },
  transformIgnorePatterns: ['/node_modules/(?!marked/)'],
  moduleDirectories: ['node_modules', 'src'],
  modulePathIgnorePatterns: ['<rootDir>/test/__mocks__/']
};
