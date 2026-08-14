const { validateGameCard } = require('../../src/shared/game-card/schema/validateGameCard');

function card(responseValidation) {
  return {
    version: '1',
    id: 'validation-card',
    name: 'Validation Card',
    rules: [],
    responseValidation
  };
}

function validConfig() {
  return {
    onFailure: 'retry',
    maxRetries: 2,
    rules: [
      {
        id: 'choices',
        type: 'content.regex',
        source: 'content',
        pattern: '<choices>[\\s\\S]*?<\\/choices>',
        flags: 'u',
        matches: { eq: 1 },
        message: '必须且只能输出一个 choices 块'
      },
      {
        id: 'time-update',
        type: 'state.update',
        when: { state: { chapter: { gte: 2 } } },
        path: 'timeline.currentTime',
        updates: { gte: 1, lte: 2 },
        operations: ['state.set'],
        value: { regex: '^2007\\.' },
        delta: { gte: -1, lte: 1 },
        onFailure: 'warn',
        message: '当前时间更新不合法'
      }
    ]
  };
}

describe('response validation schema', () => {
  test('accepts the documented response validation contract', () => {
    expect(validateGameCard(card(validConfig()))).toEqual({ valid: true, errors: [] });
  });

  test.each([
    ['unsupported strategy', { ...validConfig(), onFailure: 'reject' }],
    ['global regex flag', {
      ...validConfig(),
      rules: [{ ...validConfig().rules[0], flags: 'g' }]
    }],
    ['state rule without matcher', {
      ...validConfig(),
      rules: [{
        id: 'empty-state-rule',
        type: 'state.update',
        path: 'score',
        message: '缺少约束'
      }]
    }],
    ['wildcard state path', {
      ...validConfig(),
      rules: [{ ...validConfig().rules[1], path: 'characters.*.affection' }]
    }]
  ])('rejects %s', (_name, responseValidation) => {
    expect(validateGameCard(card(responseValidation)).valid).toBe(false);
  });

  test('rejects duplicate ids and invalid regular expressions', () => {
    const config = validConfig();
    config.rules = [
      config.rules[0],
      { ...config.rules[0], pattern: '(', flags: 'ii' }
    ];
    const errors = validateGameCard(card(config)).errors;

    expect(errors).toEqual(expect.arrayContaining([
      'responseValidation.rules[1].id: must be unique'
    ]));
    expect(errors.some(error => error.includes('responseValidation.rules[1].pattern:'))).toBe(true);
  });
});
