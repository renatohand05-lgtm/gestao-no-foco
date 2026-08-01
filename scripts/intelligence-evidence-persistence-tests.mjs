#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
const r = spawnSync(process.execPath, ['--experimental-strip-types', 'scripts/phase27-6-1-suite.mjs', 'intelligence-evidence-persistence'], { stdio: 'inherit' });
process.exit(r.status ?? 1);
