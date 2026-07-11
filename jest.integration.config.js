module.exports = {
  testEnvironment: 'node',
  testMatch: ['<rootDir>/test/**/*.integration.test.js'],
  collectCoverage: false,
  transform: {
    '^.+\\.jsx?$': 'babel-jest'
  }
};
