const DEFAULT_GENERATION_PARAMS = {
  maxTokens: '4096',
  temperature: '0.8',
  topP: '0.9',
  frequencyPenalty: '0',
  presencePenalty: '0'
};

function withDefaultGenerationParams(config = {}) {
  return { ...DEFAULT_GENERATION_PARAMS, ...config };
}

function numberOrNull(value) {
  if (value === '' || value === null || value === undefined) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function addNumber(body, target, value) {
  const parsed = numberOrNull(value);
  if (parsed !== null) body[target] = parsed;
}

function buildOpenAIParams(config) {
  const cfg = withDefaultGenerationParams(config);
  const body = {};
  addNumber(body, 'max_tokens', cfg.maxTokens);
  addNumber(body, 'temperature', cfg.temperature);
  addNumber(body, 'top_p', cfg.topP);
  addNumber(body, 'frequency_penalty', cfg.frequencyPenalty);
  addNumber(body, 'presence_penalty', cfg.presencePenalty);
  return body;
}

function buildAnthropicParams(config) {
  const cfg = withDefaultGenerationParams(config);
  const body = {};
  addNumber(body, 'max_tokens', cfg.maxTokens);
  addNumber(body, 'temperature', cfg.temperature);
  addNumber(body, 'top_p', cfg.topP);
  return body;
}

if (typeof window !== 'undefined') {
  window.DEFAULT_GENERATION_PARAMS = DEFAULT_GENERATION_PARAMS;
  window.withDefaultGenerationParams = withDefaultGenerationParams;
  window.buildOpenAIParams = buildOpenAIParams;
  window.buildAnthropicParams = buildAnthropicParams;
}

exports.DEFAULT_GENERATION_PARAMS = DEFAULT_GENERATION_PARAMS;
exports.withDefaultGenerationParams = withDefaultGenerationParams;
exports.buildOpenAIParams = buildOpenAIParams;
exports.buildAnthropicParams = buildAnthropicParams;
