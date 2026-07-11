import { sendChatRequest } from '../components/apiClient.js';
import { normalizeGameCardError } from '../components/GameCardErrorPanel.jsx';
import {
  prepareAfterResponseMessages,
  prepareInitMessages,
  preparePreSendMessages,
  toApiMessages as toGameCardApiMessages
} from '../gameCard/sendPipeline.js';
import { gameCardPlatform } from '../platform/index.js';

function withPlatform(prepare) {
  return (options = {}) => prepare({ ...options, platform: gameCardPlatform });
}

const generationServices = {
  normalizeGameCardError,
  prepareAfterResponseMessages: withPlatform(prepareAfterResponseMessages),
  prepareInitMessages: withPlatform(prepareInitMessages),
  preparePreSendMessages: withPlatform(preparePreSendMessages),
  sendChatRequest,
  toGameCardApiMessages
};

export default generationServices;
