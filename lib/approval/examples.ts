/**
 * Sprint 21.4 — Exemplos de definição (testes / documentação interna).
 */

import {
  createApprovalDefinition,
  createSlaConfig,
} from "./approval-definition.ts";
import {
  createAmountBracket,
  createApprovalLevel,
  createApprovalPolicy,
} from "./approval-level.ts";
import type { ApprovalDefinition } from "./types.ts";

/**
 * Alçadas por valor:
 * ≤ 5.000 Supervisor · ≤ 20.000 Gerente · ≤ 100.000 Diretor · > 100.000 Proprietário
 */
export function paymentAmountApprovalDefinition(
  tenantId?: string | null,
): ApprovalDefinition {
  const supervisor = createApprovalLevel({
    id: "supervisor",
    name: "Supervisor",
    order: 1,
    mode: "single",
    requiredRoles: ["financeiro", "operacoes"],
    roleMode: "any",
    requiredPermissions: ["financeiro.aprovar"],
    sla: createSlaConfig({
      maxMinutes: 60 * 24,
      alertAfterMinutes: 60 * 4,
      escalateAfterMinutes: 60 * 12,
      expireAfterMinutes: 60 * 48,
      allowReopen: true,
    }),
  });

  const gerente = createApprovalLevel({
    id: "gerente",
    name: "Gerente",
    order: 1,
    mode: "single",
    requiredRoles: ["financeiro", "diretor"],
    roleMode: "any",
    requiredPermissions: ["financeiro.aprovar"],
  });

  const diretor = createApprovalLevel({
    id: "diretor",
    name: "Diretor",
    order: 1,
    mode: "single",
    requiredRoles: ["diretor", "proprietario"],
    roleMode: "any",
    requiredPermissions: ["financeiro.aprovar"],
  });

  const proprietario = createApprovalLevel({
    id: "proprietario",
    name: "Proprietário",
    order: 1,
    mode: "single",
    requiredRoles: ["proprietario"],
    requiredPermissions: ["financeiro.aprovar"],
  });

  return createApprovalDefinition({
    id: "payment-amount-approval",
    version: "1.0.0",
    name: "Aprovação financeira por alçada",
    description: "Alçadas configuráveis por valor",
    tenantScope: tenantId ? "tenant" : "global",
    tenantId: tenantId ?? null,
    levels: [supervisor, gerente, diretor, proprietario],
    policy: createApprovalPolicy({
      id: "amount-brackets",
      name: "Alçadas por valor",
      brackets: [
        createAmountBracket({
          id: "upto-5k",
          label: "Até R$ 5.000",
          minAmount: 0,
          maxAmount: 5000,
          levelIds: ["supervisor"],
          requiredRoles: ["financeiro"],
        }),
        createAmountBracket({
          id: "upto-20k",
          label: "Até R$ 20.000",
          minAmount: 5000.01,
          maxAmount: 20000,
          levelIds: ["gerente"],
        }),
        createAmountBracket({
          id: "upto-100k",
          label: "Até R$ 100.000",
          minAmount: 20000.01,
          maxAmount: 100000,
          levelIds: ["diretor"],
        }),
        createAmountBracket({
          id: "above-100k",
          label: "Acima de R$ 100.000",
          minAmount: 100000.01,
          maxAmount: null,
          levelIds: ["proprietario"],
        }),
      ],
      defaultLevelIds: ["supervisor"],
    }),
    sla: createSlaConfig({
      maxMinutes: 60 * 72,
      alertAfterMinutes: 60 * 24,
      escalateAfterMinutes: 60 * 48,
      expireAfterMinutes: 60 * 120,
      allowReopen: true,
    }),
  });
}

/** Aprovação sequencial em 2 níveis. */
export function sequentialApprovalDefinition(): ApprovalDefinition {
  return createApprovalDefinition({
    id: "sequential-two-level",
    version: "1.0.0",
    name: "Aprovação sequencial",
    levels: [
      createApprovalLevel({
        id: "l1",
        name: "Nível 1",
        order: 1,
        mode: "sequential",
        requiredPermissions: ["compras.aprovar"],
      }),
      createApprovalLevel({
        id: "l2",
        name: "Nível 2",
        order: 2,
        mode: "sequential",
        requiredPermissions: ["compras.aprovar"],
        requiredRoles: ["diretor"],
        roleMode: "any",
      }),
    ],
  });
}

/** Aprovação paralela (quórum 2). */
export function parallelApprovalDefinition(): ApprovalDefinition {
  return createApprovalDefinition({
    id: "parallel-group",
    version: "1.0.0",
    name: "Aprovação paralela",
    levels: [
      createApprovalLevel({
        id: "finance",
        name: "Financeiro",
        order: 1,
        mode: "parallel",
        quorum: 1,
        groupId: "board",
        requiredRoles: ["financeiro"],
        requiredPermissions: ["financeiro.aprovar"],
      }),
      createApprovalLevel({
        id: "ops",
        name: "Operações",
        order: 1,
        mode: "parallel",
        quorum: 1,
        groupId: "board",
        requiredRoles: ["operacoes"],
        requiredPermissions: ["estoque.aprovar_ajuste"],
      }),
    ],
    policy: createApprovalPolicy({
      id: "parallel-default",
      name: "Ambos",
      defaultLevelIds: ["finance", "ops"],
    }),
  });
}

/** Aprovação simples (single). */
export function singleApprovalDefinition(): ApprovalDefinition {
  return createApprovalDefinition({
    id: "single-approval",
    version: "1.0.0",
    name: "Aprovação simples",
    levels: [
      createApprovalLevel({
        id: "only",
        name: "Aprovador",
        order: 1,
        mode: "single",
        requiredPermissions: ["os.aprovar"],
      }),
    ],
  });
}
