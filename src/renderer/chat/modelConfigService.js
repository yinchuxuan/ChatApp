const listeners = new Set();

function publishModelConfig(config) {
  listeners.forEach(listener => listener(config));
}

function subscribeModelConfig(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export { publishModelConfig, subscribeModelConfig };
