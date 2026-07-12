const displayStyles = require('../../src/renderer/gameCard/displayStyles');
const visualStyles = require('../../src/renderer/gameCard/visualStyles');
const uiStyles = require('../../src/renderer/gameCard/uiStyles');
const uiRuntime = require('../../src/renderer/gameCard/uiRuntime');

describe('browser game card style runtime', () => {
  test('exposes display visual and ui helpers as modules', () => {
    expect(displayStyles.loadGameCardDisplayStyle).toEqual(expect.any(Function));
    expect(visualStyles.loadGameCardVisualStyle).toEqual(expect.any(Function));
    expect(uiStyles.loadGameCardUiStyle).toEqual(expect.any(Function));
    expect(uiRuntime.loadGameCardUiRoot).toEqual(expect.any(Function));
  });
});
