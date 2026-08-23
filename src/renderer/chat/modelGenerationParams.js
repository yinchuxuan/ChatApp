const DEFAULT_GENERATION_PARAMS = {
  maxTokens: '4096',
  temperature: '0.8',
  topP: '0.9',
  frequencyPenalty: '0',
  presencePenalty: '0',
  reasoningEffort: ''
};

const REASONING_EFFORTS = Object.freeze({
  openai: Object.freeze(['none', 'minimal', 'low', 'medium', 'high', 'xhigh', 'max']),
  anthropic: Object.freeze(['low', 'medium', 'high', 'xhigh', 'max'])
});

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

function reasoningEffortsForProtocol(protocol = 'openai') {
  return REASONING_EFFORTS[protocol] || REASONING_EFFORTS.openai;
}

function validReasoningEffort(value, protocol) {
  return reasoningEffortsForProtocol(protocol).includes(value);
}

function buildOpenAIParams(config) {
  const cfg = withDefaultGenerationParams(config);
  const body = {};
  addNumber(body, 'max_tokens', cfg.maxTokens);
  addNumber(body, 'temperature', cfg.temperature);
  addNumber(body, 'top_p', cfg.topP);
  addNumber(body, 'frequency_penalty', cfg.frequencyPenalty);
  addNumber(body, 'presence_penalty', cfg.presencePenalty);
  if (validReasoningEffort(cfg.reasoningEffort, 'openai')) {
    body.reasoning_effort = cfg.reasoningEffort;
  }
  return body;
}

function buildAnthropicParams(config) {
  const cfg = withDefaultGenerationParams(config);
  const body = {};
  addNumber(body, 'max_tokens', cfg.maxTokens);
  addNumber(body, 'temperature', cfg.temperature);
  addNumber(body, 'top_p', cfg.topP);
  if (validReasoningEffort(cfg.reasoningEffort, 'anthropic')) {
    body.output_config = { effort: cfg.reasoningEffort };
  }
  return body;
}

export {
  DEFAULT_GENERATION_PARAMS,
  buildAnthropicParams,
  buildOpenAIParams,
  reasoningEffortsForProtocol,
  withDefaultGenerationParams
};
