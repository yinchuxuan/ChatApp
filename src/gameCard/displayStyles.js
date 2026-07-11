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

async function loadGameCardDisplayStyle(card, resources, doc = document) {
  removeGameCardDisplayStyle(doc);
  const stylesheet = card?.display?.stylesheet;
  if (!card?.id || !isSafeStylesheetPath(stylesheet) || typeof resources?.readText !== 'function') {
    return false;
  }
  let content;
  try { content = await resources.readText(card.id, stylesheet); } catch (_) { return false; }
  if (!content) return false;
  const style = doc.createElement('style');
  style.id = DISPLAY_STYLE_ID;
  style.dataset.gameCardId = card.id;
  style.dataset.source = stylesheet;
  style.textContent = content;
  doc.head.appendChild(style);
  return true;
}

export { isSafeStylesheetPath, loadGameCardDisplayStyle, removeGameCardDisplayStyle };
