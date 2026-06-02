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

  test('action find writes local temp state for content rendering', () => {
    const card = {
      version: '1',
      id: 'find-temp-card',
      name: 'Find Temp Card',
      rules: [{
        when: { phase: 'pre_send' },
        then: [{
          type: 'replace',
          predicate: { role: 'system' },
          find: [{
            name: 'latestTime',
            from: { role: 'assistant', index: 'last' },
            match: { regex: '^time=(\\d{2}:\\d{2})', group: 1 }
          }],
          content: '{{raw_string:time: }} + {{state:temp.find.latestTime}}'
        }]
      }]
    };

    const result = applyGameCard({
      card,
      phase: 'pre_send',
      messages: [
        { role: 'system', content: 'seen' },
        { role: 'assistant', content: 'time=14:30' }
      ],
      state: { temp: { find: { previous: 'kept' } } }
    });

    expect(result.trace.errors).toEqual([]);
    expect(result.messages[0].content).toBe('time: 14:30');
    expect(result.state.temp.find).toEqual({ previous: 'kept' });
  });

  test('rule find is shared by child actions without persisting temp find', () => {
    const card = {
      version: '1',
      id: 'rule-find-card',
      name: 'Rule Find Card',
      rules: [{
        when: { phase: 'pre_send' },
        find: [{ name: 'users', from: { role: 'user' }, many: true }],
        then: [
          { type: 'insert', role: 'system', content: '{{state:temp.find.users}}.join{","}' },
          { type: 'replace', predicate: { role: 'system' }, content: '{{raw_string:again }} + {{state:temp.find.users}}.join{"/"}' }
        ]
      }]
    };

    const result = applyGameCard({
      card,
      phase: 'pre_send',
      messages: [{ role: 'user', content: 'a' }, { role: 'user', content: 'b' }]
    });

    expect(result.trace.errors).toEqual([]);
    expect(result.messages[2].content).toBe('again a/b');
    expect(result.state.temp?.find).toBeUndefined();
  });
});
