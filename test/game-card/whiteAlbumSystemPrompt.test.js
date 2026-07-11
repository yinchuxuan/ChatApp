const fs = require('node:fs');
const path = require('node:path');
const { card, stateSchema } = require('./whiteAlbumTestCard');
const { applyGameCard } = require('../../src/gameCard/engine');
const { mergeAudioStateSchema } = require('../../src/gameCard/stateSchemaLoader');

const loadedCard = mergeAudioStateSchema({ ...card, state: { ...card.state, schema: stateSchema } });
const cardDir = path.join(__dirname, '../../game-card-examples/white-album-2');

function readCardFile(relativePath) {
  return fs.readFileSync(path.join(cardDir, relativePath), 'utf-8');
}

describe('white album system prompt', () => {
  test('adds language limits, style limits, and anti-formula writing guidance', () => {
    const result = applyGameCard({
      card: loadedCard,
      phase: 'init',
      messages: [],
      state: {},
      fileContents: {
        'first_msg.md': readCardFile('first_msg.md'),
        'system_prompt.md': readCardFile('system_prompt.md')
      }
    });
    const prompt = result.messages.find((msg) => msg._meta?.source === 'wa2_system_prompt');

    expect(prompt.content).toBe(readCardFile('system_prompt.md'));
    expect(prompt.content).toContain('文风限制');
    expect(prompt.content).toContain('语言限制');
    expect(prompt.content).toContain('只能使用中文');
    expect(prompt.content).toContain('严禁使用日文、英文、罗马音或其他外语');
    expect(prompt.content).toContain('禁用典型AI八股句式');
    expect(prompt.content).toContain('不是……而是……');
  });

  test('refreshes existing system prompt before send', () => {
    const refreshOnlyCard = {
      ...loadedCard,
      rules: loadedCard.rules.filter((rule) => rule.id === 'wa2-refresh-system-prompt')
    };
    const result = applyGameCard({
      card: refreshOnlyCard,
      phase: 'pre_send',
      messages: [
        { role: 'system', content: '旧提示', _meta: { source: 'wa2_system_prompt', visibility: 'llm_only' } },
        { role: 'user', content: '继续' }
      ],
      state: {},
      fileContents: {
        'system_prompt.md': readCardFile('system_prompt.md')
      }
    });
    const prompt = result.messages.find((msg) => msg._meta?.source === 'wa2_system_prompt');

    expect(result.trace.errors).toEqual([]);
    expect(prompt.content).toBe(readCardFile('system_prompt.md'));
    expect(prompt._meta.visibility).toBe('llm_only');
  });
});
