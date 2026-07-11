const { applyGameCard } = require('../../src/gameCard/engine');

function cardWithExec(source) {
  return {
    version: '1',
    id: 'exec-files-card',
    name: 'Exec Files Card',
    files: { eventText: 'events/sample.md' },
    rules: [{ when: { phase: 'pre_send' }, then: [{ type: 'exec', source }] }]
  };
}

describe('game card exec file helpers', () => {
  test('exec can read predeclared content files by id', () => {
    const result = applyGameCard({
      card: cardWithExec('state.body = files.read("eventText"); return { state };'),
      phase: 'pre_send',
      messages: [],
      state: {},
      fileContents: { 'events/sample.md': 'event body' }
    });

    expect(result.trace.errors).toEqual([]);
    expect(result.state.body).toBe('event body');
  });

  test('exec cannot read undeclared file paths through files.read', () => {
    const result = applyGameCard({
      card: cardWithExec('state.body = files.read("events/sample.md"); return { state };'),
      phase: 'pre_send',
      messages: [],
      state: {},
      fileContents: { 'events/sample.md': 'event body' }
    });

    expect(result.state).toEqual({});
    expect(result.trace.errors[0]).toContain('unknown content file id');
  });
});
