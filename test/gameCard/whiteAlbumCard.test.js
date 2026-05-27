const card = require('../../game-card-examples/white-album-2/card.json');
const { applyGameCard } = require('../../src/gameCard/engine');

function user(content) {
  return { role: 'user', content };
}

function applyWhiteAlbum(messages) {
  return applyGameCard({
    card,
    phase: 'pre_send',
    messages,
    fileContents: {
      'roleplay_rules.md': '回复时保持白色相簿2的氛围。',
      'worldbook/characters.md': [
        '# 角色世界书',
        '## 北原春希',
        '世界书：北原春希',
        '## 冬马和纱',
        '世界书：冬马和纱',
        '## 小木曾雪菜',
        '世界书：小木曾雪菜'
      ].join('\n')
    }
  });
}

describe('white album 2 game card', () => {
  test('uses declarative rules for compression', () => {
    expect(JSON.stringify(card.rules)).not.toContain('"type":"exec"');
  });

  test('inserts fixed hidden summary message after the system prompt', () => {
    const result = applyWhiteAlbum([user('开始')]);

    expect(result.trace.errors).toEqual([]);
    expect(result.messages[0]._meta.source).toBe('wa2_system_prompt');
    expect(result.messages[1].role).toBe('system');
    expect(result.messages[1]._meta.source).toBe('wa2_summary');
    expect(result.messages[1]._meta.visibility).toBe('llm_only');
    expect(result.messages[1].content).toContain('历史对话总结');
    expect(result.messages[1].content).not.toContain('<summary>');
    expect(result.messages[2].role).toBe('system');
    expect(result.messages[2]._meta.source).toBe('wa2_worldbook');
    expect(result.messages[2]._meta.visibility).toBe('llm_only');
  });

  test('compresses older assistant summaries and keeps latest user and assistant', () => {
    const first = applyWhiteAlbum([user('开始')]);
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
    expect(users).toEqual([
      user('最新选择'),
      {
        role: 'user',
        content: '回复时保持白色相簿2的氛围。',
        ttl: 1,
        _meta: { source: 'wa2_tail_hint', visibility: 'llm_only' }
      }
    ]);
    expect(result.messages.some((msg) => {
      return msg.role === 'assistant' && msg.content.includes('<summary>');
    })).toBe(false);
    expect(result.messages).toContainEqual(latestAssistant);
  });

  test('keeps latest assistant with summary uncompressed for next turn context', () => {
    const first = applyWhiteAlbum([user('开始')]);
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
    const result = applyWhiteAlbum([user('春希想约冬马和雪菜一起排练')]);
    const worldbook = result.messages.filter((msg) => msg._meta?.source === 'wa2_worldbook');
    const cardText = JSON.stringify(card.rules);

    expect(result.trace.errors).toEqual([]);
    expect(cardText).toContain('{{file_section:worldbook/characters.md##北原春希}}');
    expect(cardText).not.toContain('worldbook/haruki.md');
    expect(worldbook).toHaveLength(1);
    expect(worldbook[0].role).toBe('system');
    expect(worldbook[0].content).toContain('本轮世界书:');
    expect(worldbook[0].content).toContain('北原春希');
    expect(worldbook[0].content).toContain('冬马和纱');
    expect(worldbook[0].content).toContain('小木曾雪菜');
  });
});
