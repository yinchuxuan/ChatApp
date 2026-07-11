const path = require('path');
const { readImportedJson } = require('./cardImportTestHelper');

const cardPath = path.join(__dirname, '../../game-card-examples/white-album-2/card.json');
const card = readImportedJson(cardPath);
const stateSchema = require('../../game-card-examples/white-album-2/state/schema.json');
const llmStateSchema = require('../../game-card-examples/white-album-2/state/llm_schema.json');

module.exports = { card, stateSchema, llmStateSchema };
