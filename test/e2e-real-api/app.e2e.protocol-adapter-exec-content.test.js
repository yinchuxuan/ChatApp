/**
 * E2E Tests: Protocol adapter, exec runtime, content descriptor with real API keys
 */
const { test, expect } = require('@playwright/test');
const { OPENAI_CONFIG, ANTHROPIC_CONFIG, skipReason, setupHooks } = require('../e2e/realApiTestHelpers');

test.describe.configure({ mode: 'serial' });

const { configureAppRealAPI, sendThroughPipeline, getAppHelper } = setupHooks();

// ---------------------------------------------------------------------------
// 1. Protocol adapter with real Anthropic API
// ---------------------------------------------------------------------------

test.describe('Protocol adapter with real Anthropic API', () => {

  test('game card system messages extracted to top-level system field', async () => {
    if (!ANTHROPIC_CONFIG) { test.skip(true, skipReason('E2E_ANTHROPIC')); return; }

    const card = {
      version: '1.0', id: 'real_ant_sys', name: 'Real Anthropic System',
      rules: [{
        when: { phase: 'pre_send' },
        then: [{ type: 'insert', predicate: { index: 0 }, role: 'system', content: 'You are a game master. Respond with a short story opening.', _meta: { visibility: 'llm_only' } }]
      }]
    };
    await configureAppRealAPI(card, 'anthropic');
    const result = await sendThroughPipeline(card, 'anthropic', [{ role: 'user', content: 'begin the adventure' }]);

    const sysMsgs = result.preSendMessages.filter(m => m.role === 'system');
    expect(sysMsgs).toHaveLength(1);
    expect(sysMsgs[0].content).toBe('You are a game master. Respond with a short story opening.');
    expect(result.apiMessages.every(m => m.role !== 'system')).toBe(true);
    expect(result.apiMessages).toEqual([{ role: 'user', content: 'begin the adventure' }]);
    expect(result.llmResponse.length).toBeGreaterThan(0);
  }, 180000);

  test('multiple system messages concatenated with double newline', async () => {
    if (!ANTHROPIC_CONFIG) { test.skip(true, skipReason('E2E_ANTHROPIC')); return; }

    const card = {
      version: '1.0', id: 'real_ant_multi', name: 'Real Anthropic Multi',
      rules: [{
        when: { phase: 'pre_send' },
        then: [
          { type: 'insert', predicate: { index: 0 }, role: 'system', content: 'Rule A', _meta: { visibility: 'llm_only' } },
          { type: 'insert', predicate: { index: 0 }, role: 'system', content: 'Rule B', _meta: { visibility: 'llm_only' } }
        ]
      }]
    };
    await configureAppRealAPI(card, 'anthropic');
    const result = await sendThroughPipeline(card, 'anthropic', [{ role: 'user', content: 'test' }]);

    const sysMsgs = result.preSendMessages.filter(m => m.role === 'system');
    expect(sysMsgs).toHaveLength(2);
    expect(sysMsgs.map(m => m.content)).toContain('Rule A');
    expect(sysMsgs.map(m => m.content)).toContain('Rule B');
    expect(result.apiMessages.every(m => m.role !== 'system')).toBe(true);
    expect(result.llmResponse.length).toBeGreaterThan(0);
  }, 180000);
});

// ---------------------------------------------------------------------------
// 2. Exec runtime with real LLM
// ---------------------------------------------------------------------------

test.describe('Exec runtime with real LLM', () => {

  test('exec inserts dynamic damage message and real LLM receives it', async () => {
    if (!OPENAI_CONFIG) { test.skip(true, skipReason('E2E_OPENAI')); return; }

    const card = {
      version: '1.0', id: 'real_exec_dmg', name: 'Real Exec Damage',
      state: { hp: 50 },
      rules: [{
        when: { phase: 'pre_send', any: { content: { contains: 'attack' } } },
        then: [{
          type: 'exec',
          source: 'const dmg = utils.roll("1d6"); state.lastDamage = dmg; messages.push({ role: "system", content: "You deal " + dmg + " damage to the target.", ttl: 1, _meta: { visibility: "llm_only" } }); return { messages, state };'
        }]
      }]
    };
    await configureAppRealAPI(card, 'openai');
    const result = await sendThroughPipeline(card, 'openai', [{ role: 'user', content: 'attack the dragon' }]);

    const damageMsg = result.apiMessages.find(m => m.content && m.content.startsWith('You deal '));
    expect(damageMsg).toBeDefined();
    expect(damageMsg.content).toMatch(/^You deal \d+ damage to the target\.$/);
    expect(result.llmResponse.length).toBeGreaterThan(0);
  }, 180000);

  test('exec state persists across turns via applyGameCard evaluate', async () => {
    if (!OPENAI_CONFIG) { test.skip(true, skipReason('E2E_OPENAI')); return; }

    const card = {
      version: '1.0', id: 'real_exec_state', name: 'Real Exec State',
      state: { score: 0 },
      rules: [{
        when: { phase: 'pre_send', any: { content: { contains: 'score' } } },
        then: [{
          type: 'exec',
          source: 'state.score += 10; messages.push({ role: "system", content: "Current score: " + state.score, ttl: 1, _meta: { visibility: "llm_only" } }); return { messages, state };'
        }]
      }]
    };
    await configureAppRealAPI(card, 'openai');

    const first = await getAppHelper().getWindow().evaluate(({ card }) => {
      return window.applyGameCard({ card, phase: 'pre_send', messages: [{ role: 'user', content: 'score' }], state: { score: 0 } });
    }, { card });
    expect(first.state.score).toBe(10);

    const second = await getAppHelper().getWindow().evaluate(({ card, st }) => {
      return window.applyGameCard({ card, phase: 'pre_send', messages: [{ role: 'user', content: 'score' }], state: st });
    }, { card, st: first.state });
    expect(second.state.score).toBe(20);
  }, 60000);
});

// ---------------------------------------------------------------------------
// 3. Content descriptor with real LLM
// ---------------------------------------------------------------------------

test.describe('Content descriptor with real LLM', () => {

  test('raw_string concatenation prefixes user message', async () => {
    if (!OPENAI_CONFIG) { test.skip(true, skipReason('E2E_OPENAI')); return; }

    const card = {
      version: '1.0', id: 'real_concat', name: 'Real Concat',
      rules: [{
        when: { phase: 'pre_send' },
        then: [{ type: 'replace', predicate: { role: 'user' }, content: '{{raw_string:【冒险者】}} + {{original_content}}' }]
      }]
    };
    await configureAppRealAPI(card);
    const result = await sendThroughPipeline(card, 'openai', [{ role: 'user', content: 'look around' }]);
    expect(result.apiMessages[0].content).toBe('【冒险者】look around');
    expect(result.llmResponse.length).toBeGreaterThan(0);
  }, 180000);

  test('regex_replace cleans code fences from real LLM response', async () => {
    if (!OPENAI_CONFIG) { test.skip(true, skipReason('E2E_OPENAI')); return; }

    const card = {
      version: '1.0', id: 'real_clean', name: 'Real Clean',
      rules: [{
        when: { phase: 'after_response', last: { role: 'assistant' } },
        then: [{
          type: 'replace', predicate: { index: 'last' },
          content: "{{original_content}}.regex_replace{pattern:'^```\\\\w*\\\\n',with:''}.regex_replace{pattern:'\\\\n```$',with:''}"
        }]
      }]
    };
    await configureAppRealAPI(card);
    const result = await sendThroughPipeline(card, 'openai', [{ role: 'user', content: '请返回JSON格式 {"ok":true}，用代码块包裹' }]);
    expect(result.llmResponse.length).toBeGreaterThan(0);
    const assistantMsg = result.afterResponseMessages.find(m => m.role === 'assistant');
    expect(assistantMsg).toBeDefined();
    expect(assistantMsg.content.trim()).not.toMatch(/^```/);
  }, 180000);
});
