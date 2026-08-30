function createLatestSaveQueue(saveSnapshot) {
  let pending;
  let running = null;

  const start = () => {
    if (running) return running;
    const drain = async () => {
      while (pending !== undefined) {
        const snapshot = pending;
        pending = undefined;
        await saveSnapshot(snapshot);
      }
    };
    const task = drain();
    running = task.finally(() => {
      running = null;
      if (pending !== undefined) void start().catch(() => {});
    });
    return running;
  };
  const waitForIdle = async () => {
    while (pending !== undefined || running) await start();
  };

  return {
    enqueue(snapshot) {
      pending = snapshot;
      return start();
    },
    async flush(snapshot) {
      pending = snapshot;
      await waitForIdle();
    },
    waitForIdle
  };
}

export { createLatestSaveQueue };
