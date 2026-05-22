// Shared helpers for observability hooks
import { readFileSync, writeFileSync, appendFileSync, mkdirSync, rmSync, existsSync } from 'fs';
import { join } from 'path';

const LOG_DIR = join(process.cwd(), 'auto_mode_harness', 'auto_mode_logs');
const LOCK_DIR = join(LOG_DIR, '.tsq.lock');

mkdirSync(LOG_DIR, { recursive: true });

function atomicAppend(line) {
    for (let i = 0; i < 10; i++) {
        try {
            mkdirSync(LOCK_DIR, { recursive: true });
            appendFileSync(join(LOG_DIR, '.tsq'), line + '\n');
            rmSync(LOCK_DIR, { recursive: true });
            return;
        } catch {
            if (i === 9) return;
            const start = Date.now();
            while (Date.now() - start < 15) {}
        }
    }
}

function atomicPopFirst() {
    for (let i = 0; i < 10; i++) {
        try {
            mkdirSync(LOCK_DIR, { recursive: true });
            let content = '';
            try { content = readFileSync(join(LOG_DIR, '.tsq'), 'utf8'); } catch { content = ''; }
            const lines = content.split('\n').filter(l => l.length > 0);
            const first = lines.shift() || null;
            writeFileSync(join(LOG_DIR, '.tsq'), lines.join('\n'));
            rmSync(LOCK_DIR, { recursive: true });
            return first;
        } catch {
            if (i === 9) return null;
            const start = Date.now();
            while (Date.now() - start < 15) {}
        }
    }
    return null;
}

function atomicClear() {
    for (let i = 0; i < 10; i++) {
        try {
            mkdirSync(LOCK_DIR, { recursive: true });
            writeFileSync(join(LOG_DIR, '.tsq'), '');
            rmSync(LOCK_DIR, { recursive: true });
            return;
        } catch {
            if (i === 9) return;
            const start = Date.now();
            while (Date.now() - start < 15) {}
        }
    }
}

export function readInput() {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', chunk => data += chunk);
    return new Promise((resolve) => process.stdin.on('end', () => resolve(data)));
}

export function pushTimestamp(ts) { atomicAppend(String(ts)); }

export function popDuration(endTs) {
    const startStr = atomicPopFirst();
    if (!startStr) return '';
    const startTs = parseInt(startStr, 10);
    if (isNaN(startTs)) return '';
    return ` (${((endTs - startTs) / 1000).toFixed(1)}s)`;
}

export function clearTimestamps() { atomicClear(); }

export function resolveLogFile() {
    mkdirSync(LOG_DIR, { recursive: true });
    const fl = join(process.cwd(), 'auto_mode_harness', 'feature_list.json');
    try {
        const data = JSON.parse(readFileSync(fl, 'utf8'));
        const active = (data.features || []).find(f => f.status === 'working' || f.status === 'evaluating');
        if (active) {
            const title = (active.title || '').replace(/\s+/g, '-').replace(/[^\w\u4e00-\u9fff-]/g, '');
            return join(LOG_DIR, `feature-${active.id}-${title}.log`);
        }
    } catch {}
    return null;
}

export function formatTime(ts) {
    return new Date(ts || Date.now()).toISOString().replace('T', ' ').substring(0, 19);
}

export function now() { return Date.now(); }

export function toolLine(toolName, target) {
    return `${toolName} ${target} [DUR]`;
}
