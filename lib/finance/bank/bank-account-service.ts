/**
 * Sprint 22.1 — BankAccountService.
 */

import type { EnterpriseContext } from "../../enterprise/types.ts";
import type { FinanceEnterpriseBridge } from "../shared/enterprise-bridge.ts";
import { FINANCE_ERROR_CODES, FinanceError } from "../shared/errors.ts";
import { assertArchivePermission, assertFinancePermission } from "../shared/rbac.ts";
import type {
  CreateBankAccountInput,
  UpdateBankAccountInput,
} from "../shared/types.ts";
import type { BankAccountRepository } from "./bank-account-repository.ts";

export function createBankAccountService(deps: {
  repo: BankAccountRepository;
  bridge: FinanceEnterpriseBridge;
}) {
  return {
    async list(context: EnterpriseContext) {
      assertFinancePermission(context.permissions, "financeiro.visualizar");
      return deps.repo.list(context.tenantId);
    },

    async get(context: EnterpriseContext, id: string) {
      assertFinancePermission(context.permissions, [
        "financeiro.visualizar",
        "financeiro.ver_saldos",
      ]);
      const row = await deps.repo.findById(context.tenantId, id);
      if (!row) {
        throw new FinanceError("Conta não encontrada.", FINANCE_ERROR_CODES.NOT_FOUND);
      }
      return row;
    },

    async create(context: EnterpriseContext, input: CreateBankAccountInput) {
      assertFinancePermission(context.permissions, "financeiro.criar");
      if (!input.name?.trim()) {
        throw new FinanceError("Nome obrigatório.", FINANCE_ERROR_CODES.VALIDATION);
      }
      const row = await deps.repo.create(context.tenantId, input);
      await deps.bridge.recordMutation(context, {
        event: "BANK_ACCOUNT_CREATED",
        targetType: "bank_account",
        targetId: row.id,
        description: `Conta bancária criada: ${row.name}`,
        metadata: { type: row.type, initialBalance: row.initialBalance },
      });
      return row;
    },

    async update(
      context: EnterpriseContext,
      id: string,
      input: UpdateBankAccountInput,
    ) {
      assertFinancePermission(context.permissions, "financeiro.editar");
      const row = await deps.repo.update(context.tenantId, id, input);
      await deps.bridge.recordMutation(context, {
        event: "BANK_ACCOUNT_UPDATED",
        targetType: "bank_account",
        targetId: row.id,
        description: `Conta bancária atualizada: ${row.name}`,
      });
      return row;
    },

    async archive(context: EnterpriseContext, id: string) {
      assertArchivePermission(context.permissions);
      const row = await deps.repo.archive(context.tenantId, id);
      await deps.bridge.recordMutation(context, {
        event: "BANK_ACCOUNT_ARCHIVED",
        targetType: "bank_account",
        targetId: row.id,
        description: `Conta bancária arquivada: ${row.name}`,
        severity: "medium",
      });
      return row;
    },
  };
}

export type BankAccountService = ReturnType<typeof createBankAccountService>;
