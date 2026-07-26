const fs = require('node:fs');
const path = require('node:path');
const { card, stateSchema } = require('./whiteAlbumTestCard');
const { applyGameCard } = require('../../src/renderer/gameCard/engine');
const { ensureStateDefaults } = require('../../src/shared/game-card/state/stateSchema');
const { applyLatestAssistantStatePatch } = require('../../src/shared/game-card/state/statePatch');
const { mergeAudioStateSchema } = require('../../src/renderer/gameCard/stateSchemaLoader');

const cardDir = path.join(__dirname, '../../game-card-examples/white-album-2');
const loadedCard = mergeAudioStateSchema({ ...card, state: { ...card.state, schema: stateSchema } });
const portraitRule = loadedCard.rules.find((rule) => rule.id === 'wa2-response-visual');
const portraitCard = { ...loadedCard, rules: [portraitRule] };
const fileContents = {
  'scripts/stream-preview.js': fs.readFileSync(
    path.join(cardDir, 'scripts/stream-preview.js'),
    'utf8'
  )
};
const portraitKeys = Object.keys(loadedCard.visual.portrait);

function pngDimensions(filePath) {
  const image = fs.readFileSync(filePath);
  return {
    width: image.readUInt32BE(16),
    height: image.readUInt32BE(20),
    colorType: image[25]
  };
}

function patchMessage(value) {
  return {
    role: 'assistant',
    content: [
      '<state_patch>',
      JSON.stringify([{ type: 'state.set', path: 'scene.portrait', value }]),
      '</state_patch>',
      '剧情正文'
    ].join('\n')
  };
}

function applyPortraitMessage(message, overrides = {}) {
  const state = ensureStateDefaults(loadedCard.state.schema, {
    temp: { plotKind: 'free' },
    ...overrides
  }).state;
  const patched = applyLatestAssistantStatePatch([message], state, {
    schema: loadedCard.state.schema
  });
  const ruled = applyGameCard({
    card: portraitCard,
    phase: 'after_response',
    messages: [message],
    state: patched.state,
    fileContents
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
        const imagePath = path.join(cardDir, loadedCard.visual.portrait[key]);
        expect(fs.existsSync(imagePath)).toBe(true);
        expect(pngDimensions(imagePath)).toEqual({ width: 2560, height: 1920, colorType: 6 });
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

  test('keeps the current portrait when the response omits a valid selection', () => {
    const stale = {
      scene: { portrait: 'touma_happy' },
      visual: { portrait: 'touma_happy' }
    };
    const missing = applyPortraitMessage({ role: 'assistant', content: '没有状态补丁' }, stale);
    const invalid = applyPortraitMessage(patchMessage('haruki_normal'), stale);

    [missing, invalid].forEach(({ ruled, patched }) => {
      expect(ruled.state.scene.portrait).toBe('touma_happy');
      expect(ruled.state.visual.portrait).toBe('touma_happy');
      expect(patched.state.scene.portrait).toBe('touma_happy');
    });
  });
});
