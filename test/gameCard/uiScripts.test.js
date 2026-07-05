const { applyUiScriptRunEvent, normalizeUiScriptRunEvent } = require('../../src/gameCard/uiScripts');

describe('game card ui scripts', () => {
  test('normalizes sourceFile and named card scripts', () => {
    const card = { ui: { scripts: { pick: 'ui/pick.js' } } };

    expect(normalizeUiScriptRunEvent({ type: 'game.script.run', sourceFile: 'ui/direct.js' }))
      .toMatchObject({ ok: true, sourceFile: 'ui/direct.js' });
    expect(normalizeUiScriptRunEvent({ type: 'game.script.run', name: 'pick' }, card))
      .toMatchObject({ ok: true, sourceFile: 'ui/pick.js', name: 'pick' });
    expect(normalizeUiScriptRunEvent({ type: 'game.script.run', sourceFile: '../bad.js' }))
      .toMatchObject({ ok: false, reason: 'invalid_source_file' });
  });

  test('runs a card script with payload and script includes', async () => {
    const api = {
      readGameCardFile: jest.fn(async (_id, filePath) => ({
        success: true,
        content: filePath === 'ui/helper.js'
          ? 'function applyChoice(ctx) { ctx.state.score += ctx.utils.randomInt(2, 2) + ctx.event.payload.bonus; }'
          : 'include("./helper.js");\nfunction run(ctx) { applyChoice(ctx); ctx.state.events.queue.shift(); return { state: ctx.state }; }'
      }))
    };
    const result = await applyUiScriptRunEvent({
      event: { type: 'game.script.run', name: 'pick', payload: { bonus: 1 } },
      state: { score: 1, events: { queue: [{ id: 'a' }, { id: 'b' }] } },
      messages: [{ role: 'user', content: 'x' }],
      card: { id: 'card', ui: { scripts: { pick: 'ui/pick.js' } } },
      api
    });

    expect(api.readGameCardFile).toHaveBeenCalledWith('card', 'ui/helper.js');
    expect(result.applied).toBe(true);
    expect(result.state).toEqual({ score: 4, events: { queue: [{ id: 'b' }] } });
    expect(result.trace.changedKeys).toEqual(['score', 'events']);
  });

  test('rejects ui scripts that try to modify messages', async () => {
    const api = {
      readGameCardFile: jest.fn(async () => ({
        success: true,
        content: 'function run(ctx) { ctx.messages.push({ role: "system", content: "x" }); ctx.state.score = 2; return { messages: ctx.messages, state: ctx.state }; }'
      }))
    };
    const result = await applyUiScriptRunEvent({
      event: { type: 'game.script.run', sourceFile: 'ui/bad.js' },
      state: { score: 1 },
      messages: [],
      card: { id: 'card' },
      api
    });

    expect(result).toMatchObject({ applied: false, state: { score: 1 }, trace: { reason: 'messages_not_supported' } });
  });
});
