import { runInBrowser } from '../../src/platform/controlledScriptExecutor.js';

function context() {
  return { messages: [], state: {}, config: {}, event: {}, files: {} };
}

function respondingWorker(result, delay = 0) {
  const worker = { terminate: jest.fn() };
  worker.postMessage = jest.fn(() => setTimeout(() => worker.onmessage({ data: { result } }), delay));
  return worker;
}

describe('browser controlled script executor', () => {
  test('runs concurrent scripts in independent workers', async () => {
    const first = respondingWorker({ state: { value: 1 } }, 5);
    const second = respondingWorker({ state: { value: 2 } });
    const workers = [first, second];
    const results = await Promise.all([
      runInBrowser('first', context(), { timeoutMs: 50, workerFactory: () => workers.shift() }),
      runInBrowser('second', context(), { timeoutMs: 50, workerFactory: () => workers.shift() })
    ]);
    expect(results.map(result => result.state.value)).toEqual([1, 2]);
    expect(first.terminate).toHaveBeenCalled();
    expect(second.terminate).toHaveBeenCalled();
  });

  test('terminates a worker that exceeds its timeout', async () => {
    const worker = { postMessage: jest.fn(), terminate: jest.fn() };
    await expect(runInBrowser('while (true) {}', context(), {
      timeoutMs: 5, workerFactory: () => worker
    })).rejects.toThrow('Script execution timed out');
    expect(worker.terminate).toHaveBeenCalled();
  });

  test('rejects worker script errors', async () => {
    const worker = respondingWorker();
    worker.postMessage = jest.fn(() => setTimeout(() => worker.onmessage({ data: { error: 'boom' } }), 0));
    await expect(runInBrowser('throw', context(), {
      timeoutMs: 50, workerFactory: () => worker
    })).rejects.toThrow('boom');
  });

  test('rejects direct access to browser capabilities', async () => {
    await expect(runInBrowser('return eval("state")', context(), {
      timeoutMs: 50, workerFactory: () => respondingWorker({})
    })).rejects.toThrow('blocked browser runtime token');
  });
});
