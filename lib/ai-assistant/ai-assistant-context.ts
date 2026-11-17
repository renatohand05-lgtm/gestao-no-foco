import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { getCashIntelligenceDashboard } from "@/lib/finance/cash-intelligence/cash-intelligence-actions";
import {
  createDreService,
  defaultDrePeriodo,
} from "@/lib/financeiro/dre-service";
import { formatCurrency } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { TenantWithRole } from "@/types";
import type { Database } from "@/types/database";

import { formatarContextoDados } from "./ai-assistant-prompt";
import type { AiAssistantRequestContext } from "./ai-assistant-request";
import { derivarSinais } from "./ai-assistant-signals";
import { loadAiAssistantSnapshot } from "./ai-assistant-snapshot";

type TenantForContext = Pick<TenantWithRole, "id" | "slug" | "name" | "segment">;

async function carregarDre(tenant: TenantForContext): Promise<string | null> {
  try {
    const period = defaultDrePeriodo();
    const service = await createDreService(tenant.id);
    const dre = await service.getDre({ dataDe: period.dataDe, dataAte: period.dataAte });
    return [
      `## DRE OFICIAL DO MÊS (módulo Financeiro, ${period.dataDe} a ${period.dataAte})`,
      `- Receita líquida: ${formatCurrency(dre.resumo.receita_liquida)}`,
      `- CMV: ${formatCurrency(dre.resumo.cmv)}`,
      `- Resultado final (lucro líquido): ${formatCurrency(dre.resumo.resultado_final)}`,
      "Observação: o DRE segue o regime e as classificações do módulo Financeiro e pode diferir do faturamento das OS (impostos, competência, lançamentos ainda não classificados). Em caso de diferença, explique a origem em vez de escolher um número.",
    ].join("\n");
  } catch {
    return null; // sem dados de DRE ainda
  }
}

async function carregarCaixa(tenant: TenantForContext): Promise<string | null> {
  try {
    const cash = await getCashIntelligenceDashboard(tenant.slug, { horizonDays: 30 });
    if (!cash.success) return null;
    return [
      "## CAIXA (módulo Fluxo de Caixa)",
      `- Saldo consolidado: ${formatCurrency(cash.dashboard.balance.consolidated)}`,
      `- Capital de giro recomendado: ${formatCurrency(cash.dashboard.workingCapital.recommended)}`,
    ].join("\n");
  } catch {
    return null; // sem dados de caixa ainda
  }
}

/**
 * Tudo o que a IA "vê" da empresa: retrato completo dos dados + sinais já
 * calculados + DRE/caixa oficiais. A IA nunca tem acesso livre ao banco — só
 * o que está neste texto. Se uma parte falhar, ela some do contexto sem
 * quebrar a conversa.
 */
export async function buildAiAssistantRequestContext(
  tenant: TenantForContext,
  client?: SupabaseClient<Database>,
  options: { incluirDreECaixa?: boolean; formato?: "markdown" | "texto" } = {},
): Promise<AiAssistantRequestContext> {
  const { incluirDreECaixa = true, formato } = options;
  const supabase = client ?? (await createClient());

  const [snapshot, dre, caixa] = await Promise.all([
    loadAiAssistantSnapshot(supabase, tenant.id).catch(() => null),
    incluirDreECaixa ? carregarDre(tenant) : Promise.resolve(null),
    incluirDreECaixa ? carregarCaixa(tenant) : Promise.resolve(null),
  ]);

  const sinais = snapshot ? derivarSinais(snapshot) : [];
  const dataContext = formatarContextoDados({
    tenant: { name: tenant.name, slug: tenant.slug, segment: tenant.segment },
    snapshot,
    sinais,
    extras: [dre, caixa].filter((x): x is string => Boolean(x)),
  });

  return {
    tenantSlug: tenant.slug,
    segment: tenant.segment,
    dataContext,
    formato,
  };
}
