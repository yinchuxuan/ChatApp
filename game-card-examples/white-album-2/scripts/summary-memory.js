/* eslint-disable no-unused-vars */
/* exported run */

const PRIORITIES = ['anchor', 'current_event', 'recent'];
const RECENT_LIMIT = 20;
const EMPTY_CURRENT = '无当前事项。';

function normalizeText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function normalizeKnownBy(value) {
  const names = String(value || '').split(/[,，、]/).map(normalizeText).filter(Boolean);
  return [...new Set(names)];
}

function parseItems(content) {
  const summary = String(content || '').match(/<summary>([\s\S]*?)<\/summary>/);
  if (!summary) return [];
  const items = [];
  const pattern = /<item\b([^>]*)>([\s\S]*?)<\/item>/g;
  let match;
  while ((match = pattern.exec(summary[1])) !== null) {
    const attributes = {};
    const attributePattern = /([a-z_]+)\s*=\s*"([^"]*)"/g;
    let attribute;
    while ((attribute = attributePattern.exec(match[1])) !== null) {
      attributes[attribute[1]] = attribute[2];
    }
    const priority = attributes.priority;
    const knownBy = normalizeKnownBy(attributes.known_by);
    const text = normalizeText(match[2]);
    if (PRIORITIES.includes(priority) && knownBy.length > 0 && text) {
      items.push({ priority, knownBy, text });
    }
  }
  return items;
}

function normalizeItem(item) {
  return {
    knownBy: normalizeKnownBy(item && item.knownBy),
    text: normalizeText(item && item.text)
  };
}

function normalizeMemory(value) {
  const memory = value && typeof value === 'object' ? value : {};
  return {
    version: 2,
    anchor: Array.isArray(memory.anchor) ? memory.anchor.map(normalizeItem) : [],
    currentEvents: Array.isArray(memory.currentEvents)
      ? memory.currentEvents.map(normalizeItem) : [],
    recent: Array.isArray(memory.recent) ? memory.recent.map(normalizeItem) : [],
    turn: Number.isInteger(memory.turn) ? memory.turn : 0
  };
}

function itemKey(item) {
  return `${item.knownBy.join('|')}\n${item.text}`;
}

function appendUnique(target, additions) {
  const seen = new Set(target.map(itemKey));
  additions.forEach((item) => {
    const normalized = normalizeItem(item);
    const key = itemKey(normalized);
    if (!seen.has(key)) {
      target.push(normalized);
      seen.add(key);
    }
  });
}

function mergeItems(memory, items) {
  memory.turn += 1;
  appendUnique(memory.anchor, items.filter(item => item.priority === 'anchor'));
  const current = items.filter(item => item.priority === 'current_event');
  if (current.length > 0) {
    memory.currentEvents = current.some(item => item.text === EMPTY_CURRENT)
      ? [] : current.map(normalizeItem);
  }
  appendUnique(memory.recent, items.filter(item => item.priority === 'recent'));
  memory.recent = memory.recent.slice(-RECENT_LIMIT);
}

function audienceLabel(knownBy) {
  return knownBy.includes('公开') ? '[公开]' : `[知情：${knownBy.join('、')}]`;
}

function renderItems(items) {
  return items.length > 0
    ? items.map(item => `- ${audienceLabel(item.knownBy)} ${item.text}`).join('\n')
    : '暂无。';
}

function renderMemory(memory) {
  return [
    '# 历史记忆',
    '',
    '只有“知情”列表中的人物可以在对白、判断和行动中使用对应信息；未列出的人物默认不知道，“公开”表示所有相关人物均可知道。',
    '',
    '## 剧情锚点',
    renderItems(memory.anchor),
    '',
    '## 当前事项',
    '以下是上一轮结束时仍有效的完整事项。回复结束时必须重新输出仍有效的全部 current_event。',
    renderItems(memory.currentEvents),
    '',
    '## 近期事件',
    renderItems(memory.recent)
  ].join('\n');
}

function run(ctx) {
  const messages = ctx.messages || [];
  const state = ctx.state || {};
  const memory = normalizeMemory(state.memory && state.memory.summary);

  const assistant = [...messages].reverse().find(message => message.role === 'assistant');
  const items = parseItems(assistant && assistant.content);
  if (items.length > 0) mergeItems(memory, items);

  const nextMessages = messages.map((message) => {
    if (!message._meta || message._meta.source !== 'wa2_summary') return message;
    return { ...message, content: renderMemory(memory) };
  });
  state.memory = { ...(state.memory || {}), summary: memory };
  return { messages: nextMessages, state };
}
