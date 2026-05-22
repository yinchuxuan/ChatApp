
import { execSync } from 'child_process';
import { join } from 'path';

const baseDir = '/Users/yinchuxuan/learning/harness_lab';
const hooksDir = join(baseDir, '.claude', 'observability', 'hooks');

function hook(name, payload) {
    const json = JSON.stringify(payload).replace(/'/g, "'"'"'");
    execSync(`echo '${json}' | node "${hooksDir}/${name}"`, {
        cwd: baseDir, timeout: 5000, stdio: 'pipe'
    });
}

// Fire SubagentStart
const t0 = Date.now();
const startP = hook('log-subagent-start.mjs', {
    hook_event_name: 'SubagentStart',
    session_id: 'test-1',
    agent_id: 'agent-test-001',
    agent_type: 'general-purpose'
});

// Fire 3 PreToolUse in parallel
const toolCalls = [
    { tool_name: 'Read', tool_input: { file_path: 'src/App.tsx' } },
    { tool_name: 'Bash', tool_input: { command: 'npm test' } },
    { tool_name: 'Glob', tool_input: { pattern: '**/*.ts' } }
];

const toolPromises = toolCalls.map((tc, i) => {
    return new Promise(resolve => {
        setTimeout(() => {
            hook('log-tool-use.mjs', {
                hook_event_name: 'PreToolUse',
                session_id: 'test-1',
                tool_name: tc.tool_name,
                tool_input: tc.tool_input
            });
            resolve();
        }, 50);  // 50ms delay to simulate realistic parallel firing
    });
});

await startP;
await Promise.all(toolPromises);
console.log('Phase 1 done');

// Now fire 3 PostToolUse
setTimeout(async () => {
    const postCalls = [
        { tool_name: 'Read', tool_response: { content: 'const App = ...' } },
        { tool_name: 'Bash', tool_response: { content: 'PASS - 5 passed', exit_code: 0 } },
        { tool_name: 'Glob', tool_response: { result: 'src/a.ts\nsrc/b.ts' } }
    ];
    
    await Promise.all(postCalls.map(pc => 
        new Promise(resolve => {
            hook('log-tool-result.mjs', {
                hook_event_name: 'PostToolUse',
                session_id: 'test-1',
                tool_name: pc.tool_name,
                tool_input: {},
                tool_response: pc.tool_response
            });
            resolve();
        })
    ));
    console.log('Phase 2 done');
    
    // Fire SubagentStop
    setTimeout(async () => {
        hook('log-subagent-stop.mjs', {
            hook_event_name: 'SubagentStop',
            session_id: 'test-1',
            agent_id: 'agent-test-001',
            agent_type: 'general-purpose',
            last_assistant_message: 'All tools completed successfully.'
        });
        console.log('Phase 3 done');
    }, 100);
}, 200);
