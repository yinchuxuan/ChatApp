const fs = require('node:fs');
const path = require('path');
const { readImportedJson } = require('./cardImportTestHelper');

const cardPath = path.join(__dirname, '../../game-card-examples/white-album-2/card.json');
const card = readImportedJson(cardPath);
const stateSchema = require('../../game-card-examples/white-album-2/state/schema.json');
const llmStateContract = fs.readFileSync(
  path.join(__dirname, '../../game-card-examples/white-album-2/state/llm_schema.md'),
  'utf-8'
);

module.exports = { card, stateSchema, llmStateContract };
