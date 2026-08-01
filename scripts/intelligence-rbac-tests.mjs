#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
let pass=0, fail=0;
function assert(c,m){ if(c){pass++; console.log("  PASS ",m);} else {fail++; console.log("  FAIL ",m);} }
function read(p){ return readFileSync(join(root,p),"utf8"); }
function exists(p){ return existsSync(join(root,p)); }

console.log("\nIntelligence RBAC — 27.0\n");
const perms = read("lib/rbac/permissions.ts");
const types = read("lib/rbac/types.ts");
assert(types.includes('"inteligencia"'), "module inteligencia");
for (const k of [
  "inteligencia.visualizar","inteligencia.executivo","inteligencia.perguntar",
  "inteligencia.explicar","inteligencia.simular","inteligencia.recomendar",
  "inteligencia.criar_plano","inteligencia.aprovar_plano","inteligencia.executar_acao",
  "inteligencia.configurar_provider","inteligencia.ver_auditoria","inteligencia.ver_custos",
  "inteligencia.feedback",
]) assert(perms.includes(k), k);
const roles = read("lib/rbac/role-permissions.ts");
assert(roles.includes("inteligencia.visualizar"), "roles wired");
console.log("\nResultado:", pass, "PASS ·", fail, "FAIL\n");
process.exit(fail>0?1:0);
