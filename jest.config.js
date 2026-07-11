module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/test/setup.js'],
  moduleNameMapper: {
    '\\.css$': 'identity-obj-proxy'
  },
  testMatch: ['<rootDir>/test/**/*.test.js'],
  testPathIgnorePatterns: [
    '<rootDir>/test/tauri-e2e/',
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
  moduleDirectories: ['node_modules', 'src']
};
