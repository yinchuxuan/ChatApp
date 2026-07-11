const fs = require('fs');
const path = require('path');
const { readGameCardJsonAsync } = require('../../ipc/gameCardImportResolver');
const { validateImportedGameCard } = require('../../ipc/gameCardImportValidation');
const { createJsonStore } = require('../../ipc/storage/jsonStore');

const fixtureRoot = path.join(__dirname, '../fixtures/game-card-import');
const cases = JSON.parse(fs.readFileSync(path.join(fixtureRoot, 'manifest.json'), 'utf8'));
const store = createJsonStore(fs);

async function validateFixture(testCase) {
  const cardDir = path.join(fixtureRoot, testCase.name);
  const card = await readGameCardJsonAsync(store, path.join(cardDir, 'card.json'));
  await validateImportedGameCard(store, card, cardDir);
}

describe('shared game card import fixtures', () => {
  test.each(cases)('$name has the declared JS import result', async (testCase) => {
    if (testCase.valid) {
      await expect(validateFixture(testCase)).resolves.toBeUndefined();
      return;
    }
    try {
      await validateFixture(testCase);
      throw new Error('fixture unexpectedly passed');
    } catch (error) {
      if (testCase.stage) expect(error.stage).toBe(testCase.stage);
      if (testCase.errorIncludes) expect(error.message).toContain(testCase.errorIncludes);
    }
  });
});
