const displayStyles = require('../../src/gameCard/displayStyles');
const visualStyles = require('../../src/gameCard/visualStyles');
const uiStyles = require('../../src/gameCard/uiStyles');
const uiRuntime = require('../../src/gameCard/uiRuntime');

describe('browser game card style runtime', () => {
  test('exposes display visual and ui helpers as modules', () => {
    expect(displayStyles.loadGameCardDisplayStyle).toEqual(expect.any(Function));
    expect(visualStyles.loadGameCardVisualStyle).toEqual(expect.any(Function));
    expect(uiStyles.loadGameCardUiStyle).toEqual(expect.any(Function));
    expect(uiRuntime.loadGameCardUiRoot).toEqual(expect.any(Function));
  });
});
