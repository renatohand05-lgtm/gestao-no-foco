import "server-only";

import { getCashIntelligenceDashboard } from "@/lib/finance/cash-intelligence/cash-intelligence-actions";
import {
  createDreService,
  defaultDrePeriodo,
} from "@/lib/financeiro/dre-service";
import { formatCurrency } from "@/lib/format";
import type { TenantWithRole } from "@/types";

/**
 * Snapshot textual e limitado dos dados reais da empresa — nunca dá ao
 * modelo acesso livre ao banco. Só o que está aqui é o que a IA "vê".
 * Se algo falhar (schema ausente, sem dados), a seção correspondente
 * simplesmente não entra no contexto, sem quebrar a conversa.
 */
export async function buildAiAssistantDataContext(
  tenant: Pick<TenantWithRole, "id" | "slug" | "name" | "segment">,
): Promise<string> {
  const sections: string[] = [];

  try {
    const period = defaultDrePeriodo();
    const service = await createDreService(tenant.id);
    const dre = await service.getDre({ dataDe: period.dataDe, dataAte: period.dataAte });
    sections.push(
      [
        `DRE do mês atual (${period.dataDe} a ${period.dataAte}):`,
        `- Receita líquida: ${formatCurrency(dre.resumo.receita_liquida)}`,
        `- CMV: ${formatCurrency(dre.resumo.cmv)}`,
        `- Lucro líquido (resultado final): ${formatCurrency(dre.resumo.resultado_final)}`,
      ].join("\n"),
    );
  } catch {
    /* sem dados de DRE ainda — segue sem essa seção */
  }

  try {
    const cash = await getCashIntelligenceDashboard(tenant.slug, {
      horizonDays: 30,
    });
    if (cash.success) {
      sections.push(
        [
          "Caixa:",
          `- Saldo consolidado: ${formatCurrency(cash.dashboard.balance.consolidated)}`,
          `- Capital de giro recomendado: ${formatCurrency(cash.dashboard.workingCapital.recommended)}`,
        ].join("\n"),
      );
    }
  } catch {
    /* sem dados de caixa ainda */
  }

  if (sections.length === 0) {
    return `Empresa "${tenant.name}" (segmento: ${tenant.segment ?? "não definido"}) ainda não tem dados financeiros suficientes carregados no sistema.`;
  }

  return [
    `Empresa "${tenant.name}" (segmento: ${tenant.segment ?? "não definido"}).`,
    ...sections,
  ].join("\n\n");
}
