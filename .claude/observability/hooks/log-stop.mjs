// Stop hook
import { readInput, resolveLogFile, formatTime, now } from './helpers.mjs';
import { appendFileSync, readFileSync } from 'fs';
import { join } from 'path';

const input = await readInput();
const payload = JSON.parse(input || '{}');

const logFile = resolveLogFile();
if (!logFile) process.exit(0);

// Resolve role from current feature status
let role = 'AGENT';
try {
    const fl = join(process.cwd(), 'auto_mode_harness', 'feature_list.json');
    const data = JSON.parse(readFileSync(fl, 'utf8'));
    const active = (data.features || []).find(f => f.status === 'working' || f.status === 'evaluating');
    if (active) {
        role = active.status === 'evaluating' ? 'EVALUATOR' : 'WORKER';
    }
} catch {}

const timeStr = formatTime(now());
appendFileSync(logFile, `\n═══ ${role} INTERRUPTED ═══\n\n`);

process.exit(0);
