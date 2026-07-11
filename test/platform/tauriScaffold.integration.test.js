const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '../..');

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(rootDir, relativePath), 'utf8'));
}

describe('Tauri desktop scaffold', () => {
  test('uses the shared Vite renderer and existing window dimensions', () => {
    const config = readJson('src-tauri/tauri.conf.json');

    expect(config.build).toEqual({
      beforeDevCommand: 'npm run renderer:dev',
      devUrl: 'http://localhost:1420',
      beforeBuildCommand: 'npm run build',
      frontendDist: '../dist/renderer'
    });
    expect(config.app.windows).toEqual([
      expect.objectContaining({ label: 'main', width: 1200, height: 800 })
    ]);
  });

  test('grants only core permissions to the main window', () => {
    const capability = readJson('src-tauri/capabilities/default.json');

    expect(capability.windows).toEqual(['main']);
    expect(capability.permissions).toEqual(['core:default']);
  });

  test('declares scripts and desktop icons used by the bundle', () => {
    const packageJson = readJson('package.json');
    const config = readJson('src-tauri/tauri.conf.json');

    expect(packageJson.scripts).toEqual(expect.objectContaining({
      'renderer:dev': 'vite --config vite.config.mjs',
      'tauri:dev': 'tauri dev',
      'tauri:build': 'tauri build'
    }));
    config.bundle.icon.forEach(iconPath => {
      expect(fs.existsSync(path.join(rootDir, 'src-tauri', iconPath))).toBe(true);
    });
  });
});
