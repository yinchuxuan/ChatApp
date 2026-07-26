const {
  createLeadingStatePatchParser
} = require('../../src/renderer/chat/leadingStatePatch');

describe('leading state patch parser', () => {
  test('buffers a fragmented leading patch and releases the following body', () => {
    const parser = createLeadingStatePatchParser();

    expect(parser.push('\n<state_')).toEqual({});
    expect(parser.push('patch>{"type":"state.set",')).toEqual({});
    const result = parser.push('"path":"scene.location","value":"school"}</state_patch>\n正文');

    expect(result.patchText).toContain('"scene.location"');
    expect(result.patchBlock).toMatch(/^\n<state_patch>/);
    expect(result.body).toBe('\n正文');
    expect(parser.push('继续')).toEqual({ body: '继续' });
  });

  test('passes through ordinary body content without waiting for a patch', () => {
    const parser = createLeadingStatePatchParser();

    expect(parser.push('【时间地点】')).toEqual({ body: '【时间地点】' });
    expect(parser.push('正文')).toEqual({ body: '正文' });
  });

  test('releases an incomplete patch when the stream ends', () => {
    const parser = createLeadingStatePatchParser();

    expect(parser.push('<state_patch>{"type"')).toEqual({});
    expect(parser.finish()).toEqual({
      body: '<state_patch>{"type"'
    });
  });

  test('stops buffering an oversized incomplete patch', () => {
    const parser = createLeadingStatePatchParser({ maxPatchChars: 20 });
    const content = '<state_patch>unfinished';

    expect(parser.push(content)).toEqual({ body: content });
  });
});
