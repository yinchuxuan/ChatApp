const React = require('react');
const { fireEvent, render } = require('@testing-library/react');
const DOMPurify = require('dompurify')(window);
const { marked } = require('marked');
const { card } = require('./whiteAlbumTestCard');
const { applyAssistantDisplayRules, applyUserDisplayRules } = require('../../src/renderer/gameCard/displayRules');
const renderers = require('../../src/renderer/components/ChatPanelMessageRenderers').default;
const { subscribeChatInputCommands } = require('../../src/renderer/chat/chatInputCommands');
const { splitReadingSegments } = require('../../src/renderer/chat/useSegmentedReading');

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
    expect(output).toContain('class="wa2-choice-overlay"');
    expect(output).toContain('class="wa2-choice-prompt">请选择下一步行动</div>');
    expect(output).toContain('<button type="button"');
    expect(output).toContain('class="wa2-choice"');
    expect(output).toContain('data-gc-chat-input-label="A"');
    expect(output).toContain('data-gc-chat-input-text-selector=".wa2-choice-text"');
    expect(output).toContain('class="wa2-choice-label">A</span>');
    expect(output).toContain('去找冬马确认钢琴声。');
  });

  test('keeps option CSS as a game card resource', () => {
    expect(card.display.stylesheet).toBe('display.css');
    expect(card.display.segmentedReading).toBe(true);
  });

  test('keeps all choices together on one segmented reading page', () => {
    const output = applyAssistantDisplayRules(sample, card.display);
    const choicePages = splitReadingSegments(output)
      .filter(segment => segment.includes('class="wa2-choice"'));

    expect(choicePages).toHaveLength(1);
    expect(choicePages[0].match(/class="wa2-choice"/g)).toHaveLength(4);
    expect(choicePages[0]).toContain('class="wa2-choice-overlay"');
    expect(choicePages[0]).toContain('请选择下一步行动');
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
      marked,
      DOMPurify,
      value => value,
      card.display
    );
    const { container } = render(element);
    const content = container.querySelector('.chat-bubble-content');

    expect(content.textContent).not.toContain('隐藏总结');
    expect(content.textContent).not.toContain('touma.affection');
    expect(content.querySelector('.wa2-scene-meta')).not.toBeNull();
    expect(content.querySelector('.wa2-choice-overlay')).not.toBeNull();
    expect(content.querySelector('.wa2-choice-prompt').textContent).toBe('请选择下一步行动');
    expect(content.querySelectorAll('.wa2-choice')).toHaveLength(4);
    expect(content.querySelector('.wa2-choice').tagName).toBe('BUTTON');
  });

  test('clicking a rendered choice fills chat input through ui runtime event', () => {
    const events = [];
    const unsubscribe = subscribeChatInputCommands(event => events.push(event));
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
      marked,
      DOMPurify,
      value => value,
      card.display
    );
    const { container } = render(element);

    fireEvent.click(container.querySelector('.wa2-choice'));
    unsubscribe();

    expect(events).toEqual([{
      type: 'chat.input.set',
      value: 'A. 去找冬马确认钢琴声。',
      focus: true
    }]);
  });
});
