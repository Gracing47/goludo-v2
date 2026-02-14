
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

// SHIM: This file exists to support legacy startup commands (node server.js)
// and redirects them to the new TypeScript server (server.ts).

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const serverTs = path.join(__dirname, 'server.ts');

console.log('🔄 Compatibility Mode: Redirecting server.js -> server.ts');

// We presume running from root, so we check if we can resolve ts-node
const cmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';

// Spawn tsx to run the server
const child = spawn('npx', ['tsx', serverTs], {
    stdio: 'inherit',
    env: { ...process.env, NODE_OPTIONS: process.env.NODE_OPTIONS || '' },
    shell: true
});

child.on('error', (err) => {
    console.error('❌ Failed to start server.ts shim:', err);
    process.exit(1);
});

child.on('close', (code) => {
    process.exit(code);
});
