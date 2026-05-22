// SubagentStop hook
import { readInput, resolveLogFile, clearTimestamps } from './helpers.mjs';
import { appendFileSync, readFileSync } from 'fs';
import { join } from 'path';

const input = await readInput();
const payload = JSON.parse(input || '{}');

const logFile = resolveLogFile();
if (!logFile) {
    clearTimestamps();
    process.exit(0);
}

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

const lastMessage = payload.last_assistant_message || '';
const lines = lastMessage.split('\n');
const textLines = lines
    .map(l => l.replace(/^#{1,6}\s*/, '').replace(/\*\*/g, '').replace(/\*/g, '').replace(/^[-*]\s+/, '').trim())
    .filter(l => l.length > 0);
const summary = textLines.join(' | ');

appendFileSync(logFile, `\n─── ${role} END ───\n${summary}\n\n`);

clearTimestamps();
process.exit(0);
