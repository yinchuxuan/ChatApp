const fs = require('node:fs');
const path = require('node:path');

const cardDir = path.join(__dirname, '../../game-card-examples/white-album-2');
const visual = require('../../game-card-examples/white-album-2/visual.json');
const scenes = [
  'apartment', 'classroom', 'corridor', 'musical_classroom3', 'school',
  'setsuna_room', 'stairs', 'street', 'subway_station'
];
const times = ['morning', 'afternoon', 'night'];
const timedBackgrounds = scenes.flatMap(scene => times.map(time => `${scene}_${time}`));

function pngMetadata(filePath) {
  const image = fs.readFileSync(filePath);
  return {
    signature: image.subarray(1, 4).toString('ascii'),
    width: image.readUInt32BE(16),
    height: image.readUInt32BE(20),
    colorType: image[25]
  };
}

describe('white album background assets', () => {
  test('declares common images as backgrounds and story images as cgs', () => {
    expect(Object.keys(visual.background)).toEqual([
      'musical_classroom3', 'school', 'classroom', ...timedBackgrounds
    ]);
    expect(Object.keys(visual.cg)).toHaveLength(11);
    Object.values(visual.background).forEach(relativePath => {
      expect(relativePath).toMatch(
        /^images\/background\/common\/(morning|afternoon|night)\/[^/]+\.png$/
      );
    });
    Object.values(visual.cg).forEach(relativePath => {
      expect(relativePath).toMatch(/^images\/background\/story\/[^/]+\.png$/);
    });
  });

  test('keeps every registered scene as a high-resolution RGB PNG', () => {
    const sceneFiles = [...Object.values(visual.background), ...Object.values(visual.cg)];
    expect(sceneFiles).toHaveLength(41);

    sceneFiles.forEach((relativePath) => {
      const imagePath = path.join(cardDir, relativePath);
      expect(fs.existsSync(imagePath)).toBe(true);
      const metadata = pngMetadata(imagePath);
      expect(metadata.signature).toBe('PNG');
      expect(metadata.width).toBeGreaterThanOrEqual(1600);
      expect(metadata.height).toBeGreaterThanOrEqual(800);
      expect(metadata.colorType).toBe(2);
    });
  });
});
