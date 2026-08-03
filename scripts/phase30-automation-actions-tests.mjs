#!/usr/bin/env node
/**
 * Sprint 30.7 — Ações ALLOWED vs BLOCKED.
 */
import {
  ALLOWED_ACTIONS,
  BLOCKED_EXTERNAL_ACTIONS,
  isAllowedActionType,
  isBlockedExternal,
  validateActions,
  actionRequiresApproval,
} from "../lib/automacoes/actions-catalog.ts";

let pass = 0;
let fail = 0;
function check(name, cond) {
  if (cond) {
    pass += 1;
    console.log("  PASS", name);
  } else {
    fail += 1;
    console.log("  FAIL", name);
  }
}

console.log("\nPhase 30.7 — automation actions\n");

check("ALLOWED_ACTIONS todas allowed:true", ALLOWED_ACTIONS.every((a) => a.allowed === true));
check(
  "ALLOWED inclui criar_tarefa/criar_alerta/rascunho_cobranca",
  ["criar_tarefa", "criar_alerta", "rascunho_cobranca"].every(isAllowedActionType),
);
check("whatsapp bloqueado", isBlockedExternal("whatsapp"));
check("email bloqueado", isBlockedExternal("email"));
check("webhook bloqueado", isBlockedExternal("webhook"));
check("baixa_estoque bloqueado", isBlockedExternal("baixa_estoque"));
check("lancamento_financeiro bloqueado", isBlockedExternal("lancamento_financeiro"));

for (const blocked of BLOCKED_EXTERNAL_ACTIONS) {
  check(`blocked ${blocked}`, isBlockedExternal(blocked));
  check(`blocked ${blocked} não allowed`, !isAllowedActionType(blocked));
}

const externalErrors = validateActions([
  { id: "x", type: "whatsapp", label: "WhatsApp" },
]);
check(
  "validateActions mensagem externa",
  externalErrors.some((e) => e.includes("externa bloqueada")),
);

const unknownErrors = validateActions([{ id: "x", type: "acao_inventada", label: "X" }]);
check(
  "validateActions ação desconhecida",
  unknownErrors.some((e) => e.includes("não permitida")),
);

const emptyErrors = validateActions([]);
check("validateActions regra sem ações", emptyErrors.includes("Regra sem ações."));

const ok = validateActions([
  { id: "a1", type: "criar_tarefa", label: "Tarefa" },
  { id: "a2", type: "notificar_interno", label: "Notificar" },
]);
check("validateActions ações válidas", ok.length === 0);

check(
  "actionRequiresApproval sensível",
  actionRequiresApproval({ id: "a1", type: "rascunho_cobranca", label: "Cobrança" }),
);
check(
  "actionRequiresApproval explícito",
  actionRequiresApproval({
    id: "a1",
    type: "criar_tarefa",
    label: "T",
    requiresApproval: true,
  }),
);
check(
  "actionRequiresApproval tarefa simples",
  !actionRequiresApproval({ id: "a1", type: "criar_tarefa", label: "T" }),
);

console.log(`\nResultado: ${pass} PASS · ${fail} FAIL\n`);
process.exit(fail > 0 ? 1 : 0);
