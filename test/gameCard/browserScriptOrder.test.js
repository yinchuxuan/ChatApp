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
    const contentFiles = scriptIndex(html, '../dist/gameCard/contentFiles.js');
    const contentObjects = scriptIndex(html, '../dist/gameCard/contentObjects.js');
    const contentResolver = scriptIndex(html, '../dist/gameCard/contentResolver.js');
    const execSource = scriptIndex(html, '../dist/gameCard/execSource.js');
    const execRunner = scriptIndex(html, '../dist/gameCard/execRunner.js');
    const validateContent = scriptIndex(html, '../dist/gameCard/validateContent.js');
    const validateFind = scriptIndex(html, '../dist/gameCard/validateFind.js');
    const validatePredicates = scriptIndex(html, '../dist/gameCard/validatePredicates.js');
    const resourcePreload = scriptIndex(html, '../dist/gameCard/resourcePreload.js');
    const cardImportExpander = scriptIndex(html, '../dist/gameCard/cardImportExpander.js');
    const sendPipeline = scriptIndex(html, '../dist/gameCard/sendPipeline.js');

    expect(statePaths).toBeGreaterThan(-1);
    expect(findResolver).toBeGreaterThan(statePaths);
    expect(contentObjects).toBeGreaterThan(-1);
    expect(contentFiles).toBeGreaterThan(-1);
    expect(contentFiles).toBeGreaterThan(statePaths);
    expect(contentResolver).toBeGreaterThan(contentObjects);
    expect(contentResolver).toBeGreaterThan(contentFiles);
    expect(contentResolver).toBeGreaterThan(findResolver);
    expect(execSource).toBeGreaterThan(contentResolver);
    expect(execRunner).toBeGreaterThan(execSource);
    expect(validateContent).toBeGreaterThan(-1);
    expect(validateFind).toBeGreaterThan(validateContent);
    expect(validatePredicates).toBeGreaterThan(validateContent);
    expect(validatePredicates).toBeGreaterThan(validateFind);
    expect(resourcePreload).toBeGreaterThan(-1);
    expect(cardImportExpander).toBeGreaterThan(resourcePreload);
    expect(sendPipeline).toBeGreaterThan(cardImportExpander);
    expect(sendPipeline).toBeGreaterThan(resourcePreload);
  });
});
