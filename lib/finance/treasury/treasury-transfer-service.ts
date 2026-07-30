/**
 * Sprint 22.2 — Transferências atómicas + idempotência + Audit enriquecido.
 */

import type { EnterpriseContext } from "../../enterprise/types.ts";
import { executeIdempotent } from "../../enterprise/idempotency.ts";
import type { IdempotencyRepository } from "../../enterprise/repositories/idempotency-repository.ts";
import type { BankAccountRepository } from "../bank/bank-account-repository.ts";
import type { CashMovementRepository } from "../cashflow/cash-movement-repository.ts";
import type { FinanceEnterpriseBridge } from "../shared/enterprise-bridge.ts";
import { FINANCE_ERROR_CODES, FinanceError } from "../shared/errors.ts";
import { assertFinancePermission } from "../shared/rbac.ts";
import type { CashMovement } from "../shared/types.ts";
import { assertTransferInput, moneyBRL } from "./treasury-validator.ts";
import type {
  TreasuryTransferInput,
  TreasuryTransferResult,
} from "./treasury-types.ts";

export function createTreasuryTransferService(deps: {
  accounts: BankAccountRepository;
  movements: CashMovementRepository;
  bridge: FinanceEnterpriseBridge;
  idempotency: IdempotencyRepository;
}) {
  return {
    async transfer(
      context: EnterpriseContext,
      input: TreasuryTransferInput,
    ): Promise<TreasuryTransferResult> {
      assertFinancePermission(context.permissions, "financeiro.transferir");
      assertTransferInput(input);

      const [from, to] = await Promise.all([
        deps.accounts.findById(context.tenantId, input.fromAccountId),
        deps.accounts.findById(context.tenantId, input.toAccountId),
      ]);

      if (!from || from.tenantId !== context.tenantId) {
        throw new FinanceError(
          "Conta de origem não encontrada.",
          FINANCE_ERROR_CODES.NOT_FOUND,
        );
      }
      if (!to || to.tenantId !== context.tenantId) {
        throw new FinanceError(
          "Conta de destino não encontrada.",
          FINANCE_ERROR_CODES.NOT_FOUND,
        );
      }
      if (from.status !== "active" || to.status !== "active") {
        throw new FinanceError(
          "Ambas as contas devem estar ativas.",
          FINANCE_ERROR_CODES.VALIDATION,
        );
      }
      if (from.currentBalance < input.amount) {
        throw new FinanceError(
          "Saldo insuficiente na conta de origem.",
          FINANCE_ERROR_CODES.INSUFFICIENT_FUNDS,
        );
      }

      const request = {
        fromAccountId: input.fromAccountId,
        toAccountId: input.toAccountId,
        amount: input.amount,
        movementDate: input.movementDate,
        description: input.description,
        categoryId: input.categoryId ?? null,
        costCenterId: input.costCenterId ?? null,
      };

      const { result, replayed } = await executeIdempotent(deps.idempotency, {
        context,
        idempotencyKey: input.idempotencyKey,
        operation: "finance.transferBetweenAccounts",
        request,
        run: async () => {
          const outMovement = await deps.movements.create(
            context.tenantId,
            {
              bankAccountId: input.fromAccountId,
              toAccountId: input.toAccountId,
              kind: "transferencia",
              amount: input.amount,
              movementDate: input.movementDate,
              description: input.description,
              categoryId: input.categoryId,
              costCenterId: input.costCenterId,
              notes: input.notes,
            },
            context.userId,
          );

          let inMovement: CashMovement | null = null;
          if (outMovement.transferGroupId) {
            const siblings = await deps.movements.list(context.tenantId, {
              from: input.movementDate,
              to: input.movementDate,
              limit: 50,
            });
            inMovement =
              siblings.find(
                (m) =>
                  m.transferGroupId === outMovement.transferGroupId &&
                  m.id !== outMovement.id,
              ) ?? null;
          }

          const actor = context.userId ?? "Utilizador";
          const description =
            `${actor} transferiu ${moneyBRL(input.amount)}\n` +
            `Origem: ${from.name}\n` +
            `Destino: ${to.name}\n` +
            `Categoria: Transferência interna\n` +
            `Data: ${input.movementDate}`;

          await deps.bridge.recordMutation(context, {
            event: "CASH_TRANSFER_EXECUTED",
            targetType: "cash_transfer",
            targetId: outMovement.transferGroupId ?? outMovement.id,
            description,
            severity: "medium",
            metadata: {
              amount: input.amount,
              fromAccountId: from.id,
              toAccountId: to.id,
              fromAccountName: from.name,
              toAccountName: to.name,
              categoryId: input.categoryId ?? null,
              costCenterId: input.costCenterId ?? null,
              outMovementId: outMovement.id,
              inMovementId: inMovement?.id ?? null,
              correlationId: context.correlationId,
              linkMovement: outMovement.id,
              linkAccountFrom: from.id,
              linkAccountTo: to.id,
              idempotencyKey: input.idempotencyKey,
            },
          });

          return {
            transferGroupId: outMovement.transferGroupId,
            correlationId: context.correlationId,
            outMovement,
            inMovement,
            replayed: false,
            fromAccountName: from.name,
            toAccountName: to.name,
            amount: input.amount,
          } satisfies TreasuryTransferResult;
        },
        serializeResult: (r) =>
          JSON.parse(JSON.stringify({ ...r, replayed: true })),
      });

      return { ...result, replayed: replayed || result.replayed };
    },
  };
}

export type TreasuryTransferService = ReturnType<
  typeof createTreasuryTransferService
>;
