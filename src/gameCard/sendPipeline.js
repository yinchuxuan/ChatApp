import { expandCardImports } from './cardImportExpander.js';
import { applyGameCard } from './engine.js';
import { adaptMessagesToProtocol } from './protocolAdapter.js';
import { collectExecSourcePaths, collectFileContentPaths, extractExecIncludes, resolveExecIncludePath } from './resourcePreload.js';
import { ensureStateDefaults } from './stateSchema.js';
import { loadExternalStateSchema } from './stateSchemaLoader.js';
import { applyLatestAssistantStatePatch } from './statePatch.js';
import { decayTTL } from './ttl.js';

function extractActiveCard(result) {
  if (!result || result.success === false) return null;
  if (result.rules) return result;
  return result.card || result.gameCard || result.activeGameCard || null;
}

async function loadActiveGameCard(platform) {
  if (typeof platform?.repository?.getActiveCard !== 'function') return null;
  try {
    return extractActiveCard(await platform.repository.getActiveCard());
  } catch (_) {
    return null;
  }
}

async function loadFileContents(card, resources) {
  if (!card?.id) return {};
  const contentPaths = collectFileContentPaths(card);
  const execPaths = collectExecSourcePaths(card);
  if (contentPaths.length === 0 && execPaths.length === 0) return {};
  if (typeof resources?.readText !== 'function') throw new Error('game card files require resources.readText');
  const fileContents = {};
  async function read(filePath) {
    if (Object.prototype.hasOwnProperty.call(fileContents, filePath)) return fileContents[filePath];
    fileContents[filePath] = await resources.readText(card.id, filePath) || '';
    return fileContents[filePath];
  }
  await Promise.all(contentPaths.map(read));
  const queue = [...execPaths];
  for (let i = 0; i < queue.length; i += 1) {
    const source = await read(queue[i]);
    extractExecIncludes(source).forEach((filePath) => {
      const resolvedPath = resolveExecIncludePath(queue[i], filePath);
      if (!queue.includes(resolvedPath)) queue.push(resolvedPath);
    });
  }
  return fileContents;
}

async function loadCardResources(card, platform) {
  const resources = platform?.resources;
  const expandedCard = await expandCardImports(card, resources);
  const cardWithSchema = await loadExternalStateSchema(expandedCard, resources);
  return {
    card: cardWithSchema,
    fileContents: await loadFileContents(cardWithSchema, resources)
  };
}

function runtimeDependencies(platform) {
  return platform?.scriptExecutor ? { scriptExecutor: platform.scriptExecutor } : {};
}

function prepareState(card, state) {
  const schema = card?.state?.schema;
  if (!schema) {
    return { state, trace: { changed: false, changedKeys: [], errors: [] } };
  }
  const result = ensureStateDefaults(schema, state);
  return {
    state: result.state,
    trace: {
      changed: result.changed,
      changedKeys: result.changedKeys,
      errors: result.errors
    }
  };
}

async function preparePreSendMessages({ messages = [], state = {}, event = {}, card, protocol = 'openai', platform } = {}) {
  const activeCard = card === undefined ? await loadActiveGameCard(platform) : card;

  if (!activeCard) {
    return { messages, state, trace: null, ttlTrace: null, applied: false, card: null };
  }

  let resources;
  try {
    resources = await loadCardResources(activeCard, platform);
  } catch (error) {
    return { messages, state, trace: null, ttlTrace: null, stateTrace: null, applied: false, card: null, error: error.message };
  }
  const prepared = prepareState(resources.card, state);
  const ttl = decayTTL(messages);
  const result = applyGameCard({ card: resources.card, phase: 'pre_send', messages: ttl.messages, state: prepared.state, event, fileContents: resources.fileContents, dependencies: runtimeDependencies(platform) });
  return {
    ...result,
    ...(result.trace.errors.length ? { error: result.trace.errors.join('\n') } : {}),
    ttlTrace: ttl.trace,
    stateTrace: prepared.trace,
    applied: true,
    card: resources.card,
    protocol
  };
}

async function prepareAfterResponseMessages({ messages = [], state = {}, event = {}, card, platform } = {}) {
  const activeCard = card === undefined ? await loadActiveGameCard(platform) : card;

  if (!activeCard) {
    return { messages, state, trace: null, ttlTrace: null, applied: false, card: null };
  }

  let resources;
  try {
    resources = await loadCardResources(activeCard, platform);
  } catch (error) {
    return { messages, state, trace: null, ttlTrace: null, stateTrace: null, applied: false, card: null, error: error.message };
  }
  const prepared = prepareState(resources.card, state);
  const result = applyGameCard({ card: resources.card, phase: 'after_response', messages, state: prepared.state, event, fileContents: resources.fileContents, dependencies: runtimeDependencies(platform) });
  const patched = applyLatestAssistantStatePatch(result.messages, result.state, {
    messages: result.messages,
    schema: resources.card?.state?.schema
  });
  return {
    ...result,
    state: patched.state,
    ttlTrace: null,
    stateTrace: prepared.trace,
    statePatchTrace: patched.trace,
    applied: true,
    card: resources.card
  };
}

function hasMessageChanges(before, after) {
  return JSON.stringify(before) !== JSON.stringify(after);
}

async function prepareInitMessages({ messages = [], state = {}, event = {}, card, platform } = {}) {
  const activeCard = card === undefined ? await loadActiveGameCard(platform) : card;

  if (!activeCard) {
    return { messages, state, trace: null, ttlTrace: null, applied: false, changed: false, card: activeCard || null };
  }

  if (messages.length > 0) {
    try {
      const expandedCard = await expandCardImports(activeCard, platform?.resources);
      const cardWithSchema = await loadExternalStateSchema(expandedCard, platform?.resources);
      const prepared = prepareState(cardWithSchema, state);
      return {
        messages,
        state: prepared.state,
        trace: null,
        ttlTrace: null,
        stateTrace: prepared.trace,
        applied: false,
        changed: prepared.trace.changed,
        card: cardWithSchema
      };
    } catch (error) {
      return { messages, state, trace: null, ttlTrace: null, stateTrace: null, applied: false, changed: false, card: null, error: error.message };
    }
  }

  let resources;
  try {
    resources = await loadCardResources(activeCard, platform);
  } catch (error) {
    return { messages, state, trace: null, ttlTrace: null, stateTrace: null, applied: false, changed: false, card: null, error: error.message };
  }
  const prepared = prepareState(resources.card, state);

  const result = applyGameCard({ card: resources.card, phase: 'init', messages, state: prepared.state, event, fileContents: resources.fileContents, dependencies: runtimeDependencies(platform) });
  const changed = hasMessageChanges(messages, result.messages) || prepared.trace.changed;
  return { ...result, ttlTrace: null, stateTrace: prepared.trace, applied: true, changed, card: resources.card };
}

function toApiMessages(messages) {
  return adaptMessagesToProtocol(messages, 'openai').messages;
}

export {
  adaptMessagesToProtocol,
  extractActiveCard,
  loadActiveGameCard,
  loadCardResources,
  prepareAfterResponseMessages,
  prepareInitMessages,
  preparePreSendMessages,
  prepareState,
  toApiMessages
};
