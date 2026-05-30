const fs = require('node:fs');
const path = require('path');
const Ajv = require('ajv');
const { applyGameCard } = require('../../src/gameCard/engine');
const { validateGameCard } = require('../../src/gameCard/validateGameCard');

const schemaPath = path.join(__dirname, '../../src/gameCard/game-card.schema.json');
const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));

function cardWithContent(content) {
  return {
    version: '1',
    id: 'content-object-card',
    name: 'Content Object Card',
    rules: [{
      when: { phase: 'pre_send' },
      then: [{
        type: 'replace',
        predicate: { '_meta.source': 'worldbook' },
        content
      }]
    }]
  };
}

function run(content, messages, state = {}) {
  return applyGameCard({
    card: cardWithContent(content),
    phase: 'pre_send',
    messages,
    state
  });
}

describe('game card content include/select objects', () => {
  test('include appends all matching branches with prefix and join', () => {
    const result = run({
      include: [
        {
          when: { last: { num: 2, role: 'user', content: { contains: '冬马' } } },
          content: '{{raw_string:冬马资料}}'
        },
        {
          when: { state: { 'setsuna.affection': { gte: 50 } } },
          content: '{{raw_string:雪菜高好感}}'
        },
        {
          when: { last: { role: 'assistant' } },
          content: '{{raw_string:不会命中}}'
        }
      ],
      prefix: '本轮世界书:',
      join: '\n\n'
    }, [
      { role: 'system', content: 'old', _meta: { source: 'worldbook' } },
      { role: 'user', content: '今天找冬马排练' }
    ], { setsuna: { affection: 65 } });

    expect(result.trace.errors).toEqual([]);
    expect(result.messages[0].content).toBe('本轮世界书:冬马资料\n\n雪菜高好感');
  });

  test('select renders the first matching branch and falls back to default', () => {
    const content = {
      select: [
        { when: { state: { route: 'kazusa' } }, content: '和纱线' },
        { when: { state: { route: 'setsuna' } }, content: '雪菜线' }
      ],
      default: '共通线'
    };

    expect(run(content, [{ role: 'system', content: 'old', _meta: { source: 'worldbook' } }], { route: 'setsuna' }).messages[0].content).toBe('雪菜线');
    expect(run(content, [{ role: 'system', content: 'old', _meta: { source: 'worldbook' } }], { route: 'none' }).messages[0].content).toBe('共通线');
  });

  test('validators accept content objects and reject malformed branches', () => {
    const validateAction = new Ajv({ allErrors: true, strict: false })
      .addSchema(schema)
      .getSchema(`${schema.$id}#/definitions/action`);
    const action = cardWithContent({ include: [{ when: { state: { route: 'kazusa' } }, content: 'x' }] }).rules[0].then[0];
    const bad = cardWithContent({ include: [{ when: { state: { route: 'kazusa' } } }] });

    expect(validateAction(action)).toBe(true);
    expect(validateGameCard(cardWithContent(action.content))).toEqual({ valid: true, errors: [] });
    expect(validateGameCard(bad).valid).toBe(false);
  });
});
