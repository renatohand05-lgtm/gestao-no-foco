/**
 * Sprint 25.4.2 — Execução segura de desfazer (catálogo / estoque).
 * Reversão de estoque via movimentação auditável + idempotencyKey.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import { EstoqueService } from "../../estoque/estoque-service.ts";
import { ProdutoService } from "../../produtos/produto-service.ts";

import {
  evaluateProductUndo,
  evaluateServiceUndo,
  evaluateStockMovementUndo,
  productBlockReasons,
  serviceBlockReasons,
  stockBlockReasons,
  stockReversalIdempotencyKey,
  summarizeUndoDecisions,
  type EntityUndoDecision,
} from "./eligibility.ts";
import {
  probeMovementDependencies,
  probeProductDependencies,
} from "./dependency-probe.ts";
import { buildUndoImpactPreview } from "./preview.ts";
import type { ImportRunItem } from "../types/index.ts";

export async function buildCatalogStockUndoPreview(input: {
  client: SupabaseClient;
  tenantId: string;
  runId: string;
  runCreatedAt: string;
  runStatus: string;
  archivedAt?: string | null;
  items: ImportRunItem[];
}) {
  const decisions: EntityUndoDecision[] = [];

  for (const item of input.items) {
    if (item.rollbackStatus === "reverted") {
      decisions.push({
        targetType: item.targetType,
        targetId: item.targetId,
        rowNumber: item.rowNumber,
        eligible: false,
        action: "skip",
        blockReasons: ["ja_revertido"],
      });
      continue;
    }

    if (
      item.targetType === "produto" ||
      item.targetType === "servico"
    ) {
      const probe = await probeProductDependencies(
        input.client,
        input.tenantId,
        item.targetId,
        input.runCreatedAt,
      );
      const isService =
        item.targetType === "servico" || probe.tipo === "servico";
      if (isService) {
        const flags = {
          usedInSale: probe.usedInSale,
          usedInOs: probe.usedInOs,
          usedInBudget: probe.usedInBudget,
          financeHistory:
            probe.fiscalOrFinanceLink || probe.dependenciesUnverified,
          alreadyReverted: probe.alreadySoftDeleted,
          tenantMismatch: !probe.tenantOk,
        };
        const action = evaluateServiceUndo(flags);
        const reasons = serviceBlockReasons(flags);
        decisions.push({
          targetType: "servico",
          targetId: item.targetId,
          rowNumber: item.rowNumber,
          eligible: action === "soft_delete" && !probe.dependenciesUnverified,
          action: probe.dependenciesUnverified ? "block" : action,
          blockReasons: probe.dependenciesUnverified
            ? ["dependencia_generica", ...reasons]
            : reasons,
          label: probe.nome ?? undefined,
        });
      } else {
        const flags = {
          usedInSale: probe.usedInSale,
          usedInOs: probe.usedInOs,
          usedInBudget: probe.usedInBudget,
          laterMovements: probe.laterMovements,
          currentQty: probe.currentQty,
          reserved: probe.reserved,
          inInventory: probe.inInventory,
          fiscalOrFinanceLink:
            probe.fiscalOrFinanceLink || probe.dependenciesUnverified,
          alreadyReverted: probe.alreadySoftDeleted,
          tenantMismatch: !probe.tenantOk,
        };
        const action = evaluateProductUndo(flags);
        decisions.push({
          targetType: "produto",
          targetId: item.targetId,
          rowNumber: item.rowNumber,
          eligible: action === "soft_delete" && !probe.dependenciesUnverified,
          action: probe.dependenciesUnverified ? "block" : action,
          blockReasons: probe.dependenciesUnverified
            ? ["dependencia_generica", ...productBlockReasons(flags)]
            : productBlockReasons(flags),
          label: probe.nome ?? undefined,
        });
      }
      continue;
    }

    if (item.targetType === "estoque_movimentacao") {
      const probe = await probeMovementDependencies(
        input.client,
        input.tenantId,
        item.targetId,
        input.runCreatedAt,
      );
      const flags = {
        alreadyReverted: probe.alreadyReversed,
        laterMovementsOnProduct: probe.laterMovementsOnProduct,
        inventoryDepends: false,
        tenantMismatch: !probe.tenantOk,
        originalQty: probe.quantidade,
      };
      const action = evaluateStockMovementUndo(flags);
      decisions.push({
        targetType: "estoque_movimentacao",
        targetId: item.targetId,
        rowNumber: item.rowNumber,
        eligible: action === "reverse_movement",
        action,
        blockReasons: stockBlockReasons(flags),
        label: `Movimento ${item.targetId.slice(0, 8)}`,
      });
    }
  }

  const summary = summarizeUndoDecisions(decisions, {
    alreadyRolledBack: input.runStatus === "rolled_back",
    archived: Boolean(input.archivedAt),
  });

  const movementQtys: Record<string, number> = {};
  for (const d of decisions) {
    if (d.targetType === "estoque_movimentacao") {
      const p = await probeMovementDependencies(
        input.client,
        input.tenantId,
        d.targetId,
        input.runCreatedAt,
      );
      movementQtys[d.targetId] = p.quantidade;
    }
  }

  return buildUndoImpactPreview({ summary, movementQtys });
}

export async function executeEligibleCatalogStockUndo(input: {
  client: SupabaseClient;
  tenantId: string;
  userId: string;
  runId: string;
  correlationId: string;
  decisions: EntityUndoDecision[];
  selectedIds?: string[] | null;
  mode: "all_eligible" | "selected";
}): Promise<{
  reverted: string[];
  inactivated: string[];
  blocked: string[];
  failed: Array<{ id: string; error: string }>;
}> {
  const allow = new Set(
    input.mode === "selected" && input.selectedIds?.length
      ? input.selectedIds
      : input.decisions.filter((d) => d.eligible).map((d) => d.targetId),
  );

  const reverted: string[] = [];
  const inactivated: string[] = [];
  const blocked: string[] = [];
  const failed: Array<{ id: string; error: string }> = [];

  const produtos = new ProdutoService(input.client, input.tenantId);
  const estoque = new EstoqueService(input.client, input.tenantId);

  for (const d of input.decisions) {
    if (!allow.has(d.targetId)) continue;

    if (d.action === "inactivate") {
      try {
        await input.client
          .from("produtos")
          .update({ ativo: false, updated_at: new Date().toISOString() })
          .eq("tenant_id", input.tenantId)
          .eq("id", d.targetId)
          .is("deleted_at", null);
        inactivated.push(d.targetId);
      } catch (e) {
        failed.push({
          id: d.targetId,
          error: e instanceof Error ? e.message : "Falha ao inativar",
        });
      }
      continue;
    }

    if (d.action === "block" || d.action === "skip") {
      blocked.push(d.targetId);
      continue;
    }

    if (d.action === "soft_delete") {
      try {
        await produtos.softDelete(d.targetId);
        reverted.push(d.targetId);
      } catch (e) {
        failed.push({
          id: d.targetId,
          error: e instanceof Error ? e.message : "Falha soft-delete",
        });
      }
      continue;
    }

    if (d.action === "reverse_movement") {
      const key = stockReversalIdempotencyKey({
        tenantId: input.tenantId,
        importRunId: input.runId,
        originalMovementId: d.targetId,
      });
      try {
        const { data: existing } = await input.client
          .from("estoque_movimentacoes")
          .select("id")
          .eq("tenant_id", input.tenantId)
          .ilike("observacoes", `%${key}%`)
          .maybeSingle();
        if (existing?.id) {
          blocked.push(d.targetId);
          continue;
        }

        const { data: original } = await input.client
          .from("estoque_movimentacoes")
          .select("produto_id, quantidade, tipo")
          .eq("tenant_id", input.tenantId)
          .eq("id", d.targetId)
          .maybeSingle();
        if (!original) {
          failed.push({ id: d.targetId, error: "Movimento original ausente." });
          continue;
        }

        const qty = Number(original.quantidade ?? 0);
        if (!(qty > 0)) {
          blocked.push(d.targetId);
          continue;
        }

        // Entrada original → saída de reversão (e vice-versa via ajuste negativo)
        const reverseTipo =
          original.tipo === "entrada" || original.tipo === "devolucao"
            ? "saida"
            : "entrada";

        await estoque.createMovimentacao(
          {
            produto_id: original.produto_id,
            tipo: reverseTipo,
            quantidade: qty,
            origem: "importacao",
            motivo: "Reversão de importação",
            observacoes: `${key}; correlationId=${input.correlationId}; original=${d.targetId}`,
          },
          input.userId,
        );
        reverted.push(d.targetId);
      } catch (e) {
        failed.push({
          id: d.targetId,
          error: e instanceof Error ? e.message : "Falha na reversão",
        });
      }
    }
  }

  return { reverted, inactivated, blocked, failed };
}
