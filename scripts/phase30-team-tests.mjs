#!/usr/bin/env node
/**
 * Sprint 30.2 — Equipe: contrato de membros, labels multisetor e arquivos base.
 * Uso: node --experimental-strip-types scripts/phase30-team-tests.mjs
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  getDepartmentPresets,
  MEMBER_STATUS_LABELS,
  MEMBERSHIP_ROLE_LABELS,
  MEMBERSHIP_ROLE_OPTIONS,
  membershipRoleLabel,
  memberStatusLabel,
} from "../lib/equipe/labels.ts";
import { nextMemberStatus } from "../lib/equipe/guards.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
let pass = 0;
let fail = 0;
function assert(cond, msg) {
  if (cond) {
    pass++;
    console.log(`  PASS  ${msg}`);
  } else {
    fail++;
    console.log(`  FAIL  ${msg}`);
  }
}

console.log("\nPhase 30.2 — Equipe: membros e labels\n");

assert(
  existsSync(join(root, "supabase/migrations/20260820_phase30_2_team_rbac.sql")),
  "migration 20260820_phase30_2_team_rbac.sql existe",
);
assert(existsSync(join(root, "lib/equipe/types.ts")), "lib/equipe/types.ts existe");
assert(existsSync(join(root, "lib/equipe/members-service.ts")), "lib/equipe/members-service.ts existe");
assert(
  existsSync(join(root, "app/(app)/[tenant]/configuracoes/equipe/page.tsx")),
  "app equipe/page.tsx existe",
);
assert(
  existsSync(join(root, "app/(app)/[tenant]/configuracoes/equipe/loading.tsx")),
  "app equipe/loading.tsx existe",
);
assert(existsSync(join(root, "components/equipe/equipe-hub.tsx")), "components/equipe/equipe-hub.tsx existe");
assert(existsSync(join(root, "components/equipe/members-panel.tsx")), "components/equipe/members-panel.tsx existe");

assert(MEMBERSHIP_ROLE_LABELS.owner === "Proprietário", "owner → Proprietário");
assert(MEMBERSHIP_ROLE_LABELS.admin === "Administrador", "admin → Administrador");
assert(MEMBERSHIP_ROLE_LABELS.manager === "Gerente", "manager → Gerente");
assert(MEMBERSHIP_ROLE_LABELS.member === "Colaborador", "member → Colaborador");
assert(MEMBERSHIP_ROLE_OPTIONS.length === 4, "4 opções de papel de membership");
assert(membershipRoleLabel("owner") === "Proprietário", "membershipRoleLabel(owner)");
assert(membershipRoleLabel(null) === "—", "membershipRoleLabel honesto para vazio");

assert(MEMBER_STATUS_LABELS.active === "Ativo", "status active → Ativo");
assert(MEMBER_STATUS_LABELS.inactive === "Inativo", "status inactive → Inativo");
assert(memberStatusLabel(undefined) === "Ativo", "memberStatusLabel default = Ativo (coluna pode não existir ainda)");
assert(nextMemberStatus("active") === "inactive", "nextMemberStatus alterna active→inactive");
assert(nextMemberStatus("inactive") === "active", "nextMemberStatus alterna inactive→active");

const oficina = getDepartmentPresets("oficina");
const comercio = getDepartmentPresets("comercio");
const restaurante = getDepartmentPresets("restaurante");
const servicos = getDepartmentPresets("servicos");
const consultoria = getDepartmentPresets("consultoria");
const fallback = getDepartmentPresets(null);

assert(oficina.includes("Mecânica"), "presets oficina incluem Mecânica");
assert(comercio.includes("Vendas"), "presets comercio incluem Vendas");
assert(restaurante.includes("Cozinha"), "presets restaurante incluem Cozinha");
assert(servicos.includes("Atendimento"), "presets servicos incluem Atendimento");
assert(consultoria.includes("Consultoria"), "presets consultoria incluem Consultoria");
assert(fallback.length > 0, "presets fallback não vazios (sem segmento)");
assert(
  new Set([...oficina, ...comercio, ...restaurante, ...servicos, ...consultoria, ...fallback]).size > 4,
  "presets variam por segmento (multisetor real, não hardcode único)",
);

const migration = readFileSync(
  join(root, "supabase/migrations/20260820_phase30_2_team_rbac.sql"),
  "utf8",
);
assert(migration.includes("tenant_teams"), "migration cria tenant_teams");
assert(migration.includes("tenant_team_members"), "migration cria tenant_team_members");
assert(migration.includes("tenant_job_titles"), "migration cria tenant_job_titles");
assert(migration.includes("tenant_invitations"), "migration cria tenant_invitations");
assert(migration.toLowerCase().includes("if not exists"), "migration usa IF NOT EXISTS (idempotente)");
assert(!/drop table/i.test(migration), "migration não faz DROP TABLE destrutivo");

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
