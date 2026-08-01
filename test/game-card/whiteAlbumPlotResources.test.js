const fs = require('node:fs');
const path = require('node:path');

const cardDir = path.join(__dirname, '../../game-card-examples/white-album-2');
const visual = require('../../game-card-examples/white-album-2/visual.json');
const audio = require('../../game-card-examples/white-album-2/audio.json');

const plotResources = [
  ['plot/chapter-1.md', 'FixedPlot1', null, 'WA_piano'],
  ['plot/chapter-1.md', 'FixedPlot2', 'invite', null],
  ['plot/chapter-1.md', 'FixedPlot3', 'haiku', null],
  ['plot/chapter-1.md', 'FixedPlot4', 'rooftop', 'WA_3'],
  ['plot/chapter-2.md', 'FixedPlot1', 'rooftop2', 'dream'],
  ['plot/chapter-2.md', 'FixedPlot2', 'park', 'snow_scene'],
  ['plot/chapter-2.md', 'FixedPlot2Low', 'park', 'snow_scene'],
  ['plot/chapter-2.md', 'FixedPlot3', 'ktv', 'bad_woman'],
  ['plot/chapter-2.md', 'FixedPlot4', 'touma_hand', 'after_all_piano'],
  ['plot/chapter-2.md', 'FixedPlot5', 'home_party', 'winter_night'],
  ['plot/chapter-2.md', 'FixedPlot6', 'agreement', 'things'],
  ['plot/chapter-2.md', 'GameEnd1', 'GameEnd1', 'unstoppable_dream']
];

function readCardFile(relativePath) {
  return fs.readFileSync(path.join(cardDir, relativePath), 'utf-8');
}

function readSection(markdown, heading) {
  const marker = `## ${heading}\n`;
  const start = markdown.indexOf(marker);
  const bodyStart = start + marker.length;
  const end = markdown.indexOf('\n## ', bodyStart);
  return markdown.slice(bodyStart, end === -1 ? markdown.length : end);
}

describe('white album fixed plot presentation resources', () => {
  test.each(plotResources)('%s#%s declares valid local resources', (file, sectionName, scene, bgm) => {
    const section = readSection(readCardFile(file), sectionName);

    expect(section).toContain('### 本节点特殊演出资源');
    if (scene) {
      expect(section).toContain(`visual.scene: \`${scene}\``);
      expect(visual.cg[scene]).toBeDefined();
    } else {
      expect(section).not.toContain('visual.scene:');
    }
    if (bgm) {
      expect(section).toContain(`audio.bgm: \`${bgm}\``);
      expect(audio.bgm[bgm]).toBeDefined();
    } else {
      expect(section).not.toContain('audio.bgm:');
    }
  });

  test('timeline code does not own presentation resource hints', () => {
    const timeline = [
      readCardFile('scripts/timeline.js'),
      readCardFile('scripts/timelines/chapter-1.js'),
      readCardFile('scripts/timelines/chapter-2.js'),
      readCardFile('rules/tail-timeline-guide.json')
    ].join('\n');

    expect(timeline).not.toMatch(/nodeBackground|nodeBgm/);
    expect(timeline).not.toMatch(/background:|bgm:/);
    expect(timeline).not.toContain('## 本节点演出资源');
  });
});
