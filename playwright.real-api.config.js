const base = require('./playwright.config');

module.exports = {
  ...base,
  testDir: './test/e2e-real-api',
  timeout: 300000,
  fullyParallel: false,
  retries: 1,
  workers: 1
};
