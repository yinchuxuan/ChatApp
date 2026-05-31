const React = require('react');
const { render } = require('@testing-library/react');
const displayRules = require('../../src/gameCard/displayRules');
const renderers = require('../../src/components/ChatPanelMessageRenderers');

describe('game card display rules', () => {
  test('hides assistant summary blocks without changing the source content', () => {
    const content = '「来了。」\n<summary>hidden state</summary>';
    const display = {
      assistant: [{
        id: 'hide-summary',
        stage: 'before_markdown',
        type: 'regex_replace',
        pattern: '<summary>[\\s\\S]*?<\\/summary>',
        flags: 'g',
        replace: ''
      }]
    };

    expect(displayRules.applyAssistantDisplayRules(content, display).trim()).toBe('「来了。」');
    expect(content).toContain('<summary>hidden state</summary>');
  });

  test('supports capture groups for display-only HTML enrichment', () => {
    const display = {
      assistant: [{
        stage: 'before_markdown',
        type: 'regex_replace',
        pattern: '^【(.+?)】$',
        flags: 'gm',
        replace: '<div class="rp-speaker">$1</div>'
      }]
    };

    expect(displayRules.applyAssistantDisplayRules('【雪菜】\n「你来了。」', display))
      .toContain('<div class="rp-speaker">雪菜</div>');
  });

  test('skips invalid flags and unsupported stages', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const display = {
      assistant: [
        { stage: 'before_markdown', type: 'regex_replace', pattern: 'x', flags: 'y', replace: 'bad' },
        { stage: 'after_markdown', type: 'regex_replace', pattern: 'x', flags: 'g', replace: 'bad' }
      ]
    };

    expect(displayRules.applyAssistantDisplayRules('x', display)).toBe('x');
    warn.mockRestore();
  });

  test('assistant renderer applies rules before markdown rendering', () => {
    const element = renderers.renderAssistantMsg(
      React,
      { role: 'assistant', content: 'Hello **there**\n<summary>hidden</summary>' },
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
      {
        assistant: [{
          stage: 'before_markdown',
          type: 'regex_replace',
          pattern: '<summary>[\\s\\S]*?<\\/summary>',
          flags: 'g',
          replace: ''
        }]
      }
    );

    const { container } = render(element);
    const html = container.querySelector('.chat-bubble-content').innerHTML;
    expect(html).toContain('<strong>there</strong>');
    expect(html).not.toContain('hidden');
  });
});
