// PreToolUse hook - record Write/Edit/Bash only
import { readInput, resolveLogFile, pushTimestamp, toolLine } from './helpers.mjs';
import { appendFileSync, readFileSync } from 'fs';

const input = await readInput();
const payload = JSON.parse(input || '{}');

const toolName = payload.tool_name || 'Unknown';
const toolInput = payload.tool_input || {};
const ts = Date.now();

const logFile = resolveLogFile();
if (!logFile) process.exit(0);

pushTimestamp(ts);

if (toolName === 'Write') {
    const filePath = toolInput.file_path || 'unknown';
    const content = toolInput.content || '';
    const lines = content.split('\n');
    const numbered = lines.map((l, i) => `  ${String(i + 1).padStart(3)} │ ${l}`);
    appendFileSync(logFile, `Write ${filePath}\n${numbered.join('\n')}\n\n`);
} else if (toolName === 'Edit') {
    const filePath = toolInput.file_path || 'unknown';
    const oldStr = toolInput.old_string || '';
    const newStr = toolInput.new_string || '';
    const oldLines = oldStr.split('\n');
    const newLines = newStr.split('\n');

    // Find actual starting line number in the file
    let startLine = 1;
    try {
        const fileContent = readFileSync(filePath, 'utf8');
        const idx = fileContent.indexOf(oldStr);
        if (idx >= 0) {
            startLine = fileContent.substring(0, idx).split('\n').length;
        }
    } catch {}

    // Strip common prefix
    let prefixLen = 0;
    while (prefixLen < oldLines.length && prefixLen < newLines.length && oldLines[prefixLen] === newLines[prefixLen]) {
        prefixLen++;
    }

    // Strip common suffix from remaining parts
    const oldRemain = oldLines.slice(prefixLen);
    const newRemain = newLines.slice(prefixLen);
    let suffixLen = 0;
    while (suffixLen < oldRemain.length && suffixLen < newRemain.length &&
           oldRemain[oldRemain.length - 1 - suffixLen] === newRemain[newRemain.length - 1 - suffixLen]) {
        suffixLen++;
    }

    const oldChanged = oldRemain.slice(0, oldRemain.length - suffixLen);
    const newChanged = newRemain.slice(0, newRemain.length - suffixLen);
    const changeStartLine = startLine + prefixLen;

    const diffLines = [];
    diffLines.push(`@@ -${changeStartLine},${oldChanged.length} +${changeStartLine},${newChanged.length} @@`);
    for (const line of oldChanged) {
        diffLines.push(`- ${line}`);
    }
    for (const line of newChanged) {
        diffLines.push(`+ ${line}`);
    }
    appendFileSync(logFile, `Edit ${filePath}\n  ${diffLines.join('\n')}\n\n`);
} else if (toolName === 'Bash') {
    appendFileSync(logFile, `Bash ${toolInput.command || 'unknown'} [DUR]\n`);
}

process.exit(0);
