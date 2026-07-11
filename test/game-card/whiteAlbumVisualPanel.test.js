const stateSchema = require('../../game-card-examples/white-album-2/state/schema.json');

describe('white album visual panel', () => {
  test('defaults the reading panel to the right side', () => {
    expect(stateSchema.schema['visual.textPanel']).toMatchObject({
      type: 'enum',
      values: ['center', 'left', 'right'],
      default: 'right',
      llmRead: false,
      llmWrite: false
    });
  });
});
