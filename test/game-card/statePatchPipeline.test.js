const {
  prepareStatePatchAtCursor
} = require('../../src/renderer/gameCard/statePatchPipeline');

const card = {
  version: '1',
  id: 'state-patch-card',
  name: 'State Patch Card',
  state: {
    schema: {
      'scene.location': {
        type: 'enum',
        values: ['school', 'classroom'],
        default: 'school',
        llmWrite: true
      },
      score: { type: 'number', default: 0, llmWrite: true }
    }
  }
};

describe('state patch cursor pipeline', () => {
  test('applies every valid action in a cursor-timed patch', async () => {
    const result = await prepareStatePatchAtCursor({
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
    expect(result.state.score).toBe(9);
  });

  test('ignores invalid enum values', async () => {
    const result = await prepareStatePatchAtCursor({
      patchText: '{"type":"state.set","path":"scene.location","value":"unknown"}',
      state: { scene: { location: 'school' } },
      card,
      platform: { resources: {} }
    });

    expect(result.applied).toBe(false);
    expect(result.state.scene.location).toBe('school');
  });

  test('applies a complete cursor-timed patch and reports presentation changes', async () => {
    const result = await prepareStatePatchAtCursor({
      patchText: JSON.stringify([
        { type: 'state.set', path: 'score', value: 9 },
        { type: 'state.set', path: 'visual.background', value: 'classroom' }
      ]),
      state: {
        scene: { location: 'school' },
        score: 0,
        visual: { background: 'school' }
      },
      messages: [{ role: 'user', content: '继续' }],
      card,
      platform: { resources: {} }
    });

    expect(result.state.score).toBe(9);
    expect(result.state.visual.background).toBe('classroom');
    expect(result.presentationChangedKeys).toEqual(['visual.background']);
  });
});
