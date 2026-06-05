const { card, stateSchema, llmStateSchema } = require('./whiteAlbumTestCard');
const { applyGameCard } = require('../../src/gameCard/engine');
const { ensureStateDefaults } = require('../../src/gameCard/stateSchema');
const { mergeAudioStateSchema } = require('../../src/gameCard/stateSchemaLoader');

const loadedCard = mergeAudioStateSchema({ ...card, state: { ...card.state, schema: stateSchema } });

function user(content) {
  return { role: 'user', content };
}

const fileContents = {
  'first_msg.md': [
    '开场剧情',
    '<summary>开场总结。</summary>',
    'A. 继续交谈',
    'B. 整理录音',
    'C. 暂时沉默',
    'D. 询问心情',
    '<state_patch>[{"type":"state.set","path":"touma.affection","value":0},{"type":"state.set","path":"setsuna.affection","value":0}]</state_patch>'
  ].join('\n'),
  'roleplay_rules.md': '回复时保持白色相簿2的氛围。追加 <state_patch> 并用 state.set 更新 touma.affection 和 setsuna.affection。',
  'plot_guides.md': '# 剧情引导\n## 自由剧情\n开头窗口\n## 后续剧情窗口\n后续窗口',
  'state/schema.json': JSON.stringify(stateSchema),
  'state/llm_schema.json': JSON.stringify(llmStateSchema),
  'worldbook/characters.md': [
    '# 角色世界书', '## 北原春希', '世界书：北原春希',
    '## 冬马和纱', '世界书：冬马和纱',
    '## 小木曾雪菜', '世界书：小木曾雪菜',
    '## 饭冢武也', '世界书：饭冢武也',
    '## 水泽依绪', '世界书：水泽依绪',
    '## 柳原朋', '世界书：柳原朋'
  ].join('\n')
};

function defaultState(overrides = {}) {
  const state = ensureStateDefaults(loadedCard.state.schema, overrides).state;
  return state;
}

function applyWhiteAlbumPhase(phase, messages, state = defaultState()) {
  return applyGameCard({
    card: loadedCard,
    phase,
    messages,
    state,
    fileContents
  });
}

function initWhiteAlbum() {
  return applyWhiteAlbumPhase('init', []);
}

function applyWhiteAlbum(messages) {
  const init = initWhiteAlbum();
  return applyWhiteAlbumPhase('pre_send', [...init.messages, ...messages]);
}

describe('white album 2 game card', () => {
  test('uses declarative rules for compression', () => {
    expect(JSON.stringify(card.rules)).not.toContain('"type":"exec"');
  });

  test('inserts fixed hidden summary message after the system prompt', () => {
    const result = initWhiteAlbum();

    expect(result.trace.errors).toEqual([]);
    expect(result.messages[0]._meta.source).toBe('wa2_system_prompt');
    expect(result.messages[1].role).toBe('system');
    expect(result.messages[1]._meta.source).toBe('wa2_summary');
    expect(result.messages[1]._meta.visibility).toBe('llm_only');
    expect(result.messages[1].content).toContain('历史对话总结');
    expect(result.messages[1].content).not.toContain('<summary>');
    expect(result.messages[2].role).toBe('assistant');
    expect(result.messages[2]._meta.source).toBe('wa2_first_msg');
    expect(result.messages[2]._meta.visibility).toBe('user_visible');
    expect(result.messages[2].content).toContain('<summary>开场总结。</summary>');
    expect(result.messages[2].content).toContain('<state_patch>');
    expect(result.messages[2].content).toContain('"touma.affection"');
    expect(result.messages[2].content).toContain('"setsuna.affection"');
  });

  test('declares Touma and Setsuna affection state and refreshes the status message', () => {
    const initial = initWhiteAlbum();
    const result = applyWhiteAlbumPhase(
      'pre_send',
      [...initial.messages, user('查看好感度')],
      defaultState({ touma: { affection: 12 }, setsuna: { affection: 8 } })
    );
    const status = result.messages.find((msg) => msg._meta?.source === 'wa2_state_context');

    expect(card.state.schemaFile).toBe('state/schema.json');
    expect(stateSchema.schema['touma.affection'].default).toBe(0);
    expect(stateSchema.schema['setsuna.affection'].default).toBe(0);
    expect(status.role).toBe('system');
    expect(status.ttl).toBe(1);
    expect(status._meta.visibility).toBe('llm_only');
    expect(status.content).toContain('"touma.affection"');
    expect(status.content).toContain('"setsuna.affection"');
    expect(status.content).toContain('"timeline.currentTime"');
    expect(status.content).not.toContain('"audio.bgm"');
    expect(status.content).toContain('timeline.currentTime: 2007.10.21: 08:00 星期日');
    expect(status.content).not.toContain('timeline.advanceIntent');
    expect(status.content).toContain('touma.affection: 12');
    expect(status.content).toContain('setsuna.affection: 8');
    expect(status.content).toContain('status.setsunaContestAccepted: false');
  });

  test('tail roleplay rules tell the llm how to update affection state', () => {
    const result = applyWhiteAlbum([user('继续')]);
    const hint = result.messages.find((msg) => msg.role === 'user');
    const stateContext = result.messages.find((msg) => msg._meta?.source === 'wa2_state_context');

    expect(hint.content).toContain('<wa2_turn_context>');
    expect(hint.content).toContain('<state_patch>');
    expect(stateContext.content).toContain('State更新规则');
    expect(stateContext.content).toContain('state.set');
    expect(stateContext.content).toContain('touma.affection');
    expect(stateContext.content).toContain('setsuna.affection');
  });

  test('compresses older assistant summaries and keeps latest user and assistant', () => {
    const first = initWhiteAlbum();
    const latestAssistant = {
      role: 'assistant',
      content: '没有总结标签的回复'
    };
    const messages = [
      ...first.messages,
      { role: 'assistant', content: '雪菜站在门口。<summary>雪菜邀请春希排练。</summary>' },
      user('旧选择'),
      latestAssistant,
      user('最新选择')
    ];

    const result = applyWhiteAlbum(messages);
    const summary = result.messages.find((msg) => msg._meta?.source === 'wa2_summary');
    const users = result.messages.filter((msg) => msg.role === 'user');

    expect(result.trace.errors).toEqual([]);
    expect(summary.content).toContain('- 雪菜邀请春希排练。');
    expect(summary.content).not.toContain('暂无\n-');
    expect(users).toHaveLength(1);
    expect(users[0].content).toContain('最新选择');
    expect(users[0].content).toContain('<wa2_turn_context>');
    expect(users[0].content).toContain(fileContents['roleplay_rules.md']);
    expect(result.messages.some((msg) => {
      return msg.role === 'assistant' && msg.content.includes('<summary>');
    })).toBe(false);
    expect(result.messages).toContainEqual(latestAssistant);
  });

  test('keeps latest assistant with summary uncompressed for next turn context', () => {
    const first = initWhiteAlbum();
    const latestAssistant = {
      role: 'assistant',
      content: '春希犹豫着回应。<summary>春希回应了雪菜。</summary>'
    };
    const messages = [
      ...first.messages,
      { role: 'assistant', content: '雪菜站在门口。<summary>雪菜邀请春希排练。</summary>' },
      user('旧选择'),
      latestAssistant,
      user('最新选择')
    ];

    const result = applyWhiteAlbum(messages);
    const summary = result.messages.find((msg) => msg._meta?.source === 'wa2_summary');

    expect(result.trace.errors).toEqual([]);
    expect(summary.content).toContain('- 雪菜邀请春希排练。');
    expect(summary.content).not.toContain('春希回应了雪菜');
    expect(result.messages).toContainEqual(latestAssistant);
  });

  test('appends character worldbook entries into the fixed worldbook message', () => {
    const result = applyWhiteAlbum([user('春希想约冬马、雪菜、武也、依绪和柳原朋一起排练')]);
    const worldbook = result.messages.filter((msg) => msg._meta?.source === 'wa2_worldbook');
    const cardText = JSON.stringify(card.rules);

    expect(result.trace.errors).toEqual([]);
    expect(cardText).toContain('{{file_section:worldbook/characters.md##北原春希}}');
    expect(cardText).not.toContain('worldbook/haruki.md');
    expect(worldbook).toHaveLength(1);
    expect(worldbook[0].role).toBe('system');
    expect(worldbook[0].ttl).toBe(1);
    expect(worldbook[0].content).toContain('世界书索引:');
    expect(worldbook[0].content).toContain('本轮命中的世界书条目:');
    expect(worldbook[0].content).toContain('北原春希');
    expect(worldbook[0].content).toContain('冬马和纱');
    expect(worldbook[0].content).toContain('小木曾雪菜');
    expect(worldbook[0].content).toContain('饭冢武也');
    expect(worldbook[0].content).toContain('水泽依绪');
    expect(worldbook[0].content).toContain('柳原朋');
  });
});
