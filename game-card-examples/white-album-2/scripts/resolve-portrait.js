/* eslint-disable no-unused-vars */
/* exported run */

const PORTRAIT_PATH = 'scene.portrait';
const PATCH_PATTERN = /<state_patch>([\s\S]*?)<\/state_patch>/g;

function ensureObject(state, key) {
  if (!state[key] || typeof state[key] !== 'object') state[key] = {};
}

function latestAssistant(messages) {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    if (messages[index] && messages[index].role === 'assistant') return messages[index];
  }
  return null;
}

function portraitResources(config) {
  const visual = config && config.visual;
  return visual && visual.portrait && typeof visual.portrait === 'object'
    ? visual.portrait
    : {};
}

function isValidPortrait(value, resources) {
  return value === 'none' || Object.prototype.hasOwnProperty.call(resources, value);
}

function portraitFromActions(actions, resources, current) {
  const list = Array.isArray(actions) ? actions : [actions];
  return list.reduce((portrait, action) => {
    if (!action || action.type !== 'state.set' || action.path !== PORTRAIT_PATH) return portrait;
    return isValidPortrait(action.value, resources) ? action.value : portrait;
  }, current);
}

function extractPortrait(content, resources) {
  let portrait = 'none';
  for (const match of String(content || '').matchAll(PATCH_PATTERN)) {
    try {
      portrait = portraitFromActions(JSON.parse(match[1]), resources, portrait);
    } catch (_) {
      // Invalid patches are ignored by the platform state patch pipeline as well.
    }
  }
  return portrait;
}

function run(ctx) {
  const assistant = latestAssistant(ctx.messages);
  const portrait = extractPortrait(assistant && assistant.content, portraitResources(ctx.config));
  ensureObject(ctx.state, 'scene');
  ensureObject(ctx.state, 'visual');
  ctx.state.scene.portrait = portrait;
  ctx.state.visual.portrait = portrait;
  return { state: ctx.state };
}
