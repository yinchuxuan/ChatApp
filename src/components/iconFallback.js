// Local fallback for Material Icons ligature spans.
// Keeps the ligature text in the DOM for tests, while CSS renders a local icon.

function syncMaterialIconElement(element) {
  if (!element) return;
  const iconName = (element.textContent || '').trim();
  if (!iconName) return;
  element.dataset.icon = iconName;
  if (!element.getAttribute('aria-label') && !element.getAttribute('title')) {
    element.setAttribute('aria-hidden', 'true');
  }
}

function syncMaterialIcons(root = document) {
  if (!root.querySelectorAll) return;
  root.querySelectorAll('.material-icons').forEach(syncMaterialIconElement);
}

function installMaterialIconFallback() {
  syncMaterialIcons();

  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'characterData') {
        const parent = mutation.target.parentElement;
        if (parent?.classList?.contains('material-icons')) {
          syncMaterialIconElement(parent);
        }
      }
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType !== Node.ELEMENT_NODE) return;
        if (node.classList?.contains('material-icons')) {
          syncMaterialIconElement(node);
        }
        syncMaterialIcons(node);
      });
    });
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    characterData: true
  });
}

if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', installMaterialIconFallback, { once: true });
  } else {
    installMaterialIconFallback();
  }
  window.syncMaterialIcons = syncMaterialIcons;
}

export { syncMaterialIcons };
