const DISPLAY_STYLE_ID = 'game-card-display-style';

function removeGameCardDisplayStyle(doc = document) {
  const existing = doc.getElementById(DISPLAY_STYLE_ID);
  if (existing) existing.remove();
}

function isSafeStylesheetPath(path) {
  return typeof path === 'string' &&
    path.length > 0 &&
    !path.startsWith('/') &&
    !path.split(/[\\/]+/).includes('..');
}

async function loadGameCardDisplayStyle(card, api, doc = document) {
  removeGameCardDisplayStyle(doc);
  const stylesheet = card?.display?.stylesheet;
  if (!card?.id || !isSafeStylesheetPath(stylesheet) || typeof api?.readGameCardFile !== 'function') {
    return false;
  }
  const result = await api.readGameCardFile(card.id, stylesheet);
  if (!result?.success || !result.content) return false;
  const style = doc.createElement('style');
  style.id = DISPLAY_STYLE_ID;
  style.dataset.gameCardId = card.id;
  style.dataset.source = stylesheet;
  style.textContent = result.content;
  doc.head.appendChild(style);
  return true;
}

if (typeof window !== 'undefined') {
  window.GameCardDisplayStyles = { loadGameCardDisplayStyle, removeGameCardDisplayStyle };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { loadGameCardDisplayStyle, removeGameCardDisplayStyle, isSafeStylesheetPath };
}
