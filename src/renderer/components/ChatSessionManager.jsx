import React from 'react';
import { rendererServices } from '../platform/index.js';
import { PropTypes, sessionRepository } from './componentPropTypes.js';

function ChatSessionManager({ cardId, onBeforeSessionChange, onSessionChanged, onSwitchSession, repository = rendererServices.sessions }) {
  const R = React;
  const [open, setOpen] = R.useState(false), [sessions, setSessions] = R.useState([]), [activeId, setActiveId] = R.useState(null);
  const [panelMounted, setPanelMounted] = R.useState(false);
  const [editingId, setEditingId] = R.useState(null), [draftTitle, setDraftTitle] = R.useState(''), [busy, setBusy] = R.useState(false);
  const [error, setError] = R.useState(null);

  const loadSessions = R.useCallback(async () => {
    try {
      const result = await repository.list();
      setSessions(result.sessions || []);
      setActiveId(result.activeId || null);
    } catch (nextError) { setError(nextError); }
  }, [repository]);

  R.useEffect(() => { loadSessions(); }, [cardId, loadSessions]);
  R.useEffect(() => {
    if (open || !panelMounted) return undefined;
    const timer = setTimeout(() => setPanelMounted(false), 180);
    return () => clearTimeout(timer);
  }, [open, panelMounted]);

  const activate = async (id) => {
    if (id === activeId || busy) return;
    setBusy(true);
    setError(null);
    try {
      if (onSwitchSession) await onSwitchSession(id);
      else {
        await onBeforeSessionChange?.();
        await repository.setActive(id);
        await onSessionChanged?.(id);
      }
      await loadSessions();
      setOpen(false);
    } catch (nextError) {
      setError(nextError);
    } finally {
      setBusy(false);
    }
  };

  const createSession = async (event) => {
    event.stopPropagation();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await onBeforeSessionChange?.();
      const result = await repository.create('新会话');
      await onSessionChanged?.(result.id);
      await loadSessions();
    } catch (nextError) { setError(nextError); }
    finally { setBusy(false); }
  };

  const saveSession = async (event) => {
    event.stopPropagation();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await onBeforeSessionChange?.();
      const snapshot = await repository.loadHistory();
      const currentId = activeId;
      const created = await repository.create('会话存档');
      await repository.saveHistory(snapshot.messages || [], {
          gameState: snapshot.gameState || {},
          retryBaseMessages: snapshot.retryBaseMessages || [],
          retryBaseState: snapshot.retryBaseState || {}
      });
      if (currentId && currentId !== created.id) await repository.setActive(currentId);
      await loadSessions();
    } catch (nextError) { setError(nextError); }
    finally { setBusy(false); }
  };

  const renameSession = async (event, id) => {
    event.stopPropagation();
    const title = draftTitle.trim();
    if (!title) return;
    try {
      await repository.rename(id, title);
      setEditingId(null);
      await loadSessions();
    } catch (nextError) { setError(nextError); }
  };

  const deleteSession = async (event, id) => {
    event.stopPropagation();
    if (busy || (window.confirm && !window.confirm('删除这个会话？'))) return;
    setBusy(true);
    setError(null);
    try {
      await onBeforeSessionChange?.();
      const result = await repository.delete(id);
      await onSessionChanged?.(result.id);
      await loadSessions();
    } catch (nextError) { setError(nextError); }
    finally { setBusy(false); }
  };

  const togglePanel = (event) => {
    event.stopPropagation();
    const nextOpen = !open;
    if (nextOpen) { setPanelMounted(true); loadSessions(); }
    setOpen(nextOpen);
  };
  const renderSession = session => <div key={session.id}
    className={`chat-session-row${session.id === activeId ? ' active' : ''}`}
    data-gc-part="chat-session-row" onClick={event => { event.stopPropagation(); activate(session.id); }}>
    <span className="chat-session-row-state" data-gc-part="chat-session-row-state" aria-hidden="true" />
    <div className="chat-session-row-main" data-gc-part="chat-session-row-main">
      {editingId === session.id ? <input className="chat-session-title-input" value={draftTitle}
        autoFocus onClick={event => event.stopPropagation()}
        onChange={event => setDraftTitle(event.target.value)} onKeyDown={event => {
          if (event.key === 'Enter') renameSession(event, session.id);
          if (event.key === 'Escape') setEditingId(null);
        }} /> : <div className="chat-session-title" data-gc-part="chat-session-title">
        {session.title || session.id}
      </div>}
      <div className="chat-session-preview" data-gc-part="chat-session-preview">
        {session.preview || `${session.messageCount || 0} 条消息`}
      </div>
    </div>
    {editingId === session.id ? <button className="chat-session-action"
      data-gc-part="chat-session-action" onClick={event => renameSession(event, session.id)}
      title="保存会话名" aria-label="保存会话名"><span className="material-icons">check</span></button>
      : <button className="chat-session-action" data-gc-part="chat-session-action"
        onClick={event => { event.stopPropagation(); setEditingId(session.id); setDraftTitle(session.title || session.id); }}
        title="重命名会话" aria-label="重命名会话"><span className="material-icons">edit</span></button>}
    <button className="chat-session-action danger" data-gc-part="chat-session-action"
      onClick={event => deleteSession(event, session.id)} title="删除会话" aria-label="删除会话">
      <span className="material-icons">delete</span>
    </button>
  </div>;

  return <div className="chat-session-manager" data-gc-part="chat-session-manager"
    title={error?.message || ''}>
    <button className="chat-session-btn" data-gc-part="chat-session-button" onClick={togglePanel}
      title="管理聊天会话" aria-label="管理聊天会话" aria-expanded={open}
      aria-controls="chat-session-panel"><span className="material-icons">inventory_2</span></button>
    {panelMounted ? <div id="chat-session-panel" className="chat-session-panel"
      data-gc-part="chat-session-panel" data-state={open ? 'open' : 'closing'} aria-hidden={!open}
      onClick={event => event.stopPropagation()}>
      <div className="chat-session-panel-head" data-gc-part="chat-session-panel-head">
        <span className="chat-session-panel-title">会话</span>
        <div className="chat-session-head-actions">
          <button className="chat-session-text-action" onClick={saveSession} disabled={busy}
            title="保存当前会话" aria-label="保存当前会话">
            <span className="material-icons">save</span><span>存档</span>
          </button>
          <button className="chat-session-text-action" onClick={createSession} disabled={busy}
            title="新建会话" aria-label="新建会话">
            <span className="material-icons">add</span><span>新建</span>
          </button>
        </div>
      </div>
      {error ? <div className="chat-session-error" role="alert">{error.message}</div> : null}
      <div className="chat-session-list" data-gc-part="chat-session-list">
        {sessions.map(renderSession)}
      </div>
    </div> : null}
  </div>;
}

ChatSessionManager.propTypes = {
  cardId: PropTypes.string,
  onBeforeSessionChange: PropTypes.func,
  onSessionChanged: PropTypes.func,
  onSwitchSession: PropTypes.func,
  repository: sessionRepository
};

export default ChatSessionManager;
