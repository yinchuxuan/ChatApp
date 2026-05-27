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
    state: { schemaFile },
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
    const card = { ...schemaCard(), state: undefined };
    const result = await prepareInitMessages({ card, messages: [] });

    expect(result.applied).toBe(true);
    expect(result.card).toBe(card);
    expect(window.electronAPI.readGameCardFile).not.toHaveBeenCalled();
  });
});
