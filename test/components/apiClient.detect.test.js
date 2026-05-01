/**
 * Tests for apiClient - Protocol detection (detectProtocol)
 */

describe('detectProtocol', () => {
  test('should return openai for URLs containing "openai"', () => {
    const protocol = window.detectProtocol('https://api.openai.com/v1');
    expect(protocol).toBe('openai');
  });

  test('should return anthropic for URLs containing "anthropic"', () => {
    const protocol = window.detectProtocol('https://api.anthropic.com/v1');
    expect(protocol).toBe('anthropic');
  });

  test('should detect "anthropic" case-insensitively', () => {
    const protocol = window.detectProtocol('https://api.ANTHROPIC.com/v1');
    expect(protocol).toBe('anthropic');
  });

  test('should default to openai for unknown URLs', () => {
    const protocol = window.detectProtocol('https://custom-api.example.com/v1');
    expect(protocol).toBe('openai');
  });

  test('should default to openai for empty URL', () => {
    const protocol = window.detectProtocol('');
    expect(protocol).toBe('openai');
  });

  test('should default to openai for null URL', () => {
    const protocol = window.detectProtocol(null);
    expect(protocol).toBe('openai');
  });

  test('should detect anthropic in URL path', () => {
    const protocol = window.detectProtocol('https://proxy.example.com/anthropic/v1');
    expect(protocol).toBe('anthropic');
  });
});
