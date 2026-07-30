import { sendChatRequest } from './apiClient.js';
import { normalizeGameCardError } from '../gameCard/runtimeError.js';
import {
  prepareAfterResponseMessages,
  prepareInitMessages,
  preparePreSendMessages,
  toApiMessages as toGameCardApiMessages
} from '../gameCard/sendPipeline.js';
import {
  prepareStatePatchAtCursor
} from '../gameCard/statePatchPipeline.js';
import { gameCardPlatform } from '../platform/index.js';

function withPlatform(prepare) {
  return (options = {}) => prepare({ ...options, platform: gameCardPlatform });
}

const generationServices = {
  normalizeGameCardError,
  prepareAfterResponseMessages: withPlatform(prepareAfterResponseMessages),
  prepareInitMessages: withPlatform(prepareInitMessages),
  preparePreSendMessages: withPlatform(preparePreSendMessages),
  prepareStatePatchAtCursor: withPlatform(prepareStatePatchAtCursor),
  sendChatRequest,
  toGameCardApiMessages
};

export default generationServices;
