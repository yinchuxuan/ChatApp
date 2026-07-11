import { config as base } from './wdio.tauri.conf.mjs';

export const config = {
  ...base,
  specs: ['./test/tauri-e2e-real-api/**/*.e2e.js'],
  mochaOpts: { ui: 'bdd', timeout: 180000 }
};
