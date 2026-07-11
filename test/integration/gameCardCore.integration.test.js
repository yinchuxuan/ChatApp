const { applyGameCard } = require('../../shared/game-card/engine/engine.js');
const { adaptMessagesToProtocol } = require('../../shared/game-card/protocol/protocolAdapter.js');

describe('platform-independent game card core', () => {
  test('runs rules and content resolution without browser globals', () => {
    expect(typeof window).toBe('undefined');
    expect(typeof document).toBe('undefined');

    const card = {
      version: '1.0',
      id: 'shared-core-test',
      name: 'Shared Core Test',
      files: { intro: 'content/intro.md' },
      rules: [{
        when: { phase: 'pre_send' },
        then: [
          { type: 'state.set', path: 'route', value: 'shared' },
          { type: 'insert', role: 'system', content: '{{file:intro}} {{state:route}}' }
        ]
      }]
    };

    const result = applyGameCard({
      card,
      phase: 'pre_send',
      messages: [{ role: 'user', content: 'start' }],
      dependencies: { readFile: (filePath) => filePath === 'content/intro.md' ? 'intro' : '' }
    });

    expect(result.state.route).toBe('shared');
    expect(result.messages[1]).toMatchObject({ role: 'system', content: 'intro shared' });
    expect(adaptMessagesToProtocol(result.messages, 'anthropic')).toEqual({
      system: 'intro shared',
      messages: [{ role: 'user', content: 'start' }]
    });
  });

  test('exec is supplied as an explicit dependency', () => {
    const card = {
      version: '1.0',
      id: 'shared-core-exec-test',
      name: 'Shared Core Exec Test',
      rules: [{
        when: { phase: 'pre_send' },
        then: [{ type: 'exec', source: 'return { state };' }]
      }]
    };
    const runExecAction = jest.fn((messages, state) => ({
      messages,
      state: { ...state, executed: true },
      trace: { type: 'exec', applied: true, summary: { messages: {}, state: { changedKeys: ['executed'] } } }
    }));

    const result = applyGameCard({ card, phase: 'pre_send', dependencies: { runExecAction } });

    expect(runExecAction).toHaveBeenCalledTimes(1);
    expect(result.state.executed).toBe(true);
  });
});
