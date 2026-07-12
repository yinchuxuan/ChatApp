const styleHost = require('../../src/renderer/gameCard/gameCardStyleHost');
const uiRuntime = require('../../src/renderer/gameCard/uiRuntime');

describe('browser game card style runtime', () => {
  test('exposes the unified style host and ui root loader', () => {
    expect(styleHost.createGameCardStyleHost).toEqual(expect.any(Function));
    expect(uiRuntime.loadGameCardUiRoot).toEqual(expect.any(Function));
  });
});
