#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
let pass=0, fail=0;
function assert(c,m){ if(c){pass++; console.log("  PASS ",m);} else {fail++; console.log("  FAIL ",m);} }
function read(p){ return readFileSync(join(root,p),"utf8"); }
function exists(p){ return existsSync(join(root,p)); }

import { redactSensitiveText, stripSecretsFromObject, assertNoCrossTenantPayload } from "../lib/intelligence/enterprise/privacy/redact.ts";
console.log("\nPrivacy — 27.0\n");
const r = redactSensitiveText("email test@example.com cpf 123.456.789-09 sk-abcdefghijklmnop");
assert(r.text.includes("[REDACTED_EMAIL]"), "email");
assert(r.text.includes("[REDACTED_CPF]"), "cpf");
assert(r.text.includes("[REDACTED_SECRET]"), "secret");
const o = stripSecretsFromObject({ password: "x", ok: "y" });
assert(o.password === "[REDACTED]", "strip password");
let threw = false;
try { assertNoCrossTenantPayload("a","b"); } catch { threw = true; }
assert(threw, "tenant isolation throw");
console.log("\nResultado:", pass, "PASS ·", fail, "FAIL\n");
process.exit(fail>0?1:0);
