import { sendChatRequest } from './apiClient.js';
import { normalizeGameCardError } from './GameCardErrorPanel.jsx';
import {
  prepareAfterResponseMessages,
  prepareInitMessages,
  preparePreSendMessages,
  toApiMessages as toGameCardApiMessages
} from '../gameCard/sendPipeline.js';

const generationServices = {
  normalizeGameCardError,
  prepareAfterResponseMessages,
  prepareInitMessages,
  preparePreSendMessages,
  sendChatRequest,
  toGameCardApiMessages
};

export default generationServices;
