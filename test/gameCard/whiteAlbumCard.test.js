const card = require('../../game-card-examples/white-album-2.json');
const { applyGameCard } = require('../../src/gameCard/engine');

function user(content) {
  return { role: 'user', content };
}

describe('white album 2 game card', () => {
  test('uses declarative rules for compression', () => {
    expect(JSON.stringify(card.rules)).not.toContain('"type":"exec"');
  });

  test('inserts fixed summary message after the system prompt', () => {
    const result = applyGameCard({ card, phase: 'pre_send', messages: [user('开始')] });

    expect(result.trace.errors).toEqual([]);
    expect(result.messages[0]._meta.source).toBe('wa2_system_prompt');
    expect(result.messages[1].role).toBe('assistant');
    expect(result.messages[1]._meta.source).toBe('wa2_summary');
    expect(result.messages[1]._meta.visibility).toBe('user_visible');
    expect(result.messages[1].content).toContain('历史对话总结');
    expect(result.messages[1].content).not.toContain('<summary>');
  });

  test('compresses assistant summaries and keeps only the latest user', () => {
    const first = applyGameCard({ card, phase: 'pre_send', messages: [user('开始')] });
    const messages = [
      ...first.messages,
      { role: 'assistant', content: '雪菜站在门口。<summary>雪菜邀请春希排练。</summary>' },
      user('旧选择'),
      { role: 'assistant', content: '没有总结标签的回复' },
      user('最新选择')
    ];

    const result = applyGameCard({ card, phase: 'pre_send', messages });
    const summary = result.messages.find((msg) => msg._meta?.source === 'wa2_summary');
    const users = result.messages.filter((msg) => msg.role === 'user');

    expect(result.trace.errors).toEqual([]);
    expect(summary.content).toContain('- 雪菜邀请春希排练。');
    expect(summary.content).not.toContain('暂无\n-');
    expect(users).toEqual([user('最新选择')]);
    expect(result.messages.some((msg) => {
      return msg.role === 'assistant' && msg.content.includes('<summary>');
    })).toBe(false);
    expect(result.messages.some((msg) => msg.content === '没有总结标签的回复')).toBe(true);
  });
});
