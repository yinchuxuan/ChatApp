const { resolveContent } = require('../../src/gameCard/contentResolver');
const { applyGameCard } = require('../../src/gameCard/engine');

function createCard(content, files) {
  return {
    version: '1',
    id: 'content-card',
    name: 'Content Card',
    files,
    rules: [{
      when: { phase: 'pre_send' },
      then: [{ type: 'insert', predicate: { index: 0 }, anchor: 'before', role: 'system', content }]
    }]
  };
}

describe('game card content descriptors', () => {
  test('keeps plain content and legacy original_content replacement working', () => {
    expect(resolveContent('plain text')).toBe('plain text');
    expect(resolveContent('fixed {{original_content}}', { content: 'raw' })).toBe('fixed raw');
    expect(resolveContent(null, { content: 'raw' })).toBe('');
  });

  test('resolves template text original content transforms and suffixes', () => {
    const content = '【回复】{{original_content}}.regex_replace{pattern:\'^```json\\\\n\',with:\'\'}\\done';

    expect(resolveContent(content, { content: '```json\n{"hp":10}' })).toBe('【回复】{"hp":10}\\done');
  });

  test('resolves sources anywhere in template text', () => {
    expect(resolveContent('a {{original_content}} b', { content: 'raw' })).toBe('a raw b');
  });

  test('applies chained regex transforms before concatenation', () => {
    const content = [
      '{{original_content}}',
      '.regex_replace{pattern:\'^```json\\\\n\',with:\'\'}',
      '.regex_replace{pattern:\'\\\\n```$\',with:\'\'}',
      ' done'
    ].join('');

    expect(resolveContent(content, { content: '```json\n{"hp":10}\n```' })).toBe('{"hp":10} done');
  });

  test('passes regex flags to replacements', () => {
    const result = resolveContent(
      '{{original_content}}.regex_replace{pattern:\'quest\',with:\'task\',flags:\'gi\'}',
      { content: 'Quest quest QUEST' }
    );

    expect(result).toBe('task task task');
  });

  test('extracts regex groups from original content', () => {
    const result = resolveContent(
      '{{original_content}}.regex_extract{pattern:\'hp=(\\\\d+)\',group:1}',
      { content: 'hp=42 mp=7' }
    );

    expect(result).toBe('42');
  });

  test('returns an empty string when regex extraction misses', () => {
    const result = resolveContent(
      '{{original_content}}.regex_extract{pattern:\'hp=(\\\\d+)\',group:1}',
      { content: 'mp=7' }
    );

    expect(result).toBe('');
  });

  test('uses an empty original content value for insert actions', () => {
    const result = applyGameCard({
      card: createCard('prefix{{original_content}}'),
      phase: 'pre_send',
      messages: [{ role: 'user', content: 'start' }]
    });

    expect(result.messages[0]).toEqual({ role: 'system', content: 'prefix' });
  });

  test('reads declared file content by id', () => {
    const result = applyGameCard({
      card: createCard('{{file:rules}}', { rules: 'worldbook/rules.md' }),
      phase: 'pre_send',
      messages: [{ role: 'user', content: 'start' }],
      fileContents: { 'worldbook/rules.md': '# Rules\nStay in scene.' }
    });

    expect(result.messages[0]).toEqual({ role: 'system', content: '# Rules\nStay in scene.' });
    expect(result.trace.errors).toEqual([]);
  });

  test('transforms file content before concatenating it', () => {
    const result = applyGameCard({
      card: createCard('{{file:rules}}.regex_replace{pattern:\'^#.*\\\\n\',with:\'\'}', { rules: 'worldbook/rules.md' }),
      phase: 'pre_send',
      messages: [{ role: 'user', content: 'start' }],
      fileContents: { 'worldbook/rules.md': '# Rules\nStay in scene.' }
    });

    expect(result.messages[0]).toEqual({ role: 'system', content: 'Stay in scene.' });
  });

  test('reads scalar state values from content descriptors', () => {
    const result = resolveContent(
      'hp={{state:player.hp}}, alive={{state:player.alive}}',
      {},
      { state: { player: { hp: 80, alive: true } } }
    );

    expect(result).toBe('hp=80, alive=true');
  });

  test('renders object and array state values as JSON', () => {
    const state = { memory: { lastScene: 'station', flags: ['met'] }, inventory: ['ticket', 'key'] };

    expect(resolveContent('{{state_json:memory}}', {}, { state })).toBe(JSON.stringify(state.memory));
    expect(resolveContent('{{state_json:inventory}}', {}, { state })).toBe(JSON.stringify(state.inventory));
  });

  test('renders missing state paths as empty strings', () => {
    expect(resolveContent('{{state:player.mp}}', {}, { state: { player: { hp: 80 } } })).toBe('');
    expect(resolveContent('{{state_json:memory}}', {}, { state: { player: { hp: 80 } } })).toBe('');
  });

  test('uses game state when resolving card action content', () => {
    const result = applyGameCard({
      card: createCard('route={{state:route}}'),
      phase: 'pre_send',
      messages: [{ role: 'user', content: 'start' }],
      state: { route: 'setsuna' }
    });

    expect(result.messages[0]).toEqual({ role: 'system', content: 'route=setsuna' });
  });

  test('reports malformed and unsupported descriptor expressions', () => {
    expect(() => resolveContent('{{state:open')).toThrow('content source is not closed');
    expect(() => resolveContent('{{unknown:value}}')).toThrow('unsupported content source');
    expect(() => resolveContent('{{original_content}}.unknown{}')).toThrow('unsupported content transform');
  });
});
