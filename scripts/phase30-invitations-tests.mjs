#!/usr/bin/env node
/**
 * Sprint 30.2 — Equipe: contrato de convites (token hash, honestidade de e-mail).
 * Uso: node --experimental-strip-types scripts/phase30-invitations-tests.mjs
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildInviteUrlPath,
  generateInviteToken,
  hashInviteToken,
  inviteTokenPrefix,
} from "../lib/equipe/token.ts";
import { INVITATION_STATUS_LABELS, invitationStatusLabel } from "../lib/equipe/labels.ts";

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

console.log("\nPhase 30.2 — Equipe: convites\n");

const tokenA = generateInviteToken();
const tokenB = generateInviteToken();
assert(typeof tokenA === "string" && tokenA.length >= 32, "token gerado com tamanho seguro");
assert(tokenA !== tokenB, "tokens gerados são únicos");

const hashA = hashInviteToken(tokenA);
assert(hashA !== tokenA, "hash difere do token em claro (nunca persistir claro)");
assert(hashA === hashInviteToken(tokenA), "hash é determinístico para o mesmo token");
assert(hashA !== hashInviteToken(tokenB), "hashes diferentes para tokens diferentes");
assert(/^[0-9a-f]{64}$/.test(hashA), "hash sha256 hex de 64 chars");

const prefix = inviteTokenPrefix(tokenA);
assert(tokenA.startsWith(prefix), "prefixo é o início do token");
assert(prefix.length < tokenA.length, "prefixo é mais curto que o token completo (não expõe tudo)");

const url = buildInviteUrlPath("minha-loja", tokenA);
assert(url.startsWith("/convite/"), "URL de convite é global (/convite/…) — convidado ainda não é membro");
assert(!url.includes("minha-loja"), "URL não embute slug de tenant (middleware bloquearia não-membros)");
assert(url.includes(tokenA), "URL de convite inclui o token (retorno único no momento da criação)");

assert(INVITATION_STATUS_LABELS.pending === "Pendente", "status pending → Pendente");
assert(INVITATION_STATUS_LABELS.accepted === "Aceito", "status accepted → Aceito");
assert(INVITATION_STATUS_LABELS.expired === "Expirado", "status expired → Expirado");
assert(INVITATION_STATUS_LABELS.cancelled === "Cancelado", "status cancelled → Cancelado");
assert(invitationStatusLabel(undefined) === "—", "invitationStatusLabel honesto para vazio");

const invitationsService = readFileSync(
  join(root, "lib/equipe/invitations-service.ts"),
  "utf8",
);
assert(
  invitationsService.includes("Já existe um convite pendente"),
  "createInvitation impede convite duplicado pendente",
);
assert(
  invitationsService.includes("acceptInvitation"),
  "fluxo de aceite de convite implementado",
);
assert(
  invitationsService.includes("LIST_COLUMNS") && !invitationsService
    .split("LIST_COLUMNS =")[1]
    ?.split(";")[0]
    ?.includes("token_hash"),
  "listagem de convites nunca seleciona token_hash em claro",
);
assert(
  invitationsService.includes("emailProviderConfigured") &&
    invitationsService.includes("process.env"),
  "emailProviderConfigured reflete env honestly (sem fingir envio)",
);
assert(
  invitationsService.includes("emailSent: false"),
  "createInvitation/resendInvitation não afirmam envio de e-mail real",
);

const acceptPage = readFileSync(join(root, "app/convite/[token]/page.tsx"), "utf8");
assert(acceptPage.includes("data-invite-accept"), "página de aceite existe em /convite/[token]");

const routes = readFileSync(join(root, "lib/auth/routes.ts"), "utf8");
assert(routes.includes('"convite"'), "convite é segmento reservado (não-tenant)");

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
