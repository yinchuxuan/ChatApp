const { card } = require('../tauri-e2e/support/cards');
const {
  activateCard, invoke, sendMessage, waitForHistory
} = require('../tauri-e2e/support/tauri');

function envConfig(prefix, protocol) {
  const apiUrl = process.env[`${prefix}_URL`];
  const apiKey = process.env[`${prefix}_KEY`];
  const modelName = process.env[`${prefix}_MODEL`];
  return apiUrl && apiKey && modelName
    ? { apiUrl, apiKey, modelName, protocol }
    : null;
}

const openAi = envConfig('E2E_OPENAI', 'openai');
const anthropic = envConfig('E2E_ANTHROPIC', 'anthropic');

async function configure(config, activeCard) {
  await invoke('save_model_config', { config });
  await activateCard(activeCard);
}

describe('Tauri real model protocols', () => {
  beforeEach(async () => {
    await invoke('set_active_game_card', { id: null });
  });

  it('should stream an OpenAI-compatible response through Rust', async function () {
    if (!openAi) this.skip();
    await configure(openAi, card('real-openai', 'Real OpenAI', [{
      when: { phase: 'pre_send' },
      then: [{
        type: 'replace', predicate: { index: 'last' },
        content: '[real] {{original_content}}'
      }]
    }]));
    await sendMessage('say ok');
    const history = await waitForHistory(value => (
      value.messages.some(message => message.role === 'assistant')
    ), 120000);
    expect(history.messages.some(message => (
      message.role === 'user' && message.content === '[real] say ok'
    ))).toBe(true);
    const response = history.messages.find(message => message.role === 'assistant');
    expect((response.content?.length || 0) + (response.thinking?.length || 0))
      .toBeGreaterThan(0);
  });

  it('should stream an Anthropic-compatible response through Rust', async function () {
    if (!anthropic) this.skip();
    await configure(anthropic, card('real-anthropic', 'Real Anthropic', [{
      when: { phase: 'pre_send' },
      then: [
        {
          type: 'insert', predicate: { index: 0 }, anchor: 'before',
          role: 'system', content: 'Reply briefly.',
          _meta: { visibility: 'llm_only' }
        },
        {
          type: 'replace', predicate: { index: 'last' },
          content: '[real] {{original_content}}'
        }
      ]
    }]));
    await sendMessage('say ok');
    const history = await waitForHistory(value => (
      value.messages.some(message => message.role === 'assistant')
    ), 120000);
    expect(history.messages.some(message => message.content === 'Reply briefly.')).toBe(true);
    const response = history.messages.find(message => message.role === 'assistant');
    expect((response.content?.length || 0) + (response.thinking?.length || 0))
      .toBeGreaterThan(0);
  });
});
