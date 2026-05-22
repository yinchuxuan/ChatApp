// SubagentStart hook
// Only clears leftover timestamps from previous agent to avoid stale duration calculations
import { clearTimestamps } from './helpers.mjs';
clearTimestamps();
process.exit(0);
