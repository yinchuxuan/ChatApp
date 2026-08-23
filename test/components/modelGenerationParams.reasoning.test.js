const {
  buildAnthropicParams,
  buildOpenAIParams,
  reasoningEffortsForProtocol
} = require('../../src/renderer/chat/modelGenerationParams.js');

describe('reasoning effort generation parameters', () => {
  test('omits values unsupported by the selected protocol', () => {
    expect(buildOpenAIParams({ reasoningEffort: 'adaptive' }).reasoning_effort).toBeUndefined();
    expect(buildAnthropicParams({ reasoningEffort: 'minimal' }).output_config).toBeUndefined();
  });

  test('exposes provider-specific choices', () => {
    expect(buildOpenAIParams({ reasoningEffort: 'max' }).reasoning_effort).toBe('max');
    expect(reasoningEffortsForProtocol('openai')).toContain('none');
    expect(reasoningEffortsForProtocol('openai')).toContain('max');
    expect(reasoningEffortsForProtocol('anthropic')).toContain('max');
    expect(reasoningEffortsForProtocol('anthropic')).not.toContain('minimal');
  });
});
