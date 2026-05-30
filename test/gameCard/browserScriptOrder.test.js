const fs = require('node:fs');
const path = require('node:path');

function scriptIndex(html, scriptPath) {
  return html.indexOf(`src="${scriptPath}"`);
}

describe('browser game card script order', () => {
  test('loads content object helpers before browser modules that use them', () => {
    const html = fs.readFileSync(path.join(__dirname, '../../src/index.html'), 'utf8');
    const contentObjects = scriptIndex(html, '../dist/gameCard/contentObjects.js');
    const contentResolver = scriptIndex(html, '../dist/gameCard/contentResolver.js');
    const validateContent = scriptIndex(html, '../dist/gameCard/validateContent.js');
    const validatePredicates = scriptIndex(html, '../dist/gameCard/validatePredicates.js');

    expect(contentObjects).toBeGreaterThan(-1);
    expect(contentResolver).toBeGreaterThan(contentObjects);
    expect(validateContent).toBeGreaterThan(-1);
    expect(validatePredicates).toBeGreaterThan(validateContent);
  });
});
