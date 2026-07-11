import { convertFileSrc, invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

const tauriBridge = Object.freeze({ convertFileSrc, invoke, listen });

export { tauriBridge };
