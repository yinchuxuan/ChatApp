/* global __CHATAPP_DESKTOP_TARGET__ */

const ELECTRON_TARGET = 'electron';
const TAURI_TARGET = 'tauri';

function getDesktopTarget() {
  if (typeof __CHATAPP_DESKTOP_TARGET__ === 'undefined') return ELECTRON_TARGET;
  if (__CHATAPP_DESKTOP_TARGET__ === TAURI_TARGET) return TAURI_TARGET;
  return ELECTRON_TARGET;
}

function createPlatformAdapters(target, factories) {
  const selected = target === TAURI_TARGET ? factories.tauri : factories.electron;
  return Object.freeze({
    gameCardPlatform: selected.createGameCardPlatform(),
    rendererServices: selected.createRendererServices()
  });
}

export { ELECTRON_TARGET, TAURI_TARGET, createPlatformAdapters, getDesktopTarget };
