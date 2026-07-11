const fs = require('fs');
const os = require('os');
const path = require('path');
const { validateImportedGameCard } = require('../../ipc/gameCardImportValidation');
const { createJsonStore } = require('../../ipc/storage/jsonStore');
const { validateGameCard } = require('../../shared/game-card/schema/validateGameCard.js');

function card(overrides = {}) {
  return {
    version: '1.0',
    id: 'import-validation',
    name: 'Import Validation',
    rules: [{
      when: { phase: 'pre_send' },
      then: [{ type: 'state.set', path: 'started', value: true }]
    }],
    ...overrides
  };
}

describe('game card import validation', () => {
  let cardDir;
  let store;

  beforeEach(() => {
    cardDir = fs.mkdtempSync(path.join(os.tmpdir(), 'chatapp-card-validation-'));
    store = createJsonStore(fs);
  });

  afterEach(() => {
    fs.rmSync(cardDir, { recursive: true, force: true });
  });

  test('uses the same schema result as runtime validation', async () => {
    const invalidCard = card({ rules: [{ when: { phase: 'unknown' }, then: [] }] });

    await expect(validateImportedGameCard(store, invalidCard, cardDir)).rejects.toMatchObject({
      stage: 'validate_card',
      details: validateGameCard(invalidCard).errors.map(message => ({ file: 'card.json', message }))
    });
  });

  test('rejects schema-declared resource files that do not exist', async () => {
    const missingResource = card({
      visual: { background: { school: 'images/school.jpg' } }
    });

    await expect(validateImportedGameCard(store, missingResource, cardDir)).rejects.toMatchObject({
      stage: 'validate_files',
      details: [{
        file: 'images/school.jpg',
        message: 'visual.background.school: file not found'
      }]
    });
  });
});
