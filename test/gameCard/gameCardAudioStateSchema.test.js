const { preparePreSendMessages } = require('../../src/gameCard/sendPipeline');

function audioCard() {
  return {
    version: '1',
    id: 'audio-state-card',
    name: 'Audio State Card',
    state: { schemaFile: 'state/schema.json' },
    audio: { bgm: { daily: 'audio/daily.mp3', sad: 'audio/sad.mp3' } },
    rules: [{
      when: { phase: 'pre_send' },
      then: [{ type: 'insert', role: 'system', content: 'rules' }]
    }]
  };
}

describe('game card audio state schema', () => {
  beforeEach(() => {
    window.electronAPI.readGameCardFile.mockReset();
    window.electronAPI.readGameCardFile.mockResolvedValue({
      success: true,
      content: '{"schema":{"player.hp":{"type":"number","default":100}}}'
    });
  });

  test('derives audio bgm state schema from card audio resources', async () => {
    const result = await preparePreSendMessages({
      card: audioCard(),
      messages: [{ role: 'user', content: 'start' }],
      state: {}
    });

    expect(result.card.state.schema.schema['audio.bgm']).toMatchObject({
      type: 'enum',
      values: ['daily', 'sad'],
      default: 'daily',
      llmRead: false,
      llmWrite: false
    });
    expect(result.state.audio.bgm).toBe('daily');
    expect(result.stateTrace.changedKeys).toContain('audio.bgm');
  });
});
