const {
  applyLatestAssistantStatePatch,
  extractLatestAssistantStatePatches
} = require('../../src/gameCard/statePatch');

describe('LLM state patch runtime', () => {
  test('extracts patches only from the latest assistant message', () => {
    const messages = [
      { role: 'assistant', content: '<state_patch>{"type":"state.set","path":"score","value":1}</state_patch>' },
      { role: 'user', content: 'retry' },
      { role: 'assistant', content: 'ok <state_patch>{"type":"state.set","path":"score","value":2}</state_patch>' },
      { role: 'system', content: 'after marker' }
    ];

    expect(extractLatestAssistantStatePatches(messages)).toEqual([
      '{"type":"state.set","path":"score","value":2}'
    ]);
  });

  test('applies state actions from latest assistant patch without changing messages', () => {
    const messages = [{
      role: 'assistant',
      content: [
        'answer',
        '<state_patch>',
        '[',
        '{"type":"state.set","path":"score","value":2},',
        '{"type":"state.append","path":"events","value":"won"}',
        ']',
        '</state_patch>'
      ].join('\n')
    }];
    const result = applyLatestAssistantStatePatch(messages, { score: 1 });

    expect(result.state).toEqual({ score: 2, events: ['won'] });
    expect(messages[0].content).toContain('<state_patch>');
    expect(result.trace.applied).toBe(true);
    expect(result.trace.changedKeys).toEqual(['score', 'events']);
  });

  test('invalid patch JSON records a trace and keeps state unchanged', () => {
    const result = applyLatestAssistantStatePatch([
      { role: 'assistant', content: '<state_patch>{bad json}</state_patch>' }
    ], { score: 1 });

    expect(result.state).toEqual({ score: 1 });
    expect(result.trace).toMatchObject({
      applied: false,
      patches: [{ applied: false, reason: 'invalid_json' }],
      changedKeys: []
    });
  });
});
