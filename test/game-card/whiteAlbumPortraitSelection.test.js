const fs = require('node:fs');
const path = require('node:path');
const { card, stateSchema } = require('./whiteAlbumTestCard');
const { applyGameCard } = require('../../src/renderer/gameCard/engine');
const { ensureStateDefaults } = require('../../src/shared/game-card/state/stateSchema');
const { applyLatestAssistantStatePatch } = require('../../src/shared/game-card/state/statePatch');
const { mergeAudioStateSchema } = require('../../src/renderer/gameCard/stateSchemaLoader');

const cardDir = path.join(__dirname, '../../game-card-examples/white-album-2');
const loadedCard = mergeAudioStateSchema({ ...card, state: { ...card.state, schema: stateSchema } });
const portraitRule = loadedCard.rules.find((rule) => rule.id === 'wa2-resolve-portrait');
const portraitCard = { ...loadedCard, rules: [portraitRule] };
const fileContents = {
  'scripts/resolve-portrait.js': fs.readFileSync(
    path.join(cardDir, 'scripts/resolve-portrait.js'),
    'utf8'
  )
};
const portraitKeys = Object.keys(loadedCard.visual.portrait);

function patchMessage(value) {
  return {
    role: 'assistant',
    content: [
      '剧情正文',
      '<state_patch>',
      JSON.stringify([{ type: 'state.set', path: 'scene.portrait', value }]),
      '</state_patch>'
    ].join('\n')
  };
}

function applyPortraitMessage(message, overrides = {}) {
  const state = ensureStateDefaults(loadedCard.state.schema, {
    temp: { plotKind: 'free' },
    ...overrides
  }).state;
  const ruled = applyGameCard({
    card: portraitCard,
    phase: 'after_response',
    messages: [message],
    state,
    fileContents
  });
  const patched = applyLatestAssistantStatePatch(ruled.messages, ruled.state, {
    schema: loadedCard.state.schema
  });
  return { ruled, patched };
}

describe('white album portrait selection', () => {
  test('registers five expressions for all five supported characters', () => {
    expect(portraitKeys).toHaveLength(25);
    ['touma', 'setsuna', 'mizusawa', 'takeya', 'yanagihara'].forEach((character) => {
      ['normal', 'happy', 'sad', 'angry', 'surprise'].forEach((expression) => {
        const key = `${character}_${expression}`;
        expect(loadedCard.visual.portrait[key]).toBe(`images/${character}/${expression}.png`);
        expect(fs.existsSync(path.join(cardDir, loadedCard.visual.portrait[key]))).toBe(true);
      });
    });
  });

  test.each(portraitKeys)('projects the valid semantic portrait %s', (portrait) => {
    const { ruled, patched } = applyPortraitMessage(patchMessage(portrait));

    expect(ruled.trace.errors).toEqual([]);
    expect(ruled.state.scene.portrait).toBe(portrait);
    expect(ruled.state.visual.portrait).toBe(portrait);
    expect(patched.state.scene.portrait).toBe(portrait);
  });

  test('clears stale portraits when the response omits a valid selection', () => {
    const stale = {
      scene: { portrait: 'touma_happy' },
      visual: { portrait: 'touma_happy' }
    };
    const missing = applyPortraitMessage({ role: 'assistant', content: '没有状态补丁' }, stale);
    const invalid = applyPortraitMessage(patchMessage('haruki_normal'), stale);

    [missing, invalid].forEach(({ ruled, patched }) => {
      expect(ruled.state.scene.portrait).toBe('none');
      expect(ruled.state.visual.portrait).toBe('none');
      expect(patched.state.scene.portrait).toBe('none');
    });
  });
});
