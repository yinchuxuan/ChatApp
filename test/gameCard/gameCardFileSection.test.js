const path = require('path');
const { applyGameCard } = require('../../src/gameCard/engine');

function createCard(content) {
  return {
    version: '1',
    id: 'section-card',
    name: 'Section Card',
    rules: [{
      when: { phase: 'pre_send' },
      then: [{ type: 'insert', predicate: { index: 0 }, role: 'system', content }]
    }]
  };
}

describe('game card file_section descriptors', () => {
  const baseDir = path.resolve('/game-card');
  const fakeFs = {
    readFileSync: jest.fn(() => [
      '# Routes',
      'intro',
      '## 雪菜线',
      '雪菜规则。',
      '### 临时状态',
      '同属雪菜线。',
      '## 和纱线',
      '和纱规则。'
    ].join('\n'))
  };

  test('reads a markdown section by matching heading level and title', () => {
    const result = applyGameCard({
      card: createCard('{{file_section:worldbook/routes.md##雪菜线}}'),
      phase: 'pre_send',
      messages: [{ role: 'user', content: 'start' }],
      contentBaseDir: baseDir,
      fs: fakeFs,
      path
    });

    expect(result.messages[0].content).toBe('雪菜规则。\n### 临时状态\n同属雪菜线。');
    expect(fakeFs.readFileSync).toHaveBeenCalledWith(path.join(baseDir, 'worldbook', 'routes.md'), 'utf-8');
  });

  test('rejects file sections with the wrong heading level', () => {
    const result = applyGameCard({
      card: createCard('{{file_section:worldbook/routes.md###雪菜线}}'),
      phase: 'pre_send',
      messages: [{ role: 'user', content: 'start' }],
      contentBaseDir: baseDir,
      fs: fakeFs,
      path
    });

    expect(result.messages).toEqual([{ role: 'user', content: 'start' }]);
    expect(result.trace.errors[0]).toContain('file_section heading not found: 雪菜线');
  });
});
