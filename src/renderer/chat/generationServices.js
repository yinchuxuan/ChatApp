import { sendChatRequest } from './apiClient.js';
import { normalizeGameCardError } from '../gameCard/runtimeError.js';
import {
  prepareAfterResponseMessages,
  prepareInitMessages,
  preparePreSendMessages,
  toApiMessages as toGameCardApiMessages
} from '../gameCard/sendPipeline.js';
import { prepareStreamPreviewState } from '../gameCard/streamPreviewPipeline.js';
import { gameCardPlatform } from '../platform/index.js';

function withPlatform(prepare) {
  return (options = {}) => prepare({ ...options, platform: gameCardPlatform });
}

const generationServices = {
  normalizeGameCardError,
  prepareAfterResponseMessages: withPlatform(prepareAfterResponseMessages),
  prepareInitMessages: withPlatform(prepareInitMessages),
  preparePreSendMessages: withPlatform(preparePreSendMessages),
  prepareStreamPreviewState: withPlatform(prepareStreamPreviewState),
  sendChatRequest,
  toGameCardApiMessages
};

export default generationServices;
