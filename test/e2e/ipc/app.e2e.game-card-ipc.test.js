const { test, expect } = require('@playwright/test');
const { ElectronAppHelper } = require('../electronAppHelper');
const { revealChatHeader } = require('../chatHeaderActions');

let appHelper;

test.describe.configure({ mode: 'serial' });

test.beforeAll(async () => {
  appHelper = new ElectronAppHelper();
  await appHelper.launch();
}, { timeout: 30000 });

test.afterAll(async () => {
  await appHelper.close();
});

function card(id, name) {
  return {
    version: '1.0',
    id,
    name,
    rules: [{
      when: { phase: 'pre_send' },
      then: [{ type: 'replace', predicate: { index: 'last' }, content: '{{original_content}}' }]
    }]
  };
}

test.describe('Game Card IPC and title state', () => {
  test('saves, lists, reads, activates, and clears game cards through preload IPC', async () => {
    const firstCard = card('e2e_quest_card', 'E2E Quest');
    const secondCard = card('e2e_second_card', 'Second Quest');

    expect((await appHelper.saveGameCard(firstCard)).success).toBe(true);
    expect((await appHelper.saveGameCard(secondCard)).success).toBe(true);

    const list = await appHelper.getGameCards();
    expect(list.success).toBe(true);
    expect(list.cards.map(item => item.id)).toEqual(['e2e_quest_card', 'e2e_second_card']);

    const read = await appHelper.getGameCard('e2e_quest_card');
    expect(read).toEqual({ success: true, card: firstCard });

    expect((await appHelper.setActiveGameCard('e2e_quest_card')).success).toBe(true);
    expect((await appHelper.getActiveGameCard()).card.name).toBe('E2E Quest');

    expect((await appHelper.setActiveGameCard(null)).success).toBe(true);
    expect((await appHelper.getActiveGameCard()).card).toBeNull();
  });

  test('shows the active game card name in the chat title after restart', async () => {
    const activeCard = card('e2e_title_card', 'Title Quest');
    await appHelper.saveGameCard(activeCard);
    await appHelper.setActiveGameCard(activeCard.id);

    await appHelper.relaunch();
    await revealChatHeader(appHelper);

    await expect(appHelper.window.locator('.game-card-title-name')).toHaveText('Title Quest');
    await expect(appHelper.window.locator('.game-card-title-control.loaded')).toHaveCount(1);
  }, { timeout: 60000 });

  test('rejects unsafe game card ids through the real IPC boundary', async () => {
    const result = await appHelper.saveGameCard({ id: '../escape', name: 'bad', rules: [] });
    expect(result.success).toBe(false);
    expect(result.error).toContain('safe id');
  });
});
