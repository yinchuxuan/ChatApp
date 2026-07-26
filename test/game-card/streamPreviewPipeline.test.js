const {
  prepareStreamPreviewState
} = require('../../src/renderer/gameCard/streamPreviewPipeline');

const card = {
  version: '1',
  id: 'stream-preview-card',
  name: 'Stream Preview Card',
  state: {
    schema: {
      'scene.location': {
        type: 'enum',
        values: ['school', 'classroom'],
        default: 'school',
        llmWrite: true,
        streamPreview: true
      },
      score: { type: 'number', default: 0, llmWrite: true }
    }
  },
  rules: [{
    when: { phase: 'stream_preview', state: { 'scene.location': 'classroom' } },
    then: [{ type: 'state.set', path: 'visual.background', value: 'classroom' }]
  }]
};

describe('stream preview pipeline', () => {
  test('applies preview fields and runs stream_preview card rules', async () => {
    const result = await prepareStreamPreviewState({
      patchText: JSON.stringify([
        { type: 'state.set', path: 'scene.location', value: 'classroom' },
        { type: 'state.set', path: 'score', value: 9 }
      ]),
      state: { scene: { location: 'school' }, score: 0 },
      messages: [{ role: 'user', content: '继续' }],
      card,
      platform: { resources: {} }
    });

    expect(result.applied).toBe(true);
    expect(result.state.scene.location).toBe('classroom');
    expect(result.state.visual.background).toBe('classroom');
    expect(result.state.score).toBe(0);
    expect(result.patchTrace.ignoredPaths).toEqual(['score']);
  });

  test('ignores invalid enum values without running preview rules', async () => {
    const result = await prepareStreamPreviewState({
      patchText: '{"type":"state.set","path":"scene.location","value":"unknown"}',
      state: { scene: { location: 'school' } },
      card,
      platform: { resources: {} }
    });

    expect(result.applied).toBe(false);
    expect(result.state.scene.location).toBe('school');
  });
});
