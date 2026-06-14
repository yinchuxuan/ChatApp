const { preparePreSendMessages } = require('../../src/gameCard/sendPipeline');

function cardWithExec(action) {
  return {
    version: '1',
    id: 'send-card',
    name: 'Send Card',
    rules: [{ id: 'exec-rule', when: { phase: 'pre_send' }, then: [action] }]
  };
}

describe('game card send pipeline exec include scripts', () => {
  beforeEach(() => {
    window.electronAPI.readGameCardFile.mockClear();
  });

  test('preloads script-level exec includes through electronAPI', async () => {
    window.electronAPI.readGameCardFile.mockImplementation(async (_cardId, filePath) => ({
      success: true,
      content: filePath === 'scripts/helper.js'
        ? 'function mark(ctx) { ctx.state.loadedHelper = true; }'
        : 'include("./helper.js");\nfunction run(ctx) { mark(ctx); return { state: ctx.state }; }'
    }));
    const card = cardWithExec({
      type: 'exec',
      sourceFile: 'scripts/timeline.js'
    });
    const result = await preparePreSendMessages({ messages: [], card });

    expect(window.electronAPI.readGameCardFile).toHaveBeenCalledWith('send-card', 'scripts/helper.js');
    expect(window.electronAPI.readGameCardFile).toHaveBeenCalledWith('send-card', 'scripts/timeline.js');
    expect(result.state.loadedHelper).toBe(true);
  });
});
