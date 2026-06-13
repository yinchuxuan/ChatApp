const path = require('path');
const { resolveContent } = require('../../src/gameCard/contentResolver');

describe('game card file_section_by_state content source', () => {
  const baseDir = path.resolve('/game-card');
  const fakeFs = {
    readFileSync: jest.fn((filePath) => {
      if (filePath === path.join(baseDir, 'plot_guides.md')) {
        return '# Guides\n## FreePlot1\nfree guide\n## FixedPlot1\nfixed guide';
      }
      throw new Error('missing fixture');
    })
  };

  beforeEach(() => fakeFs.readFileSync.mockClear());

  test('uses a state string as the section heading', () => {
    const result = resolveContent(
      '{{file_section_by_state:plot_guides.md##temp.PlotType}}',
      {},
      { baseDir, fs: fakeFs, path, state: { temp: { PlotType: 'FixedPlot1' } } }
    );

    expect(result).toBe('fixed guide');
    expect(fakeFs.readFileSync).toHaveBeenCalledWith(path.join(baseDir, 'plot_guides.md'), 'utf-8');
  });

  test('reports missing or non-string heading state clearly', () => {
    expect(() => resolveContent(
      '{{file_section_by_state:plot_guides.md##temp.PlotType}}',
      {},
      { baseDir, fs: fakeFs, path, state: { temp: {} } }
    )).toThrow('file_section_by_state state not found: temp.PlotType');
    expect(() => resolveContent(
      '{{file_section_by_state:plot_guides.md##temp.PlotType}}',
      {},
      { baseDir, fs: fakeFs, path, state: { temp: { PlotType: 1 } } }
    )).toThrow('file_section_by_state requires string state: temp.PlotType');
  });
});
