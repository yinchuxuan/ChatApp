const path = require('path');
const { getCardPath, isSafeGameCardId, readJsonFile, writeJsonFile } = require('./gameCardStorage');

const DEFAULT_SESSION_ID = 'default';

function getActiveCardId(fs, gameCardsDir) {
  const activePath = path.join(gameCardsDir, 'active.json');
  const active = readJsonFile(fs, activePath, null);
  return active && isSafeGameCardId(active.id) ? active.id : null;
}

function getSessionRoot(fs, gameCardsDir) {
  const cardsDir = path.join(gameCardsDir, 'cards');
  const activeId = getActiveCardId(fs, gameCardsDir);
  if (activeId && fs.existsSync(getCardPath(cardsDir, activeId))) {
    return path.join(cardsDir, activeId, 'sessions');
  }
  return path.join(gameCardsDir, 'no-card', 'sessions');
}

function readActiveSessionId(fs, sessionRoot) {
  const active = readJsonFile(fs, path.join(sessionRoot, 'active.json'), null);
  return active && isSafeGameCardId(active.id) ? active.id : DEFAULT_SESSION_ID;
}

function getSessionDir(fs, gameCardsDir) {
  const sessionRoot = getSessionRoot(fs, gameCardsDir);
  return path.join(sessionRoot, readActiveSessionId(fs, sessionRoot));
}

function getMessagesPath(fs, gameCardsDir) {
  return path.join(getSessionDir(fs, gameCardsDir), 'messages.json');
}

function getRetryBasePath(fs, gameCardsDir) {
  return path.join(getSessionDir(fs, gameCardsDir), 'retry-base.json');
}

function createEmptySessionFiles(fs, sessionDir) {
  writeJsonFile(fs, path.join(sessionDir, 'messages.json'), { messages: [], gameState: {} });
  writeJsonFile(fs, path.join(sessionDir, 'retry-base.json'), { messages: [], gameState: {} });
}

function readIndex(fs, sessionRoot) {
  const index = readJsonFile(fs, path.join(sessionRoot, 'index.json'), { sessions: [] });
  return Array.isArray(index.sessions) ? index : { sessions: [] };
}

function writeIndex(fs, sessionRoot, index) {
  writeJsonFile(fs, path.join(sessionRoot, 'index.json'), {
    sessions: index.sessions.slice().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  });
}

function sessionPreview(messages) {
  const msg = messages.slice().reverse().find(item => ['user', 'assistant'].includes(item.role));
  const content = typeof msg?.content === 'string' ? msg.content.trim().replace(/\s+/g, ' ') : '';
  return content.slice(0, 80);
}

function ensureSession(fs, gameCardsDir, id = DEFAULT_SESSION_ID, title = '默认会话') {
  if (!isSafeGameCardId(id)) throw new Error('Invalid chat session id');
  const sessionRoot = getSessionRoot(fs, gameCardsDir);
  const sessionDir = path.join(sessionRoot, id);
  const now = new Date().toISOString();
  if (!fs.existsSync(sessionDir)) createEmptySessionFiles(fs, sessionDir);
  const index = readIndex(fs, sessionRoot);
  if (!index.sessions.some(session => session.id === id)) {
    index.sessions.push({ id, title, createdAt: now, updatedAt: now, messageCount: 0, preview: '' });
    writeIndex(fs, sessionRoot, index);
  }
  writeJsonFile(fs, path.join(sessionRoot, 'active.json'), { id });
  return { id, title };
}

function listSessions(fs, gameCardsDir) {
  const sessionRoot = getSessionRoot(fs, gameCardsDir);
  ensureSession(fs, gameCardsDir, readActiveSessionId(fs, sessionRoot));
  return { sessions: readIndex(fs, sessionRoot).sessions, activeId: readActiveSessionId(fs, sessionRoot) };
}

function nextSessionId(fs, sessionRoot) {
  const base = `session-${Date.now()}`;
  let id = base, count = 1;
  while (fs.existsSync(path.join(sessionRoot, id))) id = `${base}-${count++}`;
  return id;
}

function createSession(fs, gameCardsDir, title = '新会话') {
  const sessionRoot = getSessionRoot(fs, gameCardsDir);
  const id = nextSessionId(fs, sessionRoot);
  ensureSession(fs, gameCardsDir, id, String(title || '新会话').slice(0, 60));
  return { id };
}

function setActiveSession(fs, gameCardsDir, id) {
  if (!isSafeGameCardId(id)) throw new Error('Invalid chat session id');
  const sessionRoot = getSessionRoot(fs, gameCardsDir);
  const index = readIndex(fs, sessionRoot);
  if (!index.sessions.some(session => session.id === id)) throw new Error('Chat session not found');
  writeJsonFile(fs, path.join(sessionRoot, 'active.json'), { id });
  return { id };
}

function renameSession(fs, gameCardsDir, id, title) {
  const sessionRoot = getSessionRoot(fs, gameCardsDir);
  const index = readIndex(fs, sessionRoot);
  const session = index.sessions.find(item => item.id === id);
  if (!session) throw new Error('Chat session not found');
  session.title = String(title || '').trim().slice(0, 60) || session.title;
  writeIndex(fs, sessionRoot, index);
  return session;
}

function deleteSession(fs, gameCardsDir, id) {
  if (!isSafeGameCardId(id)) throw new Error('Invalid chat session id');
  const sessionRoot = getSessionRoot(fs, gameCardsDir);
  const index = readIndex(fs, sessionRoot);
  index.sessions = index.sessions.filter(session => session.id !== id);
  if (fs.existsSync(path.join(sessionRoot, id))) fs.rmSync(path.join(sessionRoot, id), { recursive: true, force: true });
  if (index.sessions.length === 0) return ensureSession(fs, gameCardsDir);
  writeIndex(fs, sessionRoot, index);
  const activeId = readActiveSessionId(fs, sessionRoot);
  if (activeId === id) writeJsonFile(fs, path.join(sessionRoot, 'active.json'), { id: index.sessions[0].id });
  return { id: readActiveSessionId(fs, sessionRoot) };
}

function updateSessionMeta(fs, gameCardsDir, messages) {
  const sessionRoot = getSessionRoot(fs, gameCardsDir);
  const id = readActiveSessionId(fs, sessionRoot);
  let index = readIndex(fs, sessionRoot);
  let session = index.sessions.find(item => item.id === id);
  if (!session) {
    ensureSession(fs, gameCardsDir, id);
    index = readIndex(fs, sessionRoot);
    session = index.sessions.find(item => item.id === id);
  }
  session.updatedAt = new Date().toISOString();
  session.messageCount = messages.length;
  session.preview = sessionPreview(messages);
  writeIndex(fs, sessionRoot, { sessions: index.sessions });
}

module.exports = {
  createSession,
  deleteSession,
  ensureSession,
  getMessagesPath,
  getRetryBasePath,
  listSessions,
  renameSession,
  setActiveSession,
  updateSessionMeta
};
