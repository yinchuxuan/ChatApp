const fs = require('node:fs');
const path = require('path');
const Ajv = require('ajv');

const schemaPath = path.join(__dirname, '../../src/gameCard/game-card.schema.json');
const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));

function compileAction() {
  const ajv = new Ajv({ allErrors: true, strict: false });
  ajv.addSchema(schema);
  return ajv.getSchema(`${schema.$id}#/definitions/action`);
}

describe('game card state action JSON schema', () => {
  test('accepts second-phase state actions', () => {
    const validate = compileAction();
    const actions = [
      { type: 'state.set', path: 'route', value: 'alice' },
      { type: 'state.delete', path: 'temp.lastRoll' },
      { type: 'state.append', path: 'inventory', value: { id: 'key' } },
      { type: 'state.remove', path: 'inventory', value: { id: 'key' } },
      { type: 'state.roll', path: 'temp.roll', dice: '1d6' },
      { type: 'state.randomInt', path: 'temp.pick', min: 1, max: 6 }
    ];

    actions.forEach((action) => expect(validate(action)).toBe(true));
  });

  test('rejects invalid state action fields', () => {
    const validate = compileAction();
    const actions = [
      { type: 'state.set', path: 'inventory[0]', value: { id: 'key' } },
      { type: 'state.append', path: 'inventory' },
      { type: 'state.delete', path: 'temp.lastRoll', value: true },
      { type: 'state.roll', path: 'temp.roll', dice: '0d6' },
      { type: 'state.randomInt', path: 'temp.pick', min: 1 },
      { type: 'state.merge', path: 'route', value: 'alice' }
    ];

    actions.forEach((action) => expect(validate(action)).toBe(false));
  });
});
