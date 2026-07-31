#!/usr/bin/env node
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
let pass=0,fail=0; const assert=(c,m)=>{if(c){pass++;console.log('  PASS ',m)}else{fail++;console.log('  FAIL ',m)}};
console.log('\nSignature KPI Cockpit — 26.2\n');
assert(existsSync(join(root,'components/gf/gf-kpi-cockpit.tsx')),'gf-kpi-cockpit');
const c=readFileSync(join(root,'components/gf/gf-kpi-cockpit.tsx'),'utf8');
assert(c.includes('data-gf-kpi-cockpit'),'marker cockpit');
assert(c.includes('divide-'),'divisores internos');
assert(c.includes('2xl:grid-cols-6'),'6 cols desktop');
assert(c.includes('featured'),'featured');
const v=readFileSync(join(root,'components/dashboard/premium/premium-dashboard-view.tsx'),'utf8');
assert(v.includes('PremiumKpiStrip')||v.includes('GFKpiCockpit'),'wired dashboard');
assert(v.includes('data-dashboard-premium-v262'),'v262 marker');
console.log('\nResultado:',pass,'PASS ·',fail,'FAIL\n'); process.exit(fail>0?1:0);
