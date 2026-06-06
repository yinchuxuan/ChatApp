const { preparePreSendMessages } = require('../../src/gameCard/sendPipeline');

function visualCard() {
  return {
    version: '1',
    id: 'visual-state-card',
    name: 'Visual State Card',
    state: { schemaFile: 'state/schema.json' },
    visual: { background: { school: 'images/school.jpg', night: 'images/night.png' } },
    rules: [{
      when: { phase: 'pre_send' },
      then: [{ type: 'state.set', path: 'visual.background', value: 'night' }]
    }]
  };
}

describe('game card visual state schema', () => {
  beforeEach(() => {
    window.electronAPI.readGameCardFile.mockReset();
    window.electronAPI.readGameCardFile.mockResolvedValue({
      success: true,
      content: '{"schema":{"player.hp":{"type":"number","default":100}}}'
    });
  });

  test('derives and applies visual background state schema', async () => {
    const result = await preparePreSendMessages({
      card: visualCard(),
      messages: [{ role: 'user', content: 'start' }],
      state: {}
    });

    expect(result.card.state.schema.schema['visual.background']).toMatchObject({
      type: 'enum',
      values: ['school', 'night'],
      default: 'school',
      llmRead: false,
      llmWrite: false
    });
    expect(result.card.state.schema.schema['visual.textPanel']).toMatchObject({
      type: 'enum',
      values: ['center', 'left', 'right'],
      default: 'center',
      llmRead: false,
      llmWrite: false
    });
    expect(result.state.visual.background).toBe('night');
    expect(result.state.visual.textPanel).toBe('center');
    expect(result.stateTrace.changedKeys).toContain('visual.background');
    expect(result.stateTrace.changedKeys).toContain('visual.textPanel');
  });
});
