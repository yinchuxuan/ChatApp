const React = require('react');
const { render } = require('@testing-library/react');
const card = require('../../game-card-examples/white-album-2/card.json');
const { applyAssistantDisplayRules, applyUserDisplayRules } = require('../../src/gameCard/displayRules');
const renderers = require('../../src/components/ChatPanelMessageRenderers');

const sample = [
  '【时间地点】2007.10.20: 15:00 星期六｜峰城大附属第二音乐室',
  '',
  '春希把吉他放回原处。',
  '',
  '---',
  '',
  '<summary>这里是隐藏总结。</summary>',
  '',
  '---',
  '',
  '<state_patch>',
  '[{"type":"state.set","path":"touma.affection","value":1}]',
  '</state_patch>',
  '',
  '---',
  '',
  'A. 去找冬马确认钢琴声。',
  '',
  'B. 邀请雪菜来第二音乐室。',
  '',
  'C. 向老师请求延后名单。',
  '',
  'D. 独自继续练习。'
].join('\n');

describe('white album display rules', () => {
  test('hide summary and state patch while wrapping choices', () => {
    const output = applyAssistantDisplayRules(sample, card.display);

    expect(output).toContain('class="wa2-scene-meta"');
    expect(output).toContain('class="wa2-scene-time">2007.10.20: 15:00 星期六</span>');
    expect(output).toContain('class="wa2-scene-place">峰城大附属第二音乐室</span>');
    expect(output).toContain('春希把吉他放回原处。');
    expect(output).not.toContain('<summary>');
    expect(output).not.toContain('隐藏总结');
    expect(output).not.toContain('<state_patch>');
    expect(output).not.toContain('touma.affection');
    expect(output).toContain('class="wa2-choice"');
    expect(output).toContain('class="wa2-choice-label">A</span>');
    expect(output).toContain('去找冬马确认钢琴声。');
  });

  test('keeps option CSS as a game card resource', () => {
    expect(card.display.stylesheet).toBe('display.css');
  });

  test('hides appended user turn context while keeping player input', () => {
    const content = [
      '去第三音乐室继续练习。',
      '',
      '---',
      '',
      '<wa2_turn_context>',
      '### 本轮剧情引导',
      '隐藏的剧情提示',
      '</wa2_turn_context>'
    ].join('\n');

    const output = applyUserDisplayRules(content, card.display);
    expect(output.trim()).toBe('去第三音乐室继续练习。');
    expect(output).not.toContain('剧情提示');
  });

  test('assistant renderer applies white album display rules before markdown', () => {
    const element = renderers.renderAssistantMsg(
      React,
      { role: 'assistant', content: sample },
      0,
      false,
      null,
      '',
      false,
      jest.fn(),
      jest.fn(),
      window.marked,
      window.DOMPurify,
      value => value,
      card.display
    );
    const { container } = render(element);
    const content = container.querySelector('.chat-bubble-content');

    expect(content.textContent).not.toContain('隐藏总结');
    expect(content.textContent).not.toContain('touma.affection');
    expect(content.querySelector('.wa2-scene-meta')).not.toBeNull();
    expect(content.querySelectorAll('.wa2-choice')).toHaveLength(4);
  });
});
