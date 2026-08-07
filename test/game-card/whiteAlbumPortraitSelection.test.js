const fs = require('node:fs');
const path = require('node:path');
const { card, llmStateContract, stateSchema } = require('./whiteAlbumTestCard');
const { ensureStateDefaults } = require('../../src/shared/game-card/state/stateSchema');
const { applyLatestAssistantStatePatch } = require('../../src/shared/game-card/state/statePatch');
const { mergeAudioStateSchema } = require('../../src/renderer/gameCard/stateSchemaLoader');

const cardDir = path.join(__dirname, '../../game-card-examples/white-album-2');
const loadedCard = mergeAudioStateSchema({ ...card, state: { ...card.state, schema: stateSchema } });
const portraitCharacters = Object.keys(loadedCard.visual.portrait);
const commonPortraitExpressions = [
  'normal', 'happy', 'sad', 'cry', 'angry', 'surprise', 'joy', 'sweating_smile'
];
const portraitNames = {
  touma: '冬马和纱',
  setsuna: '小木曾雪菜',
  mizusawa: '水泽依绪',
  takeya: '饭冢武也',
  chikashi: '早坂亲志',
  yanagihara: '柳原朋',
  takahiro: '小木曾孝宏'
};
const portraitExpressionMeanings = {
  normal: '平静自然',
  happy: '开心大笑',
  sad: '情绪低落',
  cry: '哭泣落泪',
  angry: '生气愤怒',
  surprise: '惊讶意外',
  joy: '愉悦微笑',
  sweating_smile: '尴尬冒汗地笑',
  sleep: '趴桌睡觉'
};
const expressionAliases = {
  yanagihara: { cry: 'sad', joy: 'happy', sweating_smile: 'normal' },
  takahiro: { cry: 'sad', joy: 'happy', sweating_smile: 'normal' }
};
const portraitProperties = stateSchema.schema['visual.portraits'].properties;
const documentedExpressions = [...new Set(Object.values(portraitProperties)
  .flatMap(property => property.values))];
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
    documentedExpressions.forEach((expression) => {
      expect(llmStateContract).toContain(
        `\`${expression}\`（${portraitExpressionMeanings[expression]}）`
      );
    });
  });

  test('registers common expressions for all characters and sleep for Touma', () => {
    expect(portraitCharacters).toHaveLength(7);
    portraitCharacters.forEach((character) => {
      const expressions = character === 'touma'
        ? [...commonPortraitExpressions, 'sleep']
        : commonPortraitExpressions;
      expressions.forEach((expression) => {
        const resource = loadedCard.visual.portrait[character][expression];
        const fileExpression = expressionAliases[character]?.[expression] || expression;
        expect(resource).toBe(`images/${character}/${fileExpression}.png`);
        const imagePath = path.join(cardDir, resource);
        expect(fs.existsSync(imagePath)).toBe(true);
        expect(pngDimensions(imagePath)).toEqual({ width: 1086, height: 1448, colorType: 6 });
      });
    });
  });

  test('keeps all character resource and state expression sets aligned', () => {
    portraitCharacters.forEach((character) => {
      expect(Object.keys(loadedCard.visual.portrait[character]))
        .toEqual(portraitProperties[character].values);
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
