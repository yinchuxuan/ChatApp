const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { mergeAudioStateSchema } = require('../../src/gameCard/stateSchemaLoader');

const scripts = [
  'predicate.js', 'statePaths.js', 'findResolver.js', 'contentTransforms.js',
  'fileSections.js', 'contentFiles.js', 'contentObjects.js', 'contentResolver.js', 'execSource.js', 'execRunner.js',
  'stateSchema.js', 'stateActions.js', 'statePatch.js', 'actions.js',
  'validateStateActions.js', 'validateContent.js', 'validateFind.js',
  'validatePredicates.js', 'audioConfig.js', 'visualConfig.js', 'validateGameCard.js', 'engine.js'
];

function loadBrowserRuntime() {
  const context = { console };
  context.window = context;
  vm.createContext(context);
  scripts.forEach((file) => {
    const code = fs.readFileSync(path.join(__dirname, '../../dist/gameCard', file), 'utf8');
    vm.runInContext(code, context, { filename: file });
  });
  return context;
}

describe('browser game card find runtime', () => {
  test('rule find still resolves after content resolver is loaded', () => {
    const runtime = loadBrowserRuntime();
    const card = {
      version: '1', id: 'find-browser', name: 'Find Browser',
      rules: [{
        when: { phase: 'pre_send' },
        find: [{
          name: 'assistantTime',
          from: { role: 'assistant', content: { regex: '^T:' } },
          match: { regex: '^T:(.+)$', group: 1 }
        }],
        then: [{
          type: 'replace',
          predicate: { role: 'user', index: 'last' },
          content: '{{original_content}} @ {{state:temp.find.assistantTime}}'
        }]
      }]
    };

    const result = runtime.applyGameCard({
      card,
      phase: 'pre_send',
      messages: [{ role: 'assistant', content: 'T:2007.10.21: 08:00' }, { role: 'user', content: 'go' }],
      state: {}
    });

    expect(result.trace.errors).toEqual([]);
    expect(result.messages[1].content).toBe('go @ 2007.10.21: 08:00');
  });

  test('rule find can drive action when state updates in browser runtime', () => {
    const runtime = loadBrowserRuntime();
    const card = {
      version: '1', id: 'advance-browser', name: 'Advance Browser',
      state: { schema: { slot: { type: 'enum', values: ['free', 'fixed'], default: 'free' } } },
      rules: [{
        when: { phase: 'pre_send' },
        find: [{
          name: 'assistantTime',
          from: { role: 'assistant', content: { regex: '^T:' } },
          match: { regex: '^T:(.+)$', group: 1 }
        }],
        then: [{
          type: 'state.advance',
          path: 'slot',
          when: { state: { 'temp.find.assistantTime': { gte: '2007.10.21: 14:00' } } }
        }]
      }]
    };

    const result = runtime.applyGameCard({
      card,
      phase: 'pre_send',
      messages: [{ role: 'assistant', content: 'T:2007.10.21: 14:00' }, { role: 'user', content: 'go' }],
      state: { slot: 'free' }
    });

    expect(result.trace.errors).toEqual([]);
    expect(result.state.slot).toBe('fixed');
  });

  test('white album browser runtime appends tail context to latest user message', () => {
    const runtime = loadBrowserRuntime();
    const { card, stateSchema: schema, llmStateSchema: llmSchema } = require('./whiteAlbumTestCard');
    const loadedCard = mergeAudioStateSchema({ ...card, state: { ...card.state, schema } });
    const fileContents = {
      'first_msg.md': '开场',
      'roleplay_rules.md': '规则',
      'plot/chapter-1.md': '# 剧情引导\n## 剧情大纲\n大纲\n## FreePlot1\n自由节点\n## 剧情限制\n限制',
      'state/schema.json': JSON.stringify(schema),
      'state/llm_schema.json': JSON.stringify(llmSchema),
      'state/state_update_rules.md': '规则',
      'scripts/timeline.js': 'function run(ctx) { ctx.state.temp = { plotFile: "plot.chapter.1", PlotType: "FreePlot1", plotDirectionRoll: 50, includeFreeGuide: true }; ctx.state.audio.bgm = "normal"; return { state: ctx.state }; }',
      'scripts/timelines/chapter-1.js': '',
      'worldbook/characters.md': '# 角色',
      'worldbook/index.md': '世界书索引',
      'worldbook/location.md': '# 地点'
    };
    const init = runtime.applyGameCard({
      card: loadedCard,
      phase: 'init',
      messages: [],
      state: runtime.ensureStateDefaults(loadedCard.state.schema, {}).state,
      fileContents
    });
    const result = runtime.applyGameCard({
      card: loadedCard,
      phase: 'pre_send',
      messages: [...init.messages, { role: 'user', content: '继续' }],
      state: init.state,
      fileContents
    });
    const user = result.messages.find((msg) => msg.role === 'user');

    expect(result.trace.errors).toEqual([]);
    expect(user.content).toContain('<wa2_turn_context>');
    expect(user.content).toContain('自由节点');
  });
});
