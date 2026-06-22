const fs = require('node:fs');
const path = require('node:path');
const { card, stateSchema, llmStateSchema } = require('./whiteAlbumTestCard');
const { applyGameCard } = require('../../src/gameCard/engine');
const { ensureStateDefaults } = require('../../src/gameCard/stateSchema');
const { mergeAudioStateSchema } = require('../../src/gameCard/stateSchemaLoader');

const loadedCard = mergeAudioStateSchema({ ...card, state: { ...card.state, schema: stateSchema } });
const cardDir = path.join(__dirname, '../../game-card-examples/white-album-2');
function readCardFile(relativePath) { return fs.readFileSync(path.join(cardDir, relativePath), 'utf-8'); }

const fileContents = {
  'first_msg.md': '开场',
  'system_prompt.md': readCardFile('system_prompt.md'),
  'roleplay_rules.md': '规则',
  'plot/chapter-1.md': readCardFile('plot/chapter-1.md'),
  'plot/chapter-2.md': readCardFile('plot/chapter-2.md'),
  'state/schema.json': JSON.stringify(stateSchema),
  'state/llm_schema.json': JSON.stringify(llmStateSchema),
  'state/state_update_rules.md': readCardFile('state/state_update_rules.md'),
  'scripts/timeline.js': readCardFile('scripts/timeline.js'),
  'scripts/timelines/chapter-1.js': readCardFile('scripts/timelines/chapter-1.js'),
  'scripts/timelines/chapter-2.js': readCardFile('scripts/timelines/chapter-2.js'),
  'worldbook/characters.md': [
    '# 角色世界书',
    '## 北原春希', '角色：北原春希',
    '## 冬马和纱', '角色：冬马和纱',
    '## 小木曾雪菜', '角色：小木曾雪菜'
  ].join('\n'),
  'worldbook/index.md': readCardFile('worldbook/index.md'),
  'worldbook/location.md': [
    '# 地点世界书',
    '## 第二音乐教室', '地点：第二音乐教室',
    '## 第三音乐教室', '地点：第三音乐教室',
    '## 峰城大附属中学', '地点：峰城大附属中学',
    '## 冬马家', '地点：冬马家'
  ].join('\n')
};

function applyWithUser(content) {
  const state = ensureStateDefaults(loadedCard.state.schema, {}).state;
  const init = applyGameCard({ card: loadedCard, phase: 'init', messages: [], state, fileContents });
  return applyGameCard({
    card: loadedCard,
    phase: 'pre_send',
    messages: [...init.messages, { role: 'user', content }],
    state: init.state,
    fileContents
  });
}

describe('white album location worldbook', () => {
  test('loads location entries from location.md when places are mentioned', () => {
    const result = applyWithUser('从峰城大附属中学的第二音乐教室去第三音乐室，之后再去冬马家');
    const worldbook = result.messages.find((msg) => msg._meta?.source === 'wa2_worldbook');
    const cardText = JSON.stringify(card.rules);

    expect(result.trace.errors).toEqual([]);
    expect(cardText).toContain('{{file:worldbook.location#第二音乐教室}}');
    expect(worldbook.content).toContain('地点:');
    expect(worldbook.content).toContain('第二音乐教室: 传说中音乐科的优等生独占的音乐教室');
    expect(worldbook.content).toContain('地点：第二音乐教室');
    expect(worldbook.content).toContain('地点：第三音乐教室');
    expect(worldbook.content).toContain('地点：峰城大附属中学');
    expect(worldbook.content).toContain('地点：冬马家');
  });
});
