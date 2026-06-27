const STYLE_ID = 'game-card-ui-style';

function removeGameCardUiStyle(doc = document) {
  const existing = doc.getElementById(STYLE_ID);
  if (existing) existing.remove();
}

function isSafeUiStylesheetPath(path) {
  return typeof path === 'string' &&
    path.length > 0 &&
    path.toLowerCase().endsWith('.css') &&
    !path.startsWith('/') &&
    !path.startsWith('\\') &&
    !path.split(/[\\/]+/).includes('..');
}

async function loadGameCardUiStyle(card, api, doc = document) {
  removeGameCardUiStyle(doc);
  const stylesheet = card?.ui?.stylesheet;
  if (!card?.id || !isSafeUiStylesheetPath(stylesheet) || typeof api?.readGameCardFile !== 'function') {
    return false;
  }
  const result = await api.readGameCardFile(card.id, stylesheet);
  if (!result?.success || !result.content) return false;
  const style = doc.createElement('style');
  style.id = STYLE_ID;
  style.dataset.gameCardId = card.id;
  style.dataset.source = stylesheet;
  style.textContent = result.content;
  doc.head.appendChild(style);
  return true;
}

if (typeof window !== 'undefined') {
  window.GameCardUiStyles = { loadGameCardUiStyle, removeGameCardUiStyle };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { loadGameCardUiStyle, removeGameCardUiStyle, isSafeUiStylesheetPath };
}
