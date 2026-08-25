import { Channel, convertFileSrc, invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';

const tauriBridge = Object.freeze({ Channel, convertFileSrc, getCurrentWindow, invoke, listen });

export { tauriBridge };
