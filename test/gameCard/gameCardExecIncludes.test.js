const { applyGameCard } = require('../../src/gameCard/engine');

function cardWithActions(then) {
  return {
    version: '1',
    id: 'exec-card',
    name: 'Exec Card',
    rules: [{ id: 'exec-rule', when: { phase: 'after_response' }, then }]
  };
}

describe('game card exec includes', () => {
  test('exec sourceFile can declare helper scripts with include', () => {
    const result = applyGameCard({
      card: cardWithActions([{
        type: 'exec',
        sourceFile: 'scripts/timeline.js'
      }]),
      phase: 'after_response',
      messages: [],
      state: {},
      fileContents: {
        'scripts/timelines/chapter-1.js': 'function resolvePlot() { return "FixedPlot1"; }',
        'scripts/timeline.js': 'include("./timelines/chapter-1.js");\nfunction run(ctx) { ctx.state.plot = resolvePlot(); return { state: ctx.state }; }'
      }
    });

    expect(result.state).toEqual({ plot: 'FixedPlot1' });
    expect(result.trace.errors).toEqual([]);
  });
});
