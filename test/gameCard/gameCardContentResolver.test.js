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

  test('resolves raw strings original content transforms and concatenation', () => {
    const content = [
      '{{raw_string:【回复】}}',
      '{{original_content}}.regex_replace{pattern:\'^```json\\\\n\',with:\'\'}',
      '{{raw_string:\\\\done}}'
    ].join(' + ');

    expect(resolveContent(content, { content: '```json\n{"hp":10}' })).toBe('【回复】{"hp":10}\\done');
  });

  test('extracts regex groups from original content', () => {
    const result = resolveContent(
      '{{original_content}}.regex_extract{pattern:\'hp=(\\\\d+)\',group:1}',
      { content: 'hp=42 mp=7' }
    );

    expect(result).toBe('42');
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
});
