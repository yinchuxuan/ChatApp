const {
  buildStatePatchTimeline,
  resolveReadingSegments
} = require('../../src/renderer/chat/segmentedReadingModel');
const {
  createStatePatchStreamParser
} = require('../../src/renderer/chat/statePatchStream');

function patch(path, value) {
  return `<state_patch>{"type":"state.set","path":"${path}","value":"${value}"}</state_patch>`;
}

describe('state patch response timeline', () => {
  test('parses fragmented patches anywhere in the response stream', () => {
    const parser = createStatePatchStreamParser();

    expect(parser.push('第一段\n\n<state_')).toEqual([
      { type: 'body', text: '第一段\n\n' }
    ]);
    expect(parser.push('patch>{"type":"state.set"')).toEqual([]);
    expect(parser.push('}</state_patch>\n\n第二段')).toEqual([
      {
        type: 'patch',
        block: '<state_patch>{"type":"state.set"}</state_patch>',
        text: '{"type":"state.set"}'
      },
      { type: 'body', text: '\n\n第二段' }
    ]);
  });

  test('binds each patch to the following natural paragraph boundary', () => {
    const content = [
      patch('visual.background', 'school'),
      '',
      '第一段。',
      '',
      '第二段。',
      '',
      patch('visual.portrait', 'touma_sad'),
      '',
      '第三段。',
      '',
      patch('timeline.currentTime', 'end')
    ].join('\n');
    const timeline = buildStatePatchTimeline(content);

    expect(resolveReadingSegments(content)).toEqual(['第一段。', '第二段。', '第三段。']);
    expect(timeline.pageCount).toBe(3);
    expect(timeline.patches.map(item => item.boundary)).toEqual([0, 2, 3]);
  });
});
