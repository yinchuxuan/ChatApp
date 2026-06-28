const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function loadScript(context, file) {
  const code = fs.readFileSync(path.join(__dirname, '../../dist/gameCard', file), 'utf8');
  vm.runInContext(code, context, { filename: file });
}

describe('browser game card style runtime', () => {
  test('loads display visual and ui style helpers in one browser context', () => {
    const context = { console };
    context.window = context;
    vm.createContext(context);

    loadScript(context, 'displayStyles.js');
    loadScript(context, 'visualStyles.js');
    loadScript(context, 'uiStyles.js');
    loadScript(context, 'uiRuntime.js');

    expect(context.GameCardDisplayStyles.loadGameCardDisplayStyle).toEqual(expect.any(Function));
    expect(context.GameCardVisualStyles.loadGameCardVisualStyle).toEqual(expect.any(Function));
    expect(context.GameCardUiStyles.loadGameCardUiStyle).toEqual(expect.any(Function));
    expect(context.GameCardUiRuntime.loadGameCardUiRoot).toEqual(expect.any(Function));
  });
});
