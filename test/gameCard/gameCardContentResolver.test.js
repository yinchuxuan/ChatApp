const path = require('path');
const { resolveContent } = require('../../src/gameCard/contentResolver');
const { applyGameCard } = require('../../src/gameCard/engine');

function createCard(content) {
  return {
    version: '1',
    id: 'content-card',
    name: 'Content Card',
    rules: [{
      when: { phase: 'pre_send' },
      then: [{ type: 'insert', predicate: { index: 0 }, role: 'system', content }]
    }]
  };
}

describe('game card content descriptors', () => {
  const baseDir = path.resolve('/game-card');
  const fakeFs = {
    readFileSync: jest.fn((filePath) => {
      if (filePath === path.join(baseDir, 'worldbook', 'rules.md')) {
        return '# Rules\nStay in scene.';
      }
      throw new Error('missing fixture');
    })
  };

  beforeEach(() => {
    fakeFs.readFileSync.mockClear();
  });

  test('keeps plain content and legacy original_content replacement working', () => {
    expect(resolveContent('plain text')).toBe('plain text');
    expect(resolveContent('fixed {{original_content}}', { content: 'raw' })).toBe('fixed raw');
    expect(resolveContent(null, { content: 'raw' })).toBe('');
  });

  test('resolves raw strings original content transforms and concatenation', () => {
    const content = [
      '{{raw_string:【回复】}}',
      '{{original_content}}.regex_replace{pattern:\'^```json\\\\n\',with:\'\'}',
      '{{raw_string:\\\\done}}'
    ].join(' + ');

    expect(resolveContent(content, { content: '```json\n{"hp":10}' })).toBe('【回复】{"hp":10}\\done');
  });

  test('decodes escaped raw string delimiters', () => {
    expect(resolveContent('{{raw_string:a\\}}b}}')).toBe('a}}b');
  });

  test('applies chained regex transforms before concatenation', () => {
    const content = [
      '{{original_content}}',
      '.regex_replace{pattern:\'^```json\\\\n\',with:\'\'}',
      '.regex_replace{pattern:\'\\\\n```$\',with:\'\'}',
      ' + {{raw_string: done}}'
    ].join('');

    expect(resolveContent(content, { content: '```json\n{"hp":10}\n```' })).toBe('{"hp":10} done');
  });

  test('passes regex flags to replacements', () => {
    const result = resolveContent(
      '{{original_content}}.regex_replace{pattern:\'quest\',with:\'task\',flags:\'gi\'}',
      { content: 'Quest quest QUEST' }
    );

    expect(result).toBe('task task task');
  });

  test('extracts regex groups from original content', () => {
    const result = resolveContent(
      '{{original_content}}.regex_extract{pattern:\'hp=(\\\\d+)\',group:1}',
      { content: 'hp=42 mp=7' }
    );

    expect(result).toBe('42');
  });

  test('returns an empty string when regex extraction misses', () => {
    const result = resolveContent(
      '{{original_content}}.regex_extract{pattern:\'hp=(\\\\d+)\',group:1}',
      { content: 'mp=7' }
    );

    expect(result).toBe('');
  });

  test('uses an empty original content value for insert actions', () => {
    const result = applyGameCard({
      card: createCard('{{raw_string:prefix}} + {{original_content}}'),
      phase: 'pre_send',
      messages: [{ role: 'user', content: 'start' }]
    });

    expect(result.messages[0]).toEqual({ role: 'system', content: 'prefix' });
  });

  test('reads file content relative to the game card directory', () => {
    const result = applyGameCard({
      card: createCard('{{file_content:worldbook/rules.md}}'),
      phase: 'pre_send',
      messages: [{ role: 'user', content: 'start' }],
      contentBaseDir: baseDir,
      fs: fakeFs,
      path
    });

    expect(result.messages[0]).toEqual({ role: 'system', content: '# Rules\nStay in scene.' });
    expect(result.trace.errors).toEqual([]);
    expect(fakeFs.readFileSync).toHaveBeenCalledWith(path.join(baseDir, 'worldbook', 'rules.md'), 'utf-8');
  });

  test('transforms file content before concatenating it', () => {
    const result = applyGameCard({
      card: createCard('{{file_content:worldbook/rules.md}}.regex_replace{pattern:\'^#.*\\\\n\',with:\'\'}'),
      phase: 'pre_send',
      messages: [{ role: 'user', content: 'start' }],
      contentBaseDir: baseDir,
      fs: fakeFs,
      path
    });

    expect(result.messages[0]).toEqual({ role: 'system', content: 'Stay in scene.' });
  });

  test('rejects file content paths outside the game card directory', () => {
    const result = applyGameCard({
      card: createCard('{{file_content:../secret.md}}'),
      phase: 'pre_send',
      messages: [{ role: 'user', content: 'start' }],
      contentBaseDir: baseDir,
      fs: fakeFs,
      path
    });

    expect(result.messages).toEqual([{ role: 'user', content: 'start' }]);
    expect(result.trace.errors[0]).toContain('file_content path must stay inside game card directory');
  });

  test('rejects absolute file content paths', () => {
    expect(() => resolveContent(
      '{{file_content:/tmp/secret.md}}',
      {},
      { baseDir, fs: fakeFs, path }
    )).toThrow('file_content path must be relative');
  });

  test('requires a game card base directory for file content', () => {
    expect(() => resolveContent(
      '{{file_content:worldbook/rules.md}}',
      {},
      { fs: fakeFs, path }
    )).toThrow('file_content requires a baseDir');
  });

  test('reports malformed and unsupported descriptor expressions', () => {
    expect(() => resolveContent('{{raw_string:open')).toThrow('content source is not closed');
    expect(() => resolveContent('{{unknown:value}}')).toThrow('unsupported content source');
    expect(() => resolveContent('{{raw_string:a}} {{raw_string:b}}')).toThrow('content chains must be joined with +');
    expect(() => resolveContent('{{raw_string:a}}.unknown{}')).toThrow('unsupported content transform');
  });
});
