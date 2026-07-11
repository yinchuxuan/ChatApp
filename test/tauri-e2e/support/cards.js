function card(id, name, rules = [], extra = {}) {
  return { version: '1.0', id, name, rules, ...extra };
}

function pipelineCard(id = 'pipeline-card') {
  return card(id, 'Pipeline Quest', [
    {
      when: { phase: 'pre_send' },
      then: [
        {
          type: 'insert', predicate: { index: 0 }, anchor: 'before',
          role: 'system', content: 'SYSTEM RULES', ttl: -1,
          _meta: { source: 'game_card', visibility: 'llm_only' }
        },
        {
          type: 'replace', predicate: { index: 'last' },
          content: '[player] {{original_content}}'
        }
      ]
    },
    {
      when: { phase: 'after_response', last: { role: 'assistant' } },
      then: [
        {
          type: 'replace', predicate: { index: 'last' },
          content: "{{original_content}}.regex_replace{pattern:'`',with:'',flags:'g'}"
        },
        {
          type: 'insert', predicate: { index: 'last' }, anchor: 'after',
          role: 'system', content: 'temporary hint', ttl: 2,
          _meta: { source: 'game_card', visibility: 'llm_only' }
        }
      ]
    }
  ]);
}

module.exports = { card, pipelineCard };
