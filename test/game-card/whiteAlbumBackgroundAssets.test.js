const fs = require('node:fs');
const path = require('node:path');

const cardDir = path.join(__dirname, '../../game-card-examples/white-album-2');
const visual = require('../../game-card-examples/white-album-2/visual.json');

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
  test('keeps every registered scene at the shared high-resolution format', () => {
    expect(Object.keys(visual.background)).toHaveLength(14);

    Object.values(visual.background).forEach((relativePath) => {
      const imagePath = path.join(cardDir, relativePath);
      expect(fs.existsSync(imagePath)).toBe(true);
      expect(pngMetadata(imagePath)).toEqual({
        signature: 'PNG',
        width: 2560,
        height: 1440,
        colorType: 2
      });
    });
  });
});
