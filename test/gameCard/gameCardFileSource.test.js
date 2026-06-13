const { resolveContent } = require('../../src/gameCard/contentResolver');
const { validateGameCard } = require('../../src/gameCard/validateGameCard');

function cardWithFiles(files) {
  return {
    version: '1',
    id: 'file-card',
    name: 'File Card',
    content: { files },
    rules: [{ when: { phase: 'pre_send' }, then: [{ type: 'insert', role: 'system', content: 'x' }] }]
  };
}

describe('game card file content source', () => {
  const card = cardWithFiles({
    plot1: 'chapters/chapter-1/plot.md',
    plot2: 'chapters/chapter-2/plot.md'
  });
  const fileContents = {
    'chapters/chapter-1/plot.md': '# Intro\nchapter one\n## FixedPlot1\nfixed one',
    'chapters/chapter-2/plot.md': '# Intro\nchapter two\n## C2Intro\nfixed two'
  };

  test('reads a declared content file by id', () => {
    expect(resolveContent('{{file:plot1}}', {}, { card, fileContents }))
      .toBe(fileContents['chapters/chapter-1/plot.md']);
  });

  test('reads a unique markdown section from a declared file', () => {
    expect(resolveContent('{{file:plot1#FixedPlot1}}', {}, { card, fileContents }))
      .toBe('fixed one');
  });

  test('resolves file id and section from state', () => {
    const state = { temp: { plotFile: 'plot2', plotSection: 'C2Intro' } };

    expect(resolveContent('{{file:$temp.plotFile#$temp.plotSection}}', {}, { card, fileContents, state }))
      .toBe('fixed two');
  });

  test('rejects unknown file ids and non-string state refs', () => {
    expect(() => resolveContent('{{file:missing}}', {}, { card, fileContents }))
      .toThrow('unknown content file id: missing');
    expect(() => resolveContent('{{file:$temp.plotFile}}', {}, { card, fileContents, state: { temp: { plotFile: 1 } } }))
      .toThrow('file requires string state: temp.plotFile');
  });

  test('requires dynamic section headings to be unique', () => {
    const repeated = {
      ...fileContents,
      'chapters/chapter-1/plot.md': '## Same\none\n# Same\ntwo'
    };

    expect(() => resolveContent('{{file:plot1#Same}}', {}, { card, fileContents: repeated }))
      .toThrow('file section heading is not unique: Same');
  });

  test('validates declared text file paths', () => {
    expect(validateGameCard(card).valid).toBe(true);
    expect(validateGameCard(cardWithFiles({ bad: '../secret.md' })).errors[0])
      .toContain('path must be a safe relative text file');
    expect(validateGameCard(cardWithFiles({ bad: 'images/bg.png' })).errors[0])
      .toContain('path must be a safe relative text file');
  });
});
