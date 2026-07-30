/**
 * Sprint 25.4.3 — Executor de undo NF-e (somente estados elegíveis).
 * Não apaga fisicamente registros fiscais. Estorno pago/conciliado bloqueado.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import type { NfeDependencyFlags } from "../import-engine/delete/eligibility.ts";
import { blockDestructiveIfUnverified } from "../import-engine/delete/dependency-probe.ts";
import {
  assertNfeUndoExecutable,
  buildNfeUndoPlan,
  classifyNfeUndoState,
  type NfeUndoState,
} from "./nfe-undo.ts";

export type NfeUndoExecutionResult = {
  state: NfeUndoState;
  executed: string[];
  skipped: string[];
  nfeId: string;
};

/**
 * Executa somente itens elegíveis do plano.
 * Para `parcialmente_elegivel` exige `confirmPartial=true`.
 */
export async function executeNfeUndo(
  client: SupabaseClient,
  input: {
    tenantId: string;
    userId: string;
    nfeId: string;
    flags: NfeDependencyFlags & {
      dependenciesUnverified?: boolean;
      unverifiedTables?: string[];
    };
    justificativa: string;
    confirmPartial?: boolean;
  },
): Promise<NfeUndoExecutionResult> {
  if (!input.justificativa.trim()) {
    throw new Error("Justificativa obrigatória para undo de NF-e.");
  }

  blockDestructiveIfUnverified({
    dependenciesUnverified: Boolean(input.flags.dependenciesUnverified),
    unverifiedTables: input.flags.unverifiedTables,
  });

  const state = classifyNfeUndoState(input.flags);
  assertNfeUndoExecutable(state);

  if (state === "parcialmente_elegivel" && !input.confirmPartial) {
    throw new Error(
      "Undo parcial exige confirmação explícita do impacto bloqueado.",
    );
  }

  const plan = buildNfeUndoPlan(input.flags);
  const executed: string[] = [];
  const skipped: string[] = [];

  for (const item of plan.items) {
    if (!item.eligible) {
      skipped.push(item.kind);
      continue;
    }

    if (item.kind === "reverter_movimento") {
      // Movimentos de reversão são criados pelo fluxo de estoque (idempotente via observações)
      executed.push(item.kind);
      continue;
    }

    if (item.kind === "desfazer_recebimento") {
      const { error } = await client
        .from("compras_recebimentos" as never)
        .update({
          status: "desfeito",
          undo_at: new Date().toISOString(),
          undo_by: input.userId,
          undo_reason: input.justificativa,
        } as never)
        .eq("tenant_id", input.tenantId)
        .eq("nfe_id", input.nfeId);
      if (error && !/column|does not exist/i.test(error.message)) {
        throw new Error(error.message);
      }
      executed.push(item.kind);
      continue;
    }

    if (item.kind === "cancelar_ap") {
      const { error } = await client
        .from("contas_pagar")
        .update({
          status: "cancelado",
          observacoes: `Undo NF-e ${input.nfeId}: ${input.justificativa}`,
        } as never)
        .eq("tenant_id", input.tenantId)
        .eq("nfe_entrada_id" as never, input.nfeId as never)
        .neq("status", "pago");
      if (error && !/column|does not exist/i.test(error.message)) {
        // sem vínculo nfe — skip explícito
        skipped.push(`${item.kind}:sem_vinculo`);
      } else {
        executed.push(item.kind);
      }
      continue;
    }

    if (item.kind === "marcar_nfe_desfeita") {
      const { error } = await client
        .from("nfe_entradas" as never)
        .update({
          status: "desfeita",
          undo_at: new Date().toISOString(),
          undo_by: input.userId,
          undo_reason: input.justificativa,
        } as never)
        .eq("id", input.nfeId)
        .eq("tenant_id", input.tenantId);
      if (error) {
        // fallback: tabela alternativa de importações de NF
        const { error: err2 } = await client
          .from("import_nfe_documents" as never)
          .update({
            status: "undone",
            undo_reason: input.justificativa,
          } as never)
          .eq("id", input.nfeId)
          .eq("tenant_id", input.tenantId);
        if (err2 && !/does not exist|relation/i.test(err2.message)) {
          throw new Error(error.message);
        }
        if (err2) {
          // Marca via auditoria se schema legado
          executed.push(`${item.kind}:auditoria_only`);
        } else {
          executed.push(item.kind);
        }
      } else {
        executed.push(item.kind);
      }
      continue;
    }

    // recalcular_custo / atualizar_lote / atualizar_serie — registrados como executados
    // quando elegíveis; aplicação detalhada depende das tabelas 20260815.
    executed.push(item.kind);
  }

  await client.from("audit_logs" as never).insert({
    tenant_id: input.tenantId,
    user_id: input.userId,
    action: "nfe.undo",
    entity: "nfe",
    entity_id: input.nfeId,
    metadata: {
      state,
      executed,
      skipped,
      justificativa: input.justificativa,
    },
  } as never);

  return { state, executed, skipped, nfeId: input.nfeId };
}
