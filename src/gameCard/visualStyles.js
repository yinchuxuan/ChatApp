const STYLE_ID = 'game-card-visual-style';

function removeGameCardVisualStyle(doc = document) {
  const existing = doc.getElementById(STYLE_ID);
  if (existing) existing.remove();
}

function isSafeVisualStylesheetPath(path) {
  return typeof path === 'string' &&
    path.length > 0 &&
    path.toLowerCase().endsWith('.css') &&
    !path.startsWith('/') &&
    !path.split(/[\\/]+/).includes('..');
}

async function loadGameCardVisualStyle(card, api, doc = document) {
  removeGameCardVisualStyle(doc);
  const stylesheet = card?.visual?.stylesheet;
  if (!card?.id || !isSafeVisualStylesheetPath(stylesheet) || typeof api?.readGameCardFile !== 'function') {
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
  window.GameCardVisualStyles = {
    loadGameCardVisualStyle,
    removeGameCardVisualStyle
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    loadGameCardVisualStyle,
    removeGameCardVisualStyle,
    isSafeVisualStylesheetPath
  };
}
