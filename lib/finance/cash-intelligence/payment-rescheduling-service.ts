/**
 * Sprint 22.6.2 — Recomendações determinísticas de reprogramação.
 * Nunca altera vencimentos / nunca executa ações automaticamente.
 */

import type {
  CashProjectionResult,
  OpenTitleSnapshot,
  RescheduleRecommendation,
} from "./types.ts";
import { addDays, roundMoney, todayUtc } from "./date-utils.ts";

const LABEL = "Sugestão automática baseada em projeção de caixa." as const;

export type RecommendationProvider = {
  id: string;
  label: string;
  recommend: (ctx: {
    projection: CashProjectionResult;
    openTitles: OpenTitleSnapshot[];
    consolidatedBalance: number;
  }) => RescheduleRecommendation[];
};

/** Provider determinístico (sem IA externa). */
export const deterministicRescheduleProvider: RecommendationProvider = {
  id: "deterministic-v1",
  label: LABEL,
  recommend(ctx) {
    const out: RescheduleRecommendation[] = [];
    const today = todayUtc();
    const payables = ctx.openTitles
      .filter(
        (t) =>
          t.kind === "payable" &&
          t.amountPending > 0 &&
          !t.linkedMovementId &&
          t.status !== "cancelado",
      )
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
    const receivables = ctx.openTitles
      .filter(
        (t) =>
          t.kind === "receivable" &&
          t.amountPending > 0 &&
          !t.linkedMovementId,
      )
      .sort((a, b) => a.dueDate.localeCompare(b.dueDate));

    if (ctx.projection.ruptureDate && payables.length > 0) {
      const critical = payables.find(
        (p) => p.dueDate <= ctx.projection.ruptureDate!,
      );
      const nextReceipt = receivables.find(
        (r) =>
          critical &&
          r.dueDate > critical.dueDate &&
          r.amountPending >= critical.amountPending * 0.5,
      );
      if (critical && nextReceipt) {
        const after = roundMoney(
          ctx.projection.minBalance + critical.amountPending,
        );
        out.push({
          id: `rec-move-${critical.id}`,
          title: `Mover pagamento “${critical.description}” para depois de “${nextReceipt.description}”`,
          justification: `O vencimento em ${critical.dueDate} contribui para ruptura em ${ctx.projection.ruptureDate}. Há recebimento previsto em ${nextReceipt.dueDate}.`,
          impactBefore: ctx.projection.minBalance,
          impactAfter: after,
          relatedOrigins: [
            { kind: "payable", id: critical.id },
            { kind: "receivable", id: nextReceipt.id },
          ],
          suggestedAction: "move_after_receipt",
          requiresHumanConfirmation: true,
          autoApplied: false,
          label: LABEL,
        });
      }
    }

    const heavy = payables.find(
      (p) => p.amountPending > ctx.consolidatedBalance * 0.5,
    );
    if (heavy) {
      out.push({
        id: `rec-split-${heavy.id}`,
        title: `Dividir pagamento “${heavy.description}” em duas datas`,
        justification:
          "Pagamento concentra mais de 50% do saldo consolidado numa única data.",
        impactBefore: ctx.projection.minBalance,
        impactAfter: roundMoney(
          ctx.projection.minBalance + heavy.amountPending / 2,
        ),
        relatedOrigins: [{ kind: "payable", id: heavy.id }],
        suggestedAction: "split_payment",
        requiresHumanConfirmation: true,
        autoApplied: false,
        label: LABEL,
      });
    }

    const overdue = receivables.filter((r) => r.overdue).slice(0, 1);
    if (overdue[0] && ctx.projection.capitalNeed > 0) {
      out.push({
        id: `rec-anticipate-${overdue[0].id}`,
        title: `Antecipar cobrança de “${overdue[0].description}”`,
        justification:
          "Recebimento em atraso reduziria a necessidade de capital no horizonte.",
        impactBefore: ctx.projection.minBalance,
        impactAfter: roundMoney(
          ctx.projection.minBalance + overdue[0].amountPending,
        ),
        relatedOrigins: [{ kind: "receivable", id: overdue[0].id }],
        suggestedAction: "anticipate_receivable",
        requiresHumanConfirmation: true,
        autoApplied: false,
        label: LABEL,
      });
    }

    if (ctx.projection.capitalNeed > 0) {
      out.push({
        id: "rec-wc-needed",
        title: "Contratar capital de giro apenas no valor necessário",
        justification: `Necessidade acumulada estimada: ${ctx.projection.capitalNeed.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} até ${ctx.projection.to}.`,
        impactBefore: ctx.projection.minBalance,
        impactAfter: 0,
        relatedOrigins: [],
        suggestedAction: "seek_working_capital",
        requiresHumanConfirmation: true,
        autoApplied: false,
        label: LABEL,
      });
    }

    // Evitar investimento se ruptura iminente
    if (
      ctx.projection.ruptureDate &&
      ctx.projection.ruptureDate <= addDays(today, 30)
    ) {
      out.push({
        id: "rec-defer-invest",
        title: "Evitar realizar investimento na data atual",
        justification:
          "Há risco de ruptura de caixa nos próximos 30 dias — preservar liquidez.",
        impactBefore: ctx.projection.minBalance,
        impactAfter: ctx.projection.minBalance,
        relatedOrigins: [],
        suggestedAction: "defer_investment",
        requiresHumanConfirmation: true,
        autoApplied: false,
        label: LABEL,
      });
    }

    return out;
  },
};

export function buildRescheduleRecommendations(
  ctx: {
    projection: CashProjectionResult;
    openTitles: OpenTitleSnapshot[];
    consolidatedBalance: number;
  },
  provider: RecommendationProvider = deterministicRescheduleProvider,
): RescheduleRecommendation[] {
  return provider.recommend(ctx).map((r) => ({
    ...r,
    requiresHumanConfirmation: true,
    autoApplied: false,
    label: LABEL,
  }));
}

/** Confirmação humana obrigatória — nunca aplica automaticamente. */
export function confirmRecommendation(input: {
  recommendationId: string;
  confirmedByUser: boolean;
}): { applied: false; message: string } {
  if (!input.confirmedByUser) {
    return {
      applied: false,
      message: "Confirmação humana obrigatória — nenhuma alteração realizada.",
    };
  }
  return {
    applied: false,
    message:
      "Confirmação registada. A aplicação da reprogramação exige edição manual do título — nenhuma alteração automática.",
  };
}
