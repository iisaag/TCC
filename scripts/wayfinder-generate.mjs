/* global process */

import { spawnSync } from 'node:child_process';
import { closeSync, existsSync, mkdirSync, openSync, unlinkSync } from 'node:fs';
import path from 'node:path';

const lockDir = path.resolve(process.cwd(), 'storage', 'framework', 'cache');
const lockFile = path.join(lockDir, 'wayfinder-generate.lock');

mkdirSync(lockDir, { recursive: true });

let lockFd;

try {
    lockFd = openSync(lockFile, 'wx');
} catch {
    // Another generation process is already running; skipping avoids race conditions.
    process.exit(0);
}

try {
    const args = process.argv.slice(2);
    const result = spawnSync('php', ['artisan', 'wayfinder:generate', ...args], {
        stdio: 'inherit',
        shell: false,
    });

    if (typeof result.status === 'number') {
        process.exit(result.status);
    }

    process.exit(1);
} finally {
    if (typeof lockFd === 'number') {
        closeSync(lockFd);
    }

    if (existsSync(lockFile)) {
        unlinkSync(lockFile);
    }
}
