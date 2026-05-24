/**
 * E2E Tests: Visibility, multi-turn pipelines with real API keys
 */
const { test, expect } = require('@playwright/test');
const { OPENAI_CONFIG, ANTHROPIC_CONFIG, skipReason, setupHooks } = require('../e2e/realApiTestHelpers');

test.describe.configure({ mode: 'serial' });

const { configureAppRealAPI, sendThroughPipeline, getHistory } = setupHooks();

// ---------------------------------------------------------------------------
// 1. Multi-turn full pipeline with real LLM (OpenAI)
// ---------------------------------------------------------------------------

test.describe('Multi-turn full pipeline with real LLM', () => {

  test('TTL messages decay across turns via real multi-turn conversation', async () => {
    if (!OPENAI_CONFIG) { test.skip(true, skipReason('E2E_OPENAI')); return; }

    const card = {
      version: '1.0', id: 'real_ttl_decay', name: 'Real TTL Decay',
      rules: [
        { when: { phase: 'pre_send' }, then: [{ type: 'insert', predicate: { index: 0 }, role: 'system', content: 'SYS', _meta: { visibility: 'llm_only' } }] },
        { when: { phase: 'after_response', last: { role: 'assistant' } }, then: [{ type: 'insert', predicate: { index: 'last' }, anchor: 'after', role: 'system', content: 'temp hint', ttl: 2, _meta: { visibility: 'llm_only' } }] }
      ]
    };
    await configureAppRealAPI(card);

    const turn1 = await sendThroughPipeline(card, 'openai', [{ role: 'user', content: 't1' }]);
    expect(turn1.llmResponse.length).toBeGreaterThan(0);
    const saved1 = await getHistory();
    expect(saved1.find(m => m.content === 'temp hint').ttl).toBe(2);

    const history = await getHistory();
    const turn2 = await sendThroughPipeline(card, 'openai', [...history, { role: 'user', content: 't2' }]);
    expect(turn2.llmResponse.length).toBeGreaterThan(0);
    const saved2 = await getHistory();
    const hints = saved2.filter(m => m.content === 'temp hint');
    expect(hints).toHaveLength(2);
    expect(hints.map(m => m.ttl).sort()).toEqual([1, 2]);
    expect(turn2.afterResponseMessages).not.toBeNull();
  }, 180000);
});

// ---------------------------------------------------------------------------
// 2. Multi-turn full pipeline with real Anthropic LLM
// ---------------------------------------------------------------------------

test.describe('Multi-turn full pipeline with real Anthropic LLM', () => {

  test('Anthropic multi-turn with system extraction and history', async () => {
    if (!ANTHROPIC_CONFIG) { test.skip(true, skipReason('E2E_ANTHROPIC')); return; }

    const card = {
      version: '1.0', id: 'real_ant_multi_turn', name: 'Real Anthropic Multi',
      rules: [{ when: { phase: 'pre_send' }, then: [
        { type: 'insert', predicate: { index: 0 }, role: 'system', content: 'You are a storyteller in a fantasy world. Respond briefly.', _meta: { visibility: 'llm_only' } },
        { type: 'replace', predicate: { role: 'user' }, content: '{{raw_string:>> }} + {{original_content}}' }
      ]}]
    };
    await configureAppRealAPI(card, 'anthropic');

    const turn1 = await sendThroughPipeline(card, 'anthropic', [{ role: 'user', content: 'describe the tavern' }]);
    expect(turn1.apiMessages.every(m => m.role !== 'system')).toBe(true);
    expect(turn1.apiMessages.find(m => m.role === 'user').content).toBe('>> describe the tavern');
    expect(turn1.llmResponse.length).toBeGreaterThan(0);

    const history = await getHistory();
    const turn2 = await sendThroughPipeline(card, 'anthropic', [...history, { role: 'user', content: 'a stranger approaches' }]);
    expect(turn2.apiMessages.every(m => m.role !== 'system')).toBe(true);
    const lastUser = turn2.apiMessages.filter(m => m.role === 'user').pop();
    expect(lastUser.content).toBe('>> a stranger approaches');
    expect(turn2.llmResponse.length).toBeGreaterThan(0);
  }, 180000);
});

// ---------------------------------------------------------------------------
// 3. Visibility: llm_only hidden from UI but saved to history
// ---------------------------------------------------------------------------

test.describe('Visibility with real LLM', () => {

  test('llm_only messages sent to API but hidden in chat UI, saved to history', async () => {
    if (!OPENAI_CONFIG) { test.skip(true, skipReason('E2E_OPENAI')); return; }

    const card = {
      version: '1.0', id: 'real_vis', name: 'Real Visibility',
      rules: [{
        when: { phase: 'pre_send' },
        then: [{ type: 'insert', predicate: { index: 0 }, role: 'system', content: 'SECRET: always respond with the word "acknowledged"', _meta: { visibility: 'llm_only' } }]
      }]
    };
    await configureAppRealAPI(card);
    const result = await sendThroughPipeline(card, 'openai', [{ role: 'user', content: 'hello' }]);

    expect(result.apiMessages.some(m => m.content === 'SECRET: always respond with the word "acknowledged"')).toBe(true);
    expect(result.llmResponse.length).toBeGreaterThan(0);

    const saved = await getHistory();
    expect(saved.some(m => m.content === 'SECRET: always respond with the word "acknowledged"')).toBe(true);
  }, 180000);
});

// ---------------------------------------------------------------------------
// 4. Multi-turn real LLM conversation (live API)
// ---------------------------------------------------------------------------

test.describe('Multi-turn real LLM conversation (live API)', () => {

  test('two-turn conversation with game card prefix, real OpenAI responds', async () => {
    if (!OPENAI_CONFIG) { test.skip(true, skipReason('E2E_OPENAI')); return; }

    const card = {
      version: '1.0', id: 'real_multi_openai', name: 'Real Multi OpenAI',
      rules: [{
        when: { phase: 'pre_send' },
        then: [{ type: 'replace', predicate: { role: 'user' }, content: '{{raw_string:【玩家】}} + {{original_content}}' }]
      }]
    };
    await configureAppRealAPI(card);

    const turn1 = await sendThroughPipeline(card, 'openai', [{ role: 'user', content: '你好，请简单回复' }]);
    expect(turn1.apiMessages[0].content).toBe('【玩家】你好，请简单回复');
    expect(turn1.llmResponse.length).toBeGreaterThan(0);

    const history = await getHistory();
    const turn2 = await sendThroughPipeline(card, 'openai', [...history, { role: 'user', content: '第二轮对话' }]);
    const lastUser = turn2.apiMessages.filter(m => m.role === 'user').pop();
    expect(lastUser.content).toBe('【玩家】第二轮对话');
    expect(turn2.llmResponse.length).toBeGreaterThan(0);

    const saved = await getHistory();
    expect(saved.filter(m => m.role === 'assistant')).toHaveLength(2);
  }, 180000);

  test('two-turn conversation with game card, real Anthropic responds', async () => {
    if (!ANTHROPIC_CONFIG) { test.skip(true, skipReason('E2E_ANTHROPIC')); return; }

    const card = {
      version: '1.0', id: 'real_multi_anthropic', name: 'Real Multi Anthropic',
      rules: [{ when: { phase: 'pre_send' }, then: [
        { type: 'insert', predicate: { index: 0 }, role: 'system', content: 'You are a helpful assistant. Respond briefly in Chinese.', _meta: { visibility: 'llm_only' } },
        { type: 'replace', predicate: { role: 'user' }, content: '{{raw_string:>> }} + {{original_content}}' }
      ]}]
    };
    await configureAppRealAPI(card, 'anthropic');

    const turn1 = await sendThroughPipeline(card, 'anthropic', [{ role: 'user', content: '你好' }]);
    expect(turn1.apiMessages.every(m => m.role !== 'system')).toBe(true);
    expect(turn1.apiMessages.find(m => m.role === 'user').content).toBe('>> 你好');
    expect(turn1.llmResponse.length).toBeGreaterThan(0);

    const history = await getHistory();
    const turn2 = await sendThroughPipeline(card, 'anthropic', [...history, { role: 'user', content: '再见' }]);
    const lastUser = turn2.apiMessages.filter(m => m.role === 'user').pop();
    expect(lastUser.content).toBe('>> 再见');
    expect(turn2.llmResponse.length).toBeGreaterThan(0);

    const saved = await getHistory();
    expect(saved.filter(m => m.role === 'assistant').length).toBe(2);
  }, 180000);

  test('after_response regex_replace cleans real LLM response', async () => {
    if (!OPENAI_CONFIG) { test.skip(true, skipReason('E2E_OPENAI')); return; }

    const card = {
      version: '1.0', id: 'real_after_resp', name: 'Real After Response',
      rules: [{
        when: { phase: 'after_response', last: { role: 'assistant' } },
        then: [{
          type: 'replace', predicate: { index: 'last' },
          content: "{{original_content}}.regex_replace{pattern:'^```\\\\w*\\\\n',with:''}.regex_replace{pattern:'\\\\n```$',with:''}"
        }]
      }]
    };
    await configureAppRealAPI(card);
    const result = await sendThroughPipeline(card, 'openai', [{ role: 'user', content: '请只返回JSON格式：{"ok": true}，用代码块包裹' }]);
    expect(result.llmResponse.length).toBeGreaterThan(0);
    const assistantMsg = result.afterResponseMessages.find(m => m.role === 'assistant');
    expect(assistantMsg).toBeDefined();
  }, 180000);
});
