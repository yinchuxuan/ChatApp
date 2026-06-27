function ChatSessionManager({ onBeforeSessionChange, onSessionChanged }) {
  const R = window.React || React;
  const [open, setOpen] = R.useState(false), [sessions, setSessions] = R.useState([]), [activeId, setActiveId] = R.useState(null);
  const [editingId, setEditingId] = R.useState(null), [draftTitle, setDraftTitle] = R.useState(''), [busy, setBusy] = R.useState(false);

  const loadSessions = R.useCallback(async () => {
    const result = await window.electronAPI?.listChatSessions?.();
    if (result?.success) { setSessions(result.sessions || []); setActiveId(result.activeId || null); }
  }, []);

  R.useEffect(() => { loadSessions(); }, [loadSessions]);
  R.useEffect(() => {
    const handler = () => loadSessions();
    window.addEventListener('game-card-changed', handler);
    return () => window.removeEventListener('game-card-changed', handler);
  }, [loadSessions]);

  const activate = async (id) => {
    if (id === activeId || busy) return;
    setBusy(true);
    await onBeforeSessionChange?.();
    const result = await window.electronAPI?.setActiveChatSession?.(id);
    if (result?.success) { await onSessionChanged?.(id); await loadSessions(); setOpen(false); }
    setBusy(false);
  };

  const createSession = async (event) => {
    event.stopPropagation();
    if (busy) return;
    setBusy(true);
    await onBeforeSessionChange?.();
    const result = await window.electronAPI?.createChatSession?.('新会话');
    if (result?.success) { await onSessionChanged?.(result.id); await loadSessions(); }
    setBusy(false);
  };

  const saveSession = async (event) => {
    event.stopPropagation();
    if (busy) return;
    setBusy(true);
    await onBeforeSessionChange?.();
    const snapshot = await window.electronAPI?.getChatHistory?.();
    const currentId = activeId;
    const created = await window.electronAPI?.createChatSession?.('会话存档');
    if (created?.success) {
      if (snapshot?.success) {
        await window.electronAPI?.saveChatHistory?.(snapshot.messages || [], {
          gameState: snapshot.gameState || {},
          retryBaseMessages: snapshot.retryBaseMessages || [],
          retryBaseState: snapshot.retryBaseState || {}
        });
      }
      if (currentId && currentId !== created.id) await window.electronAPI?.setActiveChatSession?.(currentId);
    }
    await loadSessions();
    setBusy(false);
  };

  const renameSession = async (event, id) => {
    event.stopPropagation();
    const title = draftTitle.trim();
    if (!title) return;
    const result = await window.electronAPI?.renameChatSession?.(id, title);
    if (result?.success) { setEditingId(null); await loadSessions(); }
  };

  const deleteSession = async (event, id) => {
    event.stopPropagation();
    if (busy || (window.confirm && !window.confirm('删除这个会话？'))) return;
    setBusy(true);
    await onBeforeSessionChange?.();
    const result = await window.electronAPI?.deleteChatSession?.(id);
    if (result?.success) { await onSessionChanged?.(result.id); await loadSessions(); }
    setBusy(false);
  };

  const C = R.createElement;
  const renderSession = (session) => C('div', { key: session.id, className: `chat-session-row${session.id === activeId ? ' active' : ''}`, 'data-gc-part': 'chat-session-row', onClick: (event) => { event.stopPropagation(); activate(session.id); } },
    C('span', { className: 'chat-session-row-state', 'data-gc-part': 'chat-session-row-state', 'aria-hidden': 'true' }),
    C('div', { className: 'chat-session-row-main', 'data-gc-part': 'chat-session-row-main' },
      editingId === session.id ? C('input', {
        className: 'chat-session-title-input', value: draftTitle, autoFocus: true,
        onClick: (event) => event.stopPropagation(), onChange: (event) => setDraftTitle(event.target.value),
        onKeyDown: (event) => { if (event.key === 'Enter') renameSession(event, session.id); if (event.key === 'Escape') setEditingId(null); }
      }) : C('div', { className: 'chat-session-title', 'data-gc-part': 'chat-session-title' }, session.title || session.id),
      C('div', { className: 'chat-session-preview', 'data-gc-part': 'chat-session-preview' }, session.preview || `${session.messageCount || 0} 条消息`)
    ),
    editingId === session.id ? C('button', { className: 'chat-session-action', 'data-gc-part': 'chat-session-action', onClick: (event) => renameSession(event, session.id), title: '保存会话名', 'aria-label': '保存会话名' }, C('span', { className: 'material-icons' }, 'check')) :
      C('button', { className: 'chat-session-action', 'data-gc-part': 'chat-session-action', onClick: (event) => { event.stopPropagation(); setEditingId(session.id); setDraftTitle(session.title || session.id); }, title: '重命名会话', 'aria-label': '重命名会话' }, C('span', { className: 'material-icons' }, 'edit')),
    C('button', { className: 'chat-session-action danger', 'data-gc-part': 'chat-session-action', onClick: (event) => deleteSession(event, session.id), title: '删除会话', 'aria-label': '删除会话' }, C('span', { className: 'material-icons' }, 'delete'))
  );

  return C('div', { className: 'chat-session-manager', 'data-gc-part': 'chat-session-manager' },
    C('button', { className: 'chat-session-btn', 'data-gc-part': 'chat-session-button', onClick: (event) => { event.stopPropagation(); setOpen(!open); if (!open) loadSessions(); }, title: '管理聊天会话', 'aria-label': '管理聊天会话' }, C('span', { className: 'material-icons' }, 'inventory_2')),
    open ? C('div', { className: 'chat-session-panel', 'data-gc-part': 'chat-session-panel', onClick: (event) => event.stopPropagation() },
      C('div', { className: 'chat-session-panel-head', 'data-gc-part': 'chat-session-panel-head' },
        C('span', { className: 'chat-session-panel-title' }, '会话'),
        C('div', { className: 'chat-session-head-actions' },
          C('button', { className: 'chat-session-text-action', onClick: saveSession, disabled: busy, title: '保存当前会话', 'aria-label': '保存当前会话' }, C('span', { className: 'material-icons' }, 'save'), C('span', null, '存档')),
          C('button', { className: 'chat-session-text-action', onClick: createSession, disabled: busy, title: '新建会话', 'aria-label': '新建会话' }, C('span', { className: 'material-icons' }, 'add'), C('span', null, '新建'))
        )
      ),
      C('div', { className: 'chat-session-list', 'data-gc-part': 'chat-session-list' }, sessions.map(renderSession))
    ) : null
  );
}

if (typeof window !== 'undefined') {
  window.ChatSessionManager = ChatSessionManager;
}

export default ChatSessionManager;
