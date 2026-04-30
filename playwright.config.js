// Playwright configuration for Electron E2E testing
const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './test/e2e',
  timeout: 30000,
  maxFailures: 0,
  expect: {
    timeout: 10000
  },
  fullyParallel: true,
  retries: 0,
  workers: 1,
  reporter: 'list',
  use: {
    trace: 'on-first-retry',
    video: 'off',
    screenshot: 'off'
  },
  projects: [
    {
      name: 'electron',
      use: {
        // Electron-specific settings will be handled in test files
      }
    }
  ]
});