/**
 * Sprint 22.1 — CashMovementService.
 */

import type { EnterpriseContext } from "../../enterprise/types.ts";
import type { FinanceEnterpriseBridge } from "../shared/enterprise-bridge.ts";
import { FINANCE_ERROR_CODES, FinanceError } from "../shared/errors.ts";
import { assertFinancePermission } from "../shared/rbac.ts";
import type {
  CreateMovementInput,
  UpdateMovementInput,
} from "../shared/types.ts";
import type { CashMovementRepository } from "./cash-movement-repository.ts";

export function createCashMovementService(deps: {
  repo: CashMovementRepository;
  bridge: FinanceEnterpriseBridge;
}) {
  return {
    async list(
      context: EnterpriseContext,
      opts?: { from?: string; to?: string; accountId?: string },
    ) {
      assertFinancePermission(context.permissions, [
        "financeiro.visualizar",
        "financeiro.ver_fluxo_caixa",
      ]);
      return deps.repo.list(context.tenantId, opts);
    },

    async create(context: EnterpriseContext, input: CreateMovementInput) {
      if (input.kind === "transferencia") {
        assertFinancePermission(context.permissions, "financeiro.transferir");
      } else {
        assertFinancePermission(context.permissions, "financeiro.criar");
      }
      if (!input.amount || input.amount <= 0) {
        throw new FinanceError("Valor inválido.", FINANCE_ERROR_CODES.VALIDATION);
      }
      if (!input.description?.trim()) {
        throw new FinanceError(
          "Descrição obrigatória.",
          FINANCE_ERROR_CODES.VALIDATION,
        );
      }
      const row = await deps.repo.create(
        context.tenantId,
        input,
        context.userId,
      );
      await deps.bridge.recordMutation(context, {
        event:
          input.kind === "transferencia"
            ? "CASH_TRANSFER_CREATED"
            : input.kind === "estorno"
              ? "CASH_MOVEMENT_REVERSED"
              : "CASH_MOVEMENT_CREATED",
        targetType: "cash_movement",
        targetId: row.id,
        description: `${input.kind}: ${row.description} (${row.amount})`,
        metadata: {
          kind: row.kind,
          amount: row.amount,
          bankAccountId: row.bankAccountId,
          categoryId: row.categoryId,
          costCenterId: row.costCenterId,
        },
      });
      return row;
    },

    async update(
      context: EnterpriseContext,
      id: string,
      input: UpdateMovementInput,
    ) {
      assertFinancePermission(context.permissions, "financeiro.editar");
      const row = await deps.repo.update(context.tenantId, id, input);
      await deps.bridge.recordMutation(context, {
        event: "CASH_MOVEMENT_UPDATED",
        targetType: "cash_movement",
        targetId: row.id,
        description: `Movimentação atualizada: ${row.description}`,
      });
      return row;
    },

    async delete(context: EnterpriseContext, id: string) {
      assertFinancePermission(context.permissions, [
        "financeiro.excluir",
        "financeiro.editar",
      ]);
      const row = await deps.repo.delete(context.tenantId, id, context.userId);
      await deps.bridge.recordMutation(context, {
        event: "CASH_MOVEMENT_DELETED",
        targetType: "cash_movement",
        targetId: row.id,
        description: `Estorno de movimentação ${id}`,
        severity: "medium",
        metadata: { originalId: id, reversalId: row.id },
      });
      return row;
    },

    async transfer(
      context: EnterpriseContext,
      input: Omit<CreateMovementInput, "kind"> & { toAccountId: string },
    ) {
      return this.create(context, { ...input, kind: "transferencia" });
    },
  };
}

export type CashMovementService = ReturnType<typeof createCashMovementService>;
