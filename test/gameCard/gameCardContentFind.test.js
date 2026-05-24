const { resolveContent } = require('../../src/gameCard/contentResolver');
const { applyGameCard } = require('../../src/gameCard/engine');

const messages = [
  { role: 'assistant', content: 'scene <summary>first event</summary>' },
  { role: 'user', content: 'next' },
  { role: 'assistant', content: 'scene <summary>second event</summary>' }
];

describe('game card content find descriptors', () => {
  test('find returns matching message content as a list with default join', () => {
    const content = '{{find:summaries}}';
    const result = resolveContent(content, {}, {
      messages,
      find: {
        summaries: {
          predicate: { role: 'assistant' }
        }
      }
    });

    expect(result).toBe([
      'scene <summary>first event</summary>',
      'scene <summary>second event</summary>'
    ].join('\n'));
  });

  test('list-aware transforms extract format and join each found message', () => {
    const content = [
      '{{find:summaries}}',
      ".regex_extract{pattern:'<summary>([\\\\s\\\\S]*?)</summary>'}",
      ".format{'- {{value}}'}",
      ".join{' | '}"
    ].join('');
    const result = resolveContent(content, {}, {
      messages,
      find: {
        summaries: {
          predicate: {
            role: 'assistant',
            content: { regex: '<summary>[\\s\\S]*?</summary>' }
          }
        }
      }
    });

    expect(result).toBe('- first event | - second event');
  });

  test('insert and replace actions can use find content', () => {
    const card = {
      version: '1',
      id: 'find-card',
      name: 'Find Card',
      rules: [{
        when: { phase: 'pre_send' },
        then: [{
          type: 'replace',
          predicate: { role: 'system' },
          find: { users: { predicate: { role: 'user' }, join: ' / ' } },
          content: '{{original_content}} + {{raw_string:: }} + {{find:users}}'
        }]
      }]
    };

    const result = applyGameCard({
      card,
      phase: 'pre_send',
      messages: [
        { role: 'system', content: 'seen' },
        { role: 'user', content: 'a' },
        { role: 'user', content: 'b' }
      ]
    });

    expect(result.trace.errors).toEqual([]);
    expect(result.messages[0].content).toBe('seen: a / b');
  });
});
