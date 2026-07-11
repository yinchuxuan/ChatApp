import { getDesktopTarget, TAURI_TARGET } from './platformTarget.js';
import { createTauriModelFetch } from './tauriModelFetch.js';

const tauriModelFetch = createTauriModelFetch();

function modelFetch(url, options) {
  if (getDesktopTarget() === TAURI_TARGET) return tauriModelFetch(url, options);
  return globalThis.fetch(url, options);
}

export { modelFetch };
