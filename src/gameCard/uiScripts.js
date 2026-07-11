import { expandCardImports } from './cardImportExpander.js';
import { runExecAction } from './execRunner.js';
import { extractExecIncludes, resolveExecIncludePath } from './execSource.js';
import { loadExternalStateSchema } from './stateSchemaLoader.js';

const SCRIPT_PATH_PATTERN = /^(?![/\\])(?!.*(?:^|[/\\])\.\.(?:[/\\]|$)).+\.js$/i;

function cloneJson(value) {
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value));
}

function isObject(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function fail(reason, state, extra = {}) {
  return {
    applied: false,
    state: cloneJson(state || {}),
    trace: { type: 'game.script.run', applied: false, reason, changedKeys: [], ...extra }
  };
}

function normalizeScriptPath(filePath) {
  if (typeof filePath !== 'string' || !SCRIPT_PATH_PATTERN.test(filePath)) return '';
  return filePath.split('/').filter((part) => part && part !== '.').join('/');
}

function resolveScriptSourceFile(event, card) {
  if (typeof event?.sourceFile === 'string') return event.sourceFile;
  const script = event?.name && (card?.ui?.scripts?.[event.name] || card?.scripts?.[event.name]);
  if (typeof script === 'string') return script;
  if (isObject(script) && typeof script.sourceFile === 'string') return script.sourceFile;
  return '';
}

function normalizeUiScriptRunEvent(event, card = null) {
  if (event?.type !== 'game.script.run') return { ok: false, reason: 'unsupported_event' };
  const sourceFile = normalizeScriptPath(resolveScriptSourceFile(event, card));
  if (!sourceFile) return { ok: false, reason: 'invalid_source_file' };
  return {
    ok: true,
    sourceFile,
    payload: cloneJson(event.payload || {}),
    name: typeof event.name === 'string' ? event.name : ''
  };
}

async function readCardScript(cardId, filePath, resources) {
  if (!cardId || typeof resources?.readText !== 'function') {
    throw new Error('game.script.run requires resources.readText');
  }
  return resources.readText(cardId, filePath);
}

async function loadScriptFileContents(cardId, sourceFile, resources, fileContents = {}, stack = []) {
  const normalizedPath = normalizeScriptPath(sourceFile);
  if (!normalizedPath) throw new Error('invalid script sourceFile');
  if (stack.includes(normalizedPath)) throw new Error(`circular exec include: ${normalizedPath}`);
  if (stack.length > 20) throw new Error('exec include depth exceeded');
  if (Object.prototype.hasOwnProperty.call(fileContents, normalizedPath)) return fileContents;

  const source = await readCardScript(cardId, normalizedPath, resources);
  fileContents[normalizedPath] = source;
  const includes = extractExecIncludes(source).map((includePath) => {
    return resolveExecIncludePath(normalizedPath, includePath);
  });
  for (const includePath of includes) {
    await loadScriptFileContents(cardId, includePath, resources, fileContents, [...stack, normalizedPath]);
  }
  return fileContents;
}

async function loadRuntimeCard(card, resources) {
  if (!card) return null;
  const expandedCard = await expandCardImports(card, resources);
  return loadExternalStateSchema(expandedCard, resources);
}

async function loadDeclaredFiles(card, resources, fileContents) {
  const paths = Object.values(card?.files || {});
  await Promise.all(paths.map(async (filePath) => {
    if (!Object.prototype.hasOwnProperty.call(fileContents, filePath)) {
      fileContents[filePath] = await resources.readText(card.id, filePath);
    }
  }));
  return fileContents;
}

async function applyUiScriptRunEvent({ event, state = {}, messages = [], card = null, platform = null } = {}) {
  const normalized = normalizeUiScriptRunEvent(event, card);
  if (!normalized.ok) return fail(normalized.reason, state);

  try {
    const runtimeCard = await loadRuntimeCard(card, platform?.resources);
    const fileContents = await loadScriptFileContents(card?.id, normalized.sourceFile, platform?.resources);
    await loadDeclaredFiles(runtimeCard, platform?.resources, fileContents);
    const result = await runExecAction(messages, state, { type: 'exec', sourceFile: normalized.sourceFile }, {
      card: runtimeCard,
      event: { type: 'game.script.run', name: normalized.name, sourceFile: normalized.sourceFile, payload: normalized.payload },
      fileContents,
      scriptExecutor: platform?.scriptExecutor
    });
    if (JSON.stringify(result.messages) !== JSON.stringify(messages)) return fail('messages_not_supported', state);
    const changedKeys = result.trace?.summary?.state?.changedKeys || [];
    return {
      applied: result.trace?.applied || changedKeys.length > 0,
      state: result.state,
      card: runtimeCard,
      trace: { type: 'game.script.run', applied: true, sourceFile: normalized.sourceFile, changedKeys, exec: result.trace }
    };
  } catch (error) {
    return fail('script_failed', state, { error: error.message });
  }
}

export { applyUiScriptRunEvent, loadScriptFileContents, normalizeUiScriptRunEvent };
