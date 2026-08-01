#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
const r = spawnSync(process.execPath, ['--experimental-strip-types', 'scripts/phase27-domain-suite.mjs', 'financial-action-plan'], { stdio: 'inherit' });
process.exit(r.status ?? 1);
