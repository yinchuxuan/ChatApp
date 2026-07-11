import { resolveRequestTransport } from '../../src/chat/apiClient.js';

describe('apiClient development proxy', () => {
  const request = {
    protocol: 'openai',
    url: 'https://api.example.com/v1/chat/completions',
    options: {
      method: 'POST',
      headers: { Authorization: 'Bearer key', 'Content-Type': 'application/json' },
      body: '{}'
    }
  };

  test('keeps production requests direct', () => {
    expect(resolveRequestTransport(request, false)).toBe(request);
  });

  test('routes development requests through the same-origin proxy', () => {
    const result = resolveRequestTransport(request, true);

    expect(result.url).toBe('/__chatapp_model_proxy');
    expect(result.options.headers).toEqual({
      ...request.options.headers,
      'X-ChatApp-Target-Url': request.url
    });
    expect(request.options.headers).not.toHaveProperty('X-ChatApp-Target-Url');
  });
});
