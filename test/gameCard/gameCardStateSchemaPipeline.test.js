const {
  prepareAfterResponseMessages,
  prepareInitMessages,
  preparePreSendMessages
} = require('../../src/gameCard/sendPipeline');

function schemaCard(schemaFile = 'state/schema.json') {
  return {
    version: '1',
    id: 'state-card',
    name: 'State Card',
    stateSchema: schemaFile,
    rules: [{
      when: { phase: 'pre_send' },
      then: [{
        type: 'insert',
        predicate: { index: 0 },
        anchor: 'before',
        role: 'system',
        content: 'rules'
      }]
    }]
  };
}

function stateExecCard(phase) {
  return {
    version: '1',
    id: 'state-card',
    name: 'State Card',
    stateSchema: 'state/schema.json',
    rules: [{
      when: { phase },
      then: [{
        type: 'exec',
        source: 'state.seenHp = state.player.hp; return { state };'
      }]
    }]
  };
}

describe('game card state schema pipeline', () => {
  beforeEach(() => {
    window.electronAPI.readGameCardFile.mockReset();
    window.electronAPI.readGameCardFile.mockResolvedValue({
      success: true,
      content: '{"schema":{"player.hp":{"type":"number","default":100}}}'
    });
  });

  test('loads an external schema file before applying pre_send rules', async () => {
    const result = await preparePreSendMessages({
      card: schemaCard(),
      messages: [{ role: 'user', content: 'start' }]
    });

    expect(window.electronAPI.readGameCardFile)
      .toHaveBeenCalledWith('state-card', 'state/schema.json');
    expect(result.applied).toBe(true);
    expect(result.card.state.schema).toEqual({
      schema: { 'player.hp': { type: 'number', default: 100 } }
    });
    expect(result.messages[0]).toEqual({ role: 'system', content: 'rules' });
  });

  test('reports missing schema files without applying rules', async () => {
    window.electronAPI.readGameCardFile.mockResolvedValue({
      success: false,
      error: 'file_content file not found'
    });

    const result = await preparePreSendMessages({
      card: schemaCard(),
      messages: [{ role: 'user', content: 'start' }]
    });

    expect(result.applied).toBe(false);
    expect(result.error).toContain('file_content file not found');
    expect(result.messages).toEqual([{ role: 'user', content: 'start' }]);
  });

  test('surfaces safe path rejections for schema files', async () => {
    window.electronAPI.readGameCardFile.mockResolvedValue({
      success: false,
      error: 'file_content path must stay inside game card directory'
    });

    const result = await preparePreSendMessages({
      card: schemaCard('../schema.json'),
      messages: [{ role: 'user', content: 'start' }]
    });

    expect(window.electronAPI.readGameCardFile)
      .toHaveBeenCalledWith('state-card', '../schema.json');
    expect(result.applied).toBe(false);
    expect(result.error).toContain('file_content path must stay inside game card directory');
  });

  test('surfaces absolute path rejections for schema files', async () => {
    window.electronAPI.readGameCardFile.mockResolvedValue({
      success: false,
      error: 'file_content path must be relative'
    });

    const result = await prepareAfterResponseMessages({
      card: schemaCard('/tmp/schema.json'),
      messages: [{ role: 'assistant', content: 'done' }]
    });

    expect(result.applied).toBe(false);
    expect(result.error).toContain('file_content path must be relative');
  });

  test('allows cards without state to run unchanged', async () => {
    const card = schemaCard();
    delete card.stateSchema;
    const result = await prepareInitMessages({ card, messages: [] });

    expect(result.applied).toBe(true);
    expect(result.card).toBe(card);
    expect(window.electronAPI.readGameCardFile).not.toHaveBeenCalled();
  });

  test('passes through the original state value when no schema exists', async () => {
    const card = schemaCard();
    delete card.stateSchema;
    const state = { route: 'alice' };
    const result = await preparePreSendMessages({
      card,
      messages: [{ role: 'user', content: 'start' }],
      state
    });

    expect(result.state).toEqual(state);
    expect(result.stateTrace).toEqual({ changed: false, changedKeys: [], errors: [] });
  });

  test('pre_send rules receive state after schema defaults are applied', async () => {
    const result = await preparePreSendMessages({
      card: stateExecCard('pre_send'),
      messages: [{ role: 'user', content: 'start' }],
      state: {}
    });

    expect(result.state).toEqual({ player: { hp: 100 }, seenHp: 100 });
    expect(result.stateTrace).toEqual({
      changed: true,
      changedKeys: ['player.hp'],
      errors: []
    });
    expect(result.trace.rules[0].summary.state.changedKeys).toContain('seenHp');
  });

  test('after_response rules receive clamped existing state', async () => {
    window.electronAPI.readGameCardFile.mockResolvedValue({
      success: true,
      content: '{"schema":{"player.hp":{"type":"number","min":0,"max":100,"onInvalid":"clamp"}}}'
    });

    const result = await prepareAfterResponseMessages({
      card: stateExecCard('after_response'),
      messages: [{ role: 'assistant', content: 'done' }],
      state: { player: { hp: 150 } }
    });

    expect(result.state).toEqual({ player: { hp: 100 }, seenHp: 100 });
    expect(result.stateTrace.changedKeys).toEqual(['player.hp']);
  });

  test('init with existing messages only applies schema defaults', async () => {
    const result = await prepareInitMessages({
      card: stateExecCard('init'),
      messages: [{ role: 'user', content: 'loaded' }],
      state: {}
    });

    expect(result.applied).toBe(false);
    expect(result.changed).toBe(true);
    expect(result.messages).toEqual([{ role: 'user', content: 'loaded' }]);
    expect(result.state).toEqual({ player: { hp: 100 } });
    expect(result.trace).toBeNull();
  });

  test('init with existing messages does not preload rule files', async () => {
    const card = stateExecCard('init');
    card.rules[0].then = [{ type: 'insert', role: 'system', content: '{{file_content:worldbook/rules.md}}' }];

    await prepareInitMessages({
      card,
      messages: [{ role: 'user', content: 'loaded' }],
      state: {}
    });

    expect(window.electronAPI.readGameCardFile).toHaveBeenCalledTimes(1);
    expect(window.electronAPI.readGameCardFile)
      .toHaveBeenCalledWith('state-card', 'state/schema.json');
  });
});
