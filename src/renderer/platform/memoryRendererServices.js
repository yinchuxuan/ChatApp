/** @returns {import('./contracts.js').RendererServices} */
function createMemoryRendererServices(initial = {}) {
  let config = initial.config || {};
  let background = initial.background || {};
  let history = initial.history || { messages: [] };
  let sessions = initial.sessions || [];
  let activeId = initial.activeId || null;
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
    cards: { importDirectory: async () => initial.importedCard || null },
    window: {
      isFullscreen: async () => fullscreen,
      setFullscreen: async value => { fullscreen = value; }
    }
  };
}

export { createMemoryRendererServices };
