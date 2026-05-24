// Playwright configuration for Electron E2E testing
const { defineConfig } = require('@playwright/test');
const os = require('os');

module.exports = defineConfig({
  testDir: './test/e2e',
  timeout: 180000,
  maxFailures: 3,
  expect: {
    timeout: 30000
  },
  fullyParallel: true,
  retries: 0,
  workers: Math.min(4, os.cpus().length),
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