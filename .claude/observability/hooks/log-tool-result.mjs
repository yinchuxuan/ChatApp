// PostToolUse hook - update duration/status for Bash
import { readInput, popDuration, resolveLogFile } from './helpers.mjs';
import { readFileSync, writeFileSync } from 'fs';

const input = await readInput();
const payload = JSON.parse(input || '{}');

const toolName = payload.tool_name || 'Unknown';
const toolResponse = payload.tool_response || {};
const ts = Date.now();

let statusIcon = '✓';
if (toolName === 'Bash') {
    const exitCode = toolResponse.exit_code ?? toolResponse.code;
    if (exitCode !== undefined && exitCode !== 0) statusIcon = '✗';
}

const logFile = resolveLogFile();
if (!logFile) {
    popDuration(ts);
    process.exit(0);
}

const duration = popDuration(ts);
const durationNum = duration.match(/\d+\.\d+/)?.[0] || '0.0';

try {
    const content = readFileSync(logFile, 'utf8');
    const idx = content.lastIndexOf('[DUR]');
    if (idx >= 0) {
        const replacement = `(${durationNum}s) ${statusIcon}`;
        const newContent = content.substring(0, idx) + replacement + content.substring(idx + 5);
        writeFileSync(logFile, newContent);
    }
} catch {}

process.exit(0);
