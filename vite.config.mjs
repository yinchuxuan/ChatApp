import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import modelProxy from './scripts/devModelProxy.js';

const host = process.env.TAURI_DEV_HOST;
const { createDevModelProxyPlugin } = modelProxy;

export default defineConfig(({ command, mode }) => {
  const desktopTarget = mode === 'tauri' ? 'tauri' : 'electron';
  return {
    root: 'src',
    base: './',
    cacheDir: '../node_modules/.vite',
    clearScreen: false,
    define: {
      __CHATAPP_DESKTOP_TARGET__: JSON.stringify(desktopTarget),
      'globalThis.__CHATAPP_DEV_MODEL_PROXY__': JSON.stringify(command === 'serve')
    },
    plugins: [react(), createDevModelProxyPlugin()],
    envPrefix: ['VITE_', 'TAURI_ENV_*'],
    server: {
      host: host || false,
      port: 1420,
      strictPort: true,
      hmr: host ? { protocol: 'ws', host, port: 1421 } : undefined,
      watch: {
        ignored: ['**/src-tauri/**']
      }
    },
    build: {
      target: process.env.TAURI_ENV_PLATFORM === 'windows' ? 'chrome105' : 'safari15',
      minify: process.env.TAURI_ENV_DEBUG ? false : 'esbuild',
      sourcemap: Boolean(process.env.TAURI_ENV_DEBUG),
      outDir: '../dist/renderer',
      emptyOutDir: true
    }
  };
});
