const { card, stateSchema } = require('./whiteAlbumTestCard');
const { validateGameCard } = require('../../src/shared/game-card/schema/validateGameCard');
const { ensureStateDefaults } = require('../../src/shared/game-card/state/stateSchema');
const { applyStatePatch } = require('../../src/shared/game-card/state/statePatch');
const { validateResponse } = require(
  '../../src/shared/game-card/validation/responseValidation'
);

const PATCH_PATTERN = /<state_patch>([\s\S]*?)<\/state_patch>/g;
const VALID_LOCATION = '【时间地点】2007.10.20: 8:02 星期六｜峰城大附属第三音乐教室';
const VALID_SUMMARY = [
  '<summary>',
  '<item priority="current_event" known_by="北原春希">仍需寻找主唱和键盘手。</item>',
  '</summary>'
].join('\n');
const VALID_CHOICES = [
  '<choices>',
  'A. 继续练习吉他。',
  '',
  'B. 去寻找主唱。',
  '',
  'C. 整理招募启事。',
  '',
  'D. 和武也商量计划。',
  '</choices>'
].join('\n');
const VALID_FINAL_PATCH = [
  '<state_patch>',
  '{"performance.proficiency":1,"timeline.currentTime":"2007.10.20: 9:15 星期六"}',
  '</state_patch>'
].join('\n');

function initialState(plotKind = 'free') {
  return ensureStateDefaults(stateSchema, { temp: { plotKind } }).state;
}

function response({
  body = '春'.repeat(3200),
  location = VALID_LOCATION,
  summary = VALID_SUMMARY,
  choices = VALID_CHOICES,
  finalPatch = VALID_FINAL_PATCH,
  tail = [choices, summary, finalPatch]
} = {}) {
  return ['<state_patch>{}</state_patch>', location, body, ...tail].join('\n\n');
}

function validate(rawContent, plotKind = 'free') {
  const stateBefore = initialState(plotKind);
  const candidate = [...rawContent.matchAll(PATCH_PATTERN)].reduce((current, match) => {
    const applied = applyStatePatch(match[1], current.state, { schema: stateSchema });
    return {
      state: applied.state,
      updates: [...current.updates, ...(applied.trace.updates || [])]
    };
  }, { state: stateBefore, updates: [] });

  return validateResponse({
    config: card.responseValidation,
    rawContent,
    stateBefore,
    stateAfter: candidate.state,
    updates: candidate.updates
  });
}

function violationIds(result) {
  return result.violations.map(item => item.id);
}

describe('white album response validation', () => {
  test('loads a valid warn-only configuration with message-based severity', () => {
    expect(validateGameCard(card)).toEqual({ valid: true, errors: [] });
    expect(card.responseValidation.onFailure).toBe('warn');
    expect(card.responseValidation.rules).not.toHaveLength(0);

    card.responseValidation.rules.forEach(rule => {
      expect(rule.id).toMatch(/^(error|warning)-/);
      expect(rule).not.toHaveProperty('severity');
      expect(rule).not.toHaveProperty('onFailure');
      expect(rule.message).toMatch(
        rule.id.startsWith('error-') ? /^【建议重新生成】/ : /^【质量提醒】/
      );
    });
  });

  test('allows inherited presentation, proficiency decrease and flexible block order', () => {
    const rawContent = response();

    expect(rawContent.indexOf('<choices>')).toBeLessThan(rawContent.indexOf('<summary>'));
    expect(rawContent.trimStart()).toMatch(/^<state_patch>\{\}<\/state_patch>/);
    expect(validate(rawContent)).toEqual({ passed: true, action: null, violations: [] });
  });

  test('reports structural and state contract errors without automatic retry', () => {
    const finalPatch = [
      '<state_patch>',
      '{"touma.affection":28,"story.progress":"Broken"}',
      '</state_patch>'
    ].join('\n');
    const choices = '<choices>\nA. 只有一个选项。\n</choices>';
    const result = validate(response({ choices, finalPatch, tail: [choices, VALID_SUMMARY, finalPatch] }));

    expect(result.action).toBe('warn');
    expect(violationIds(result)).toEqual(expect.arrayContaining([
      'error-current-time-update',
      'error-touma-affection-update',
      'error-protected-story-progress',
      'error-choices-structure'
    ]));
    expect(result.violations.every(item => item.onFailure === 'warn')).toBe(true);
  });

  test('reports quality warnings while accepting an otherwise playable response', () => {
    const result = validate(response({
      body: `这一刻，${'春'.repeat(100)}`,
      location: '【时间地点】数日前｜第三音乐教室'
    }));

    expect(result.action).toBe('warn');
    expect(violationIds(result)).toEqual(expect.arrayContaining([
      'warning-time-location-required',
      'warning-time-location-format',
      'warning-content-length',
      'warning-writing-style'
    ]));
    expect(violationIds(result).some(id => id.startsWith('error-'))).toBe(false);
  });

  test('does not force an anchor solely because the plot is fixed', () => {
    const result = validate(response(), 'fixed');

    expect(result).toEqual({ passed: true, action: null, violations: [] });
    expect(card.responseValidation.rules.map(rule => rule.id))
      .not.toContain('error-fixed-plot-anchor');
  });
});
