const {
  responseValidationMaxRetries,
  validateResponse
} = require('../../src/shared/game-card/validation/responseValidation');
const { applyStatePatch } = require('../../src/shared/game-card/state/statePatch');

function regexRule(overrides = {}) {
  return {
    id: 'choices',
    type: 'content.regex',
    pattern: '<choices>[\\s\\S]*?<\\/choices>',
    matches: { eq: 1 },
    message: '必须输出一个选项块',
    ...overrides
  };
}

function run(config, overrides = {}) {
  return validateResponse({
    config,
    rawContent: '<choices>A</choices>',
    stateBefore: {},
    stateAfter: {},
    updates: [],
    ...overrides
  });
}

describe('response validation core', () => {
  test('validates complete content after removing state patches', () => {
    const rawContent = [
      '<state_patch>{"score":1}</state_patch>',
      '<choices>A</choices>'
    ].join('\n');
    const result = run({ rules: [
      regexRule(),
      regexRule({
        id: 'no-patch-in-content',
        pattern: '<state_patch>',
        matches: { eq: 0 },
        message: '正文不包含协议块'
      }),
      regexRule({
        id: 'patch-in-raw',
        source: 'raw',
        pattern: '<state_patch>',
        matches: { eq: 1 },
        message: '原文包含协议块'
      })
    ] }, { rawContent });

    expect(result).toEqual({ passed: true, action: null, violations: [] });
  });

  test('collects all violations and gives retry precedence over warn', () => {
    const result = run({ onFailure: 'warn', rules: [
      regexRule({ matches: { eq: 0 } }),
      regexRule({
        id: 'required-ending',
        pattern: 'END$',
        matches: { eq: 1 },
        onFailure: 'retry',
        message: '必须以 END 结尾'
      })
    ] });

    expect(result.passed).toBe(false);
    expect(result.action).toBe('retry');
    expect(result.violations.map(item => item.id)).toEqual(['choices', 'required-ending']);
    expect(result.violations[0]).toEqual(expect.objectContaining({
      onFailure: 'warn',
      actual: { source: 'content', matches: 1 }
    }));
  });

  test('uses the pre-response state for when predicates', () => {
    const result = run({ rules: [regexRule({
      when: { state: { route: 'touma' } },
      matches: { eq: 0 }
    })] }, {
      stateBefore: { route: 'setsuna' },
      stateAfter: { route: 'touma' }
    });

    expect(result.passed).toBe(true);
  });

  test('validates explicit normalized updates, final value and delta', () => {
    const first = applyStatePatch('{"score":2}', { score: 1 });
    const second = applyStatePatch(
      '{"type":"state.set","path":"score","value":2}', first.state
    );
    const result = run({ rules: [{
      id: 'score-update',
      type: 'state.update',
      path: 'score',
      updates: { eq: 2 },
      operations: ['state.set'],
      value: { eq: 2 },
      delta: { eq: 1 },
      message: 'score 更新不符合契约'
    }] }, {
      stateBefore: { score: 1 },
      stateAfter: second.state,
      updates: [...first.trace.updates, ...second.trace.updates]
    });

    expect(result.passed).toBe(true);
    expect(second.trace.updates[0]).toEqual({
      path: 'score', operation: 'state.set', before: 2, after: 2
    });
  });

  test('skips value and delta checks when the path was not updated', () => {
    const result = run({ rules: [{
      id: 'optional-score',
      type: 'state.update',
      path: 'score',
      value: { eq: 10 },
      delta: { eq: 5 },
      message: '若更新 score 则必须满足约束'
    }] }, {
      stateBefore: { score: 1 },
      stateAfter: { score: 1 }
    });

    expect(result.passed).toBe(true);
  });

  test('reports the failed parts of a state update rule', () => {
    const result = run({ rules: [{
      id: 'score-guard',
      type: 'state.update',
      path: 'score',
      updates: { eq: 1 },
      operations: ['state.append'],
      value: { lte: 2 },
      delta: { lte: 1 },
      message: 'score 变化过大'
    }] }, {
      stateBefore: { score: 1 },
      stateAfter: { score: 4 },
      updates: [{ path: 'score', operation: 'state.set', before: 1, after: 4 }]
    });

    expect(result.action).toBe('retry');
    expect(result.violations[0].actual).toEqual({
      updates: 1,
      operations: ['state.set'],
      valueExists: true,
      value: 4,
      delta: 3,
      failed: ['operations', 'value', 'delta']
    });
  });

  test('uses documented retry defaults', () => {
    expect(responseValidationMaxRetries()).toBe(2);
    expect(responseValidationMaxRetries({ maxRetries: 0 })).toBe(0);
  });
});
