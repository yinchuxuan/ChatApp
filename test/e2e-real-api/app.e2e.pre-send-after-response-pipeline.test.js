/**
 * E2E Tests: Game card pre-send and after-response pipelines with real API keys
 */
const { test, expect } = require('@playwright/test');
const { OPENAI_CONFIG, skipReason, setupHooks } = require('../e2e/realApiTestHelpers');

test.describe.configure({ mode: 'serial' });

const { configureAppRealAPI, sendThroughPipeline, getHistory } = setupHooks();

// ---------------------------------------------------------------------------
// 1. Pre-send pipeline with real LLM
// ---------------------------------------------------------------------------

test.describe('Game card pre_send with real LLM', () => {

  test('insert system prompt and replace user message prefix', async () => {
    if (!OPENAI_CONFIG) { test.skip(true, skipReason('E2E_OPENAI')); return; }

    const card = {
      version: '1.0', id: 'real_prefix', name: 'Real Prefix',
      rules: [{
        when: { phase: 'pre_send' },
        then: [
          { type: 'insert', predicate: { index: 0 }, role: 'system', content: 'You are a helpful assistant. Respond in exactly 3 words.', _meta: { visibility: 'llm_only' } },
          { type: 'replace', predicate: { index: 'last' }, content: 'Player says: {{original_content}}' }
        ]
      }]
    };
    await configureAppRealAPI(card);
    const result = await sendThroughPipeline(card, 'openai', [{ role: 'user', content: 'hello' }]);

    expect(result.preSendMessages).toHaveLength(2);
    expect(result.preSendMessages[0]).toEqual({ role: 'system', content: 'You are a helpful assistant. Respond in exactly 3 words.', _meta: { visibility: 'llm_only' } });
    expect(result.preSendMessages[1].content).toBe('Player says: hello');
    expect(result.llmResponse.length).toBeGreaterThan(0);
  }, 180000);

  test('when.any content match triggers system injection', async () => {
    if (!OPENAI_CONFIG) { test.skip(true, skipReason('E2E_OPENAI')); return; }

    const card = {
      version: '1.0', id: 'real_quest', name: 'Real Quest',
      rules: [{
        when: { phase: 'pre_send', any: { content: { contains: 'quest' } } },
        then: [{ type: 'insert', predicate: { index: 0 }, role: 'system', content: 'This is a quest scenario. Describe the scene vividly.', _meta: { visibility: 'llm_only' } }]
      }]
    };
    await configureAppRealAPI(card);
    const questResult = await sendThroughPipeline(card, 'openai', [{ role: 'user', content: 'start quest' }]);
    expect(questResult.apiMessages[0].content).toContain('quest scenario');
    expect(questResult.llmResponse.length).toBeGreaterThan(0);
  }, 180000);

  test('when.length=1 only fires on first message', async () => {
    if (!OPENAI_CONFIG) { test.skip(true, skipReason('E2E_OPENAI')); return; }

    const card = {
      version: '1.0', id: 'real_first', name: 'Real First',
      rules: [{
        when: { phase: 'pre_send', length: 1 },
        then: [{ type: 'replace', predicate: { index: 'last' }, content: 'FIRST_MESSAGE: {{original_content}}' }]
      }]
    };
    await configureAppRealAPI(card);

    const first = await sendThroughPipeline(card, 'openai', [{ role: 'user', content: 'hello' }]);
    expect(first.apiMessages[0].content).toBe('FIRST_MESSAGE: hello');
    expect(first.llmResponse.length).toBeGreaterThan(0);

    const history = await getHistory();
    const second = await sendThroughPipeline(card, 'openai', [...history, { role: 'user', content: 'follow up' }]);
    const lastUserMsg = second.apiMessages.filter(m => m.role === 'user').pop();
    expect(lastUserMsg.content).toBe('follow up');
    expect(second.llmResponse.length).toBeGreaterThan(0);
  }, 180000);
});

// ---------------------------------------------------------------------------
// 2. After-response pipeline with real LLM
// ---------------------------------------------------------------------------

test.describe('Game card after_response with real LLM', () => {

  test('insert hint message with TTL, TTL decays across turns', async () => {
    if (!OPENAI_CONFIG) { test.skip(true, skipReason('E2E_OPENAI')); return; }

    const card = {
      version: '1.0', id: 'real_hint', name: 'Real Hint',
      rules: [{
        when: { phase: 'after_response', last: { role: 'assistant' }, length: 2 },
        then: [{
          type: 'insert', predicate: { index: 'last' }, anchor: 'after',
          role: 'system', content: 'hint: the player just arrived',
          ttl: 2, _meta: { visibility: 'llm_only' }
        }]
      }]
    };
    await configureAppRealAPI(card);

    const turn1 = await sendThroughPipeline(card, 'openai', [{ role: 'user', content: 'turn1' }]);
    expect(turn1.llmResponse.length).toBeGreaterThan(0);
    const saved1 = await getHistory();
    const hint1 = saved1.find(m => m.content === 'hint: the player just arrived');
    expect(hint1).toBeDefined();
    expect(hint1.ttl).toBe(2);

    const history = await getHistory();
    const turn2 = await sendThroughPipeline(card, 'openai', [...history, { role: 'user', content: 'turn2' }]);
    expect(turn2.llmResponse.length).toBeGreaterThan(0);
    const saved2 = await getHistory();
    const hint2 = saved2.find(m => m.content === 'hint: the player just arrived');
    expect(hint2.ttl).toBe(1);
  }, 180000);
});
