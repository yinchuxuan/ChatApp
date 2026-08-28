/** @returns {import('./contracts.js').RendererServices} */
function createMemoryRendererServices(initial = {}) {
  let config = initial.config || {};
  let background = initial.background || {};
  let history = initial.history || { messages: [] };
  let sessions = initial.sessions || [];
  let activeId = initial.activeId || null;
  let cards = initial.cards || [];
  let activeCardId = initial.activeCardId || null;
  let fullscreen = initial.fullscreen === true;
  const listeners = new Set();
  return {
    config: {
      load: async () => config,
      save: async value => { config = value; return config; }
    },
    background: {
      load: async () => background,
      save: async value => { background = value; listeners.forEach(fn => fn(value)); return background; },
      selectImage: async () => initial.selectedImage || '',
      subscribe: listener => { listeners.add(listener); return () => listeners.delete(listener); }
    },
    sessions: {
      loadHistory: async () => history,
      saveHistory: async (messages, options = {}) => { history = { messages, ...options }; return history; },
      list: async () => ({ sessions, activeId }),
      getActive: async () => sessions.find(item => item.id === activeId) || null,
      create: async title => { const item = { id: `session-${sessions.length + 1}`, title }; sessions = [...sessions, item]; activeId = item.id; return item; },
      setActive: async id => { activeId = id; return { id }; },
      rename: async (id, title) => { sessions = sessions.map(item => item.id === id ? { ...item, title } : item); return { id, title }; },
      delete: async id => { sessions = sessions.filter(item => item.id !== id); if (activeId === id) activeId = sessions[0]?.id || null; return { id: activeId }; }
    },
    cards: {
      list: async () => cards,
      setActive: async id => { activeCardId = id || null; return { id: activeCardId }; },
      importDirectory: async () => {
        const card = initial.importedCard || null;
        if (card && !cards.some(item => item.id === card.id)) cards = [...cards, card];
        activeCardId = card?.id || activeCardId;
        return card;
      }
    },
    window: {
      isFullscreen: async () => fullscreen,
      setFullscreen: async value => { fullscreen = value; }
    }
  };
}

export { createMemoryRendererServices };
