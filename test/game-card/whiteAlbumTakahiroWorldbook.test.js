const fs = require('node:fs');
const path = require('node:path');
const { card } = require('./whiteAlbumTestCard');

const cardDir = path.join(__dirname, '../../game-card-examples/white-album-2');
const readCardFile = relativePath => fs.readFileSync(path.join(cardDir, relativePath), 'utf-8');

describe('white album Takahiro worldbook', () => {
  test('documents Takahiro in the character book and index', () => {
    const characters = readCardFile('worldbook/characters.md');
    const index = readCardFile('worldbook/index.md');

    expect(characters).toContain('## 小木曾孝宏');
    expect(characters).toContain('小木曾雪菜的弟弟');
    expect(characters).toContain('容易通过聊天、游戏和直接的邀请活跃气氛');
    expect(index).toContain('- 小木曾孝宏: 雪菜开朗直率的弟弟');
  });

  test('loads the entry when recent messages mention Takahiro', () => {
    const rules = JSON.stringify(card.rules);

    expect(rules).toContain('孝宏|小木曾孝宏|小木曽孝宏|Takahiro');
    expect(rules).toContain('{{file:worldbook.characters#小木曾孝宏}}');
  });
});
