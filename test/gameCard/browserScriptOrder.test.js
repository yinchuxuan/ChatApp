const fs = require('node:fs');
const path = require('node:path');

function scriptIndex(html, scriptPath) {
  return html.indexOf(`src="${scriptPath}"`);
}

describe('browser game card script order', () => {
  test('loads content object helpers before browser modules that use them', () => {
    const html = fs.readFileSync(path.join(__dirname, '../../src/index.html'), 'utf8');
    const statePaths = scriptIndex(html, '../dist/gameCard/statePaths.js');
    const findResolver = scriptIndex(html, '../dist/gameCard/findResolver.js');
    const contentObjects = scriptIndex(html, '../dist/gameCard/contentObjects.js');
    const contentResolver = scriptIndex(html, '../dist/gameCard/contentResolver.js');
    const validateContent = scriptIndex(html, '../dist/gameCard/validateContent.js');
    const validateFind = scriptIndex(html, '../dist/gameCard/validateFind.js');
    const validatePredicates = scriptIndex(html, '../dist/gameCard/validatePredicates.js');

    expect(statePaths).toBeGreaterThan(-1);
    expect(findResolver).toBeGreaterThan(statePaths);
    expect(contentObjects).toBeGreaterThan(-1);
    expect(contentResolver).toBeGreaterThan(contentObjects);
    expect(contentResolver).toBeGreaterThan(findResolver);
    expect(validateContent).toBeGreaterThan(-1);
    expect(validateFind).toBeGreaterThan(validateContent);
    expect(validatePredicates).toBeGreaterThan(validateContent);
    expect(validatePredicates).toBeGreaterThan(validateFind);
  });
});
