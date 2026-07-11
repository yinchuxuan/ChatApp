function createKeyedQueue() {
  const pending = new Map();

  function run(key, operation) {
    const previous = pending.get(key) || Promise.resolve();
    const current = previous.catch(() => {}).then(operation);
    pending.set(key, current);
    return current.finally(() => {
      if (pending.get(key) === current) pending.delete(key);
    });
  }

  return { run };
}

module.exports = { createKeyedQueue };
