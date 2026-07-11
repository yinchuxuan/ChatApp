import { createTauriModelFetch } from './tauriModelFetch.js';

const tauriModelFetch = createTauriModelFetch();

function modelFetch(url, options) {
  return tauriModelFetch(url, options);
}

export { modelFetch };
