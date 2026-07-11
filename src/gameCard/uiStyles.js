const UI_STYLE_ID = 'game-card-ui-style';

function removeGameCardUiStyle(doc = document) {
  const existing = doc.getElementById(UI_STYLE_ID);
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

async function loadGameCardUiStyle(card, resources, doc = document) {
  removeGameCardUiStyle(doc);
  const stylesheet = card?.ui?.stylesheet;
  if (!card?.id || !isSafeUiStylesheetPath(stylesheet) || typeof resources?.readText !== 'function') {
    return false;
  }
  let content;
  try { content = await resources.readText(card.id, stylesheet); } catch (_) { return false; }
  if (!content) return false;
  const style = doc.createElement('style');
  style.id = UI_STYLE_ID;
  style.dataset.gameCardId = card.id;
  style.dataset.source = stylesheet;
  style.textContent = content;
  doc.head.appendChild(style);
  return true;
}

export { isSafeUiStylesheetPath, loadGameCardUiStyle, removeGameCardUiStyle };
