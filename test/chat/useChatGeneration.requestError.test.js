import { act } from '@testing-library/react';
import { renderRetryGeneration } from './useChatGenerationTestHarness.js';

describe('useChatGeneration request errors', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('reports provider failures without appending an assistant message', async () => {
    global.fetch.mockRejectedValue(new Error('Network failed'));
    const { result, options } = renderRetryGeneration({ messages: [] });

    await act(async () => { await result.current.send('hello'); });

    expect(options.setRequestError).toHaveBeenCalledWith(null);
    expect(options.setRequestError).toHaveBeenLastCalledWith('请求失败: Network failed');
    expect(options.setMessages).toHaveBeenLastCalledWith([
      expect.objectContaining({ role: 'user', content: 'hello' })
    ]);
  });

  test('reports missing configuration while storing only the user input', async () => {
    const { result, options } = renderRetryGeneration({
      messages: [],
      options: { modelConfig: { apiUrl: '', apiKey: '', modelName: '' } }
    });

    await act(async () => { await result.current.send('hello'); });

    expect(options.setRequestError)
      .toHaveBeenCalledWith('请先在右侧设置面板配置模型 API');
    const updater = options.setMessages.mock.calls[0][0];
    expect(updater([])).toEqual([
      expect.objectContaining({ role: 'user', content: 'hello' })
    ]);
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
