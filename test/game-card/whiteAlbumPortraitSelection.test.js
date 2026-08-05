const fs = require('node:fs');
const path = require('node:path');
const { card, llmStateContract, stateSchema } = require('./whiteAlbumTestCard');
const { ensureStateDefaults } = require('../../src/shared/game-card/state/stateSchema');
const { applyLatestAssistantStatePatch } = require('../../src/shared/game-card/state/statePatch');
const { mergeAudioStateSchema } = require('../../src/renderer/gameCard/stateSchemaLoader');

const cardDir = path.join(__dirname, '../../game-card-examples/white-album-2');
const loadedCard = mergeAudioStateSchema({ ...card, state: { ...card.state, schema: stateSchema } });
const portraitCharacters = Object.keys(loadedCard.visual.portrait);
const portraitExpressions = [
  'normal', 'happy', 'sad', 'cry', 'angry', 'surprise', 'joy', 'sweating_smile'
];
const portraitNames = {
  touma: '冬马和纱',
  setsuna: '小木曾雪菜',
  mizusawa: '水泽依绪',
  takeya: '饭冢武也',
  chikashi: '早坂亲志',
  yanagihara: '柳原朋'
};
const portraitExpressionMeanings = {
  normal: '平静自然',
  happy: '开心喜悦',
  sad: '悲伤失落',
  cry: '哭泣落泪',
  angry: '生气愤怒',
  surprise: '惊讶意外',
  joy: '兴奋欢笑',
  sweating_smile: '尴尬冒汗地笑'
};
const yanagiharaExpressionAliases = { cry: 'sad', joy: 'happy', sweating_smile: 'normal' };
const portraitProperties = stateSchema.schema['visual.portraits'].properties;
const portraitCases = portraitCharacters.flatMap(character => (
  portraitProperties[character].values.map(expression => [character, expression])
));

function pngDimensions(filePath) {
  const image = fs.readFileSync(filePath);
  return {
    width: image.readUInt32BE(16),
    height: image.readUInt32BE(20),
    colorType: image[25]
  };
}

function patchMessage(portraits) {
  return {
    role: 'assistant',
    content: [
      '<state_patch>',
      JSON.stringify([{ type: 'state.set', path: 'visual.portraits', value: portraits }]),
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
  return { patched };
}

describe('white album portrait selection', () => {
  test('documents portrait character and expression mappings in the LLM contract', () => {
    portraitCharacters.forEach((character) => {
      expect(llmStateContract).toContain(`\`${character}\`（${portraitNames[character]}）`);
    });
    portraitExpressions.forEach((expression) => {
      expect(llmStateContract).toContain(
        `\`${expression}\`（${portraitExpressionMeanings[expression]}）`
      );
    });
  });

  test('registers all eight expressions for all six supported characters', () => {
    expect(portraitCharacters).toHaveLength(6);
    ['touma', 'setsuna', 'mizusawa', 'takeya', 'chikashi', 'yanagihara'].forEach((character) => {
      portraitExpressions.forEach((expression) => {
        const resource = loadedCard.visual.portrait[character][expression];
        const fileExpression = character === 'yanagihara'
          ? yanagiharaExpressionAliases[expression] || expression
          : expression;
        expect(resource).toBe(`images/${character}/${fileExpression}.png`);
        const imagePath = path.join(cardDir, resource);
        expect(fs.existsSync(imagePath)).toBe(true);
        expect(pngDimensions(imagePath)).toEqual({ width: 1086, height: 1448, colorType: 6 });
      });
    });
  });

  test('keeps all character resource and state expression sets aligned', () => {
    portraitCharacters.forEach((character) => {
      expect(Object.keys(loadedCard.visual.portrait[character])).toEqual(portraitExpressions);
      expect(portraitProperties[character].values).toEqual(portraitExpressions);
    });
  });

  test.each(portraitCases)('projects the valid %s %s portrait', (character, expression) => {
    const portraits = { [character]: expression };
    const { patched } = applyPortraitMessage(patchMessage(portraits));

    expect(patched.state.visual.portraits).toEqual(portraits);
  });

  test('accepts four visible characters in one composition', () => {
    const portraits = {
      touma: 'sad',
      setsuna: 'normal',
      mizusawa: 'happy',
      takeya: 'surprise'
    };
    const { patched } = applyPortraitMessage(patchMessage(portraits));

    expect(patched.state.visual.portraits).toEqual(portraits);
  });

  test('keeps the current portraits when the response omits a valid selection', () => {
    const stale = {
      visual: { portraits: { touma: 'happy' } }
    };
    const missing = applyPortraitMessage({ role: 'assistant', content: '没有状态补丁' }, stale);
    const invalid = applyPortraitMessage(patchMessage({ haruki: 'normal' }), stale);
    const tooMany = applyPortraitMessage(patchMessage({
      touma: 'normal',
      setsuna: 'normal',
      mizusawa: 'normal',
      takeya: 'normal',
      yanagihara: 'normal'
    }), stale);

    [missing, invalid, tooMany].forEach(({ patched }) => {
      expect(patched.state.visual.portraits).toEqual({ touma: 'happy' });
    });
  });
});
