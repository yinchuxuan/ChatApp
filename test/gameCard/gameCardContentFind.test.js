const { applyGameCard } = require('../../src/gameCard/engine');

const messages = [
  { role: 'assistant', content: 'scene <summary>first event</summary>' },
  { role: 'user', content: 'next' },
  { role: 'assistant', content: 'scene <summary>second event</summary>' }
];

describe('game card content find descriptors', () => {
  test('insert and replace actions can use array find content from temp state', () => {
    const card = {
      version: '1',
      id: 'find-card',
      name: 'Find Card',
      rules: [{
        when: { phase: 'pre_send' },
        then: [{
          type: 'replace',
          predicate: { role: 'system' },
          find: [{ name: 'users', from: { role: 'user' }, many: true }],
          content: '{{original_content}} + {{raw_string:: }} + {{state:temp.find.users}}.join{" / "}'
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

  test('runtime rejects object find declarations', () => {
    const card = {
      version: '1',
      id: 'legacy-find-card',
      name: 'Legacy Find Card',
      rules: [{
        when: { phase: 'pre_send' },
        then: [{
          type: 'replace',
          predicate: { role: 'system' },
          find: { users: { predicate: { role: 'user' } } },
          content: '{{state:temp.find.users}}'
        }]
      }]
    };

    const result = applyGameCard({
      card,
      phase: 'pre_send',
      messages: [{ role: 'system', content: 'seen' }, { role: 'user', content: 'a' }]
    });

    expect(result.trace.errors[0]).toContain('must be a non-empty array');
  });

  test('list-aware transforms extract format and join find state values', () => {
    const card = {
      version: '1',
      id: 'find-list-card',
      name: 'Find List Card',
      rules: [{
        when: { phase: 'pre_send' },
        find: [{
          name: 'summaries',
          from: { role: 'assistant', content: { regex: '<summary>[\\s\\S]*?</summary>' } },
          many: true
        }],
        then: [{
          type: 'insert',
          role: 'system',
          content: [
            '{{state:temp.find.summaries}}',
            ".regex_extract{pattern:'<summary>([\\\\s\\\\S]*?)</summary>'}",
            ".format{'- {{value}}'}",
            ".join{' | '}"
          ].join('')
        }]
      }]
    };

    const result = applyGameCard({ card, phase: 'pre_send', messages });

    expect(result.trace.errors).toEqual([]);
    expect(result.messages[3].content).toBe('- first event | - second event');
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
