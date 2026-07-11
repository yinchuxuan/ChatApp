const path = require('path');
const { getCardPath, isSafeGameCardId } = require('./gameCardStorage');

const DEFAULT_SESSION_ID = 'default';

async function getActiveCardId(store, gameCardsDir) {
  const active = await store.readJson(path.join(gameCardsDir, 'active.json'), null);
  return active && isSafeGameCardId(active.id) ? active.id : null;
}

async function getSessionRoot(store, gameCardsDir) {
  const cardsDir = path.join(gameCardsDir, 'cards');
  const activeId = await getActiveCardId(store, gameCardsDir);
  if (activeId && await store.exists(getCardPath(cardsDir, activeId))) {
    return path.join(cardsDir, activeId, 'sessions');
  }
  return path.join(gameCardsDir, 'no-card', 'sessions');
}

async function readActiveSessionId(store, sessionRoot) {
  const active = await store.readJson(path.join(sessionRoot, 'active.json'), null);
  return active && isSafeGameCardId(active.id) ? active.id : DEFAULT_SESSION_ID;
}

async function getActiveSessionContext(store, gameCardsDir) {
  const sessionRoot = await getSessionRoot(store, gameCardsDir);
  const id = await readActiveSessionId(store, sessionRoot);
  const sessionDir = path.join(sessionRoot, id);
  return {
    id,
    sessionRoot,
    sessionDir,
    messagesPath: path.join(sessionDir, 'messages.json'),
    retryBasePath: path.join(sessionDir, 'retry-base.json')
  };
}

async function readIndex(store, sessionRoot) {
  const index = await store.readJson(path.join(sessionRoot, 'index.json'), { sessions: [] });
  return Array.isArray(index?.sessions) ? index : { sessions: [] };
}

async function writeIndex(store, sessionRoot, index) {
  const sorted = index.sessions.slice().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  await store.writeJson(path.join(sessionRoot, 'index.json'), { sessions: sorted });
}

async function ensureSessionFiles(store, context) {
  if (!(await store.exists(context.messagesPath))) {
    await store.writeJson(context.messagesPath, { messages: [], gameState: {} });
  }
  if (!(await store.exists(context.retryBasePath))) {
    await store.writeJson(context.retryBasePath, { messages: [], gameState: {} });
  }
  const activePath = path.join(context.sessionRoot, 'active.json');
  if (!(await store.exists(activePath))) await store.writeJson(activePath, { id: context.id });
}

async function ensureSession(store, gameCardsDir, id = DEFAULT_SESSION_ID, title = '默认会话') {
  if (!isSafeGameCardId(id)) throw new Error('Invalid chat session id');
  const sessionRoot = await getSessionRoot(store, gameCardsDir);
  const context = {
    id,
    sessionRoot,
    sessionDir: path.join(sessionRoot, id),
    messagesPath: path.join(sessionRoot, id, 'messages.json'),
    retryBasePath: path.join(sessionRoot, id, 'retry-base.json')
  };
  await ensureSessionFiles(store, context);
  const index = await readIndex(store, sessionRoot);
  if (!index.sessions.some(session => session.id === id)) {
    const now = new Date().toISOString();
    index.sessions.push({ id, title, createdAt: now, updatedAt: now, messageCount: 0, preview: '' });
    await writeIndex(store, sessionRoot, index);
  }
  await store.writeJson(path.join(sessionRoot, 'active.json'), { id });
  return { id, title };
}

async function listSessions(store, gameCardsDir) {
  const sessionRoot = await getSessionRoot(store, gameCardsDir);
  await ensureSession(store, gameCardsDir, await readActiveSessionId(store, sessionRoot));
  return {
    sessions: (await readIndex(store, sessionRoot)).sessions,
    activeId: await readActiveSessionId(store, sessionRoot)
  };
}

async function createSession(store, gameCardsDir, title = '新会话') {
  const sessionRoot = await getSessionRoot(store, gameCardsDir);
  const base = `session-${Date.now()}`;
  let id = base;
  let count = 1;
  while (await store.exists(path.join(sessionRoot, id))) id = `${base}-${count++}`;
  await ensureSession(store, gameCardsDir, id, String(title || '新会话').slice(0, 60));
  return { id };
}

async function setActiveSession(store, gameCardsDir, id) {
  if (!isSafeGameCardId(id)) throw new Error('Invalid chat session id');
  const sessionRoot = await getSessionRoot(store, gameCardsDir);
  const index = await readIndex(store, sessionRoot);
  if (!index.sessions.some(session => session.id === id)) throw new Error('Chat session not found');
  await store.writeJson(path.join(sessionRoot, 'active.json'), { id });
  return { id };
}

async function renameSession(store, gameCardsDir, id, title) {
  const sessionRoot = await getSessionRoot(store, gameCardsDir);
  const index = await readIndex(store, sessionRoot);
  const session = index.sessions.find(item => item.id === id);
  if (!session) throw new Error('Chat session not found');
  session.title = String(title || '').trim().slice(0, 60) || session.title;
  await writeIndex(store, sessionRoot, index);
  return session;
}

async function deleteSession(store, gameCardsDir, id) {
  if (!isSafeGameCardId(id)) throw new Error('Invalid chat session id');
  const sessionRoot = await getSessionRoot(store, gameCardsDir);
  const index = await readIndex(store, sessionRoot);
  index.sessions = index.sessions.filter(session => session.id !== id);
  await store.io.rm(path.join(sessionRoot, id), { recursive: true, force: true });
  if (index.sessions.length === 0) return ensureSession(store, gameCardsDir);
  await writeIndex(store, sessionRoot, index);
  const activeId = await readActiveSessionId(store, sessionRoot);
  if (activeId === id) await store.writeJson(path.join(sessionRoot, 'active.json'), { id: index.sessions[0].id });
  return { id: await readActiveSessionId(store, sessionRoot) };
}

function sessionPreview(messages) {
  const msg = messages.slice().reverse().find(item => ['user', 'assistant'].includes(item.role));
  const content = typeof msg?.content === 'string' ? msg.content.trim().replace(/\s+/g, ' ') : '';
  return content.slice(0, 80);
}

async function updateSessionMeta(store, context, messages) {
  const index = await readIndex(store, context.sessionRoot);
  let session = index.sessions.find(item => item.id === context.id);
  if (!session) {
    const now = new Date().toISOString();
    session = { id: context.id, title: '默认会话', createdAt: now, updatedAt: now };
    index.sessions.push(session);
  }
  session.updatedAt = new Date().toISOString();
  session.messageCount = messages.length;
  session.preview = sessionPreview(messages);
  await writeIndex(store, context.sessionRoot, index);
}

module.exports = {
  createSession,
  deleteSession,
  ensureSession,
  ensureSessionFiles,
  getActiveSessionContext,
  getSessionRoot,
  listSessions,
  renameSession,
  setActiveSession,
  updateSessionMeta
};
