const fs = require('node:fs');
const path = require('node:path');
const { card } = require('./whiteAlbumTestCard');

const cardDir = path.join(__dirname, '../../game-card-examples/white-album-2');
const readCardFile = (relativePath) => fs.readFileSync(path.join(cardDir, relativePath), 'utf-8');

describe('white album Chikashi worldbook', () => {
  test('documents Chikashi in the character book and index', () => {
    const characters = readCardFile('worldbook/characters.md');
    const index = readCardFile('worldbook/index.md');

    expect(characters).toContain('## 早坂亲志');
    expect(characters).toContain('三年E班学生，春希的同班同学');
    expect(characters).toContain('实际经常把麻烦和工作托付给认真负责的春希');
    expect(index).toContain('- 早坂亲志: 春希的三年E班同学');
  });

  test('loads the entry when recent messages mention Chikashi', () => {
    const rules = JSON.stringify(card.rules);

    expect(rules).toContain('亲志|親志|早坂|Hayasaka|Chikashi');
    expect(rules).toContain('{{file:worldbook.characters#早坂亲志}}');
  });
});
