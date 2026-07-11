import { normalizePlatformError, unwrapTauriResult } from './platformCommand.js';

async function invokeTauriCommand(invoke, command, args = {}, field) {
  if (typeof invoke !== 'function') {
    throw new Error('Tauri API unavailable: invoke');
  }
  try {
    const result = await invoke(command, args);
    return unwrapTauriResult(result, field, `${command} failed`);
  } catch (error) {
    throw normalizePlatformError(error, `${command} failed`);
  }
}

export { invokeTauriCommand };
