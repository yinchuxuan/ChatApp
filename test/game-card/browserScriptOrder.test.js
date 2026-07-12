const fs = require('node:fs');
const path = require('node:path');

describe('renderer module entry', () => {
  test('uses one Vite module entry instead of ordered global scripts', () => {
    const html = fs.readFileSync(path.join(__dirname, '../../src/renderer/index.html'), 'utf8');
    const scripts = [...html.matchAll(/<script\b[^>]*>/g)].map(match => match[0]);

    expect(scripts).toEqual(['<script type="module" src="/main.jsx">']);
    expect(html).not.toContain('../dist/gameCard/');
    expect(html).not.toContain('react.production.min.js');
  });
});
