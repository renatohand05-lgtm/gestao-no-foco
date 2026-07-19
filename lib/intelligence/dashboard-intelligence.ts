import { buildIntelligenceAlerts } from "@/lib/intelligence/alerts";
import { buildQualidadeOperacionalAlerts } from "@/lib/intelligence/alerts/qualidade-operacional";
import { INTELLIGENCE_THRESHOLDS } from "@/lib/intelligence/alerts/thresholds";
import { buildRecentActivities } from "@/lib/intelligence/activities";
import { buildImplementationChecklist } from "@/lib/intelligence/checklist";
import { calculateHealthScore } from "@/lib/intelligence/health-score";
import { buildPriorityCenter } from "@/lib/intelligence/priority-engine";
import { createEstoqueService } from "@/lib/estoque/estoque-service";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  DashboardComparisons,
  DashboardFilters,
  DashboardKpis,
  DashboardRankingItem,
} from "@/types/dashboard-executive";
import type { ContasPagarResumo } from "@/types/contas-pagar";
import type { ContasReceberResumo } from "@/types/contas-receber";
import type { FluxoCaixaResumo } from "@/types/fluxo-caixa";
import type { QualidadeOperacionalData } from "@/types/qualidade-operacional";
import type {
  DashboardIntelligenceInput,
  DashboardIntelligenceResult,
} from "@/types/intelligence";
import type { TenantSegment } from "@/types";

type BuildIntelligenceParams = {
  tenantId: string;
  tenantSlug: string;
  tenantName: string;
  segment: TenantSegment | null;
  filters: DashboardFilters;
  kpis: DashboardKpis;
  comparisons: DashboardComparisons;
  rankingClientes: DashboardRankingItem[];
  fluxoResumo: FluxoCaixaResumo;
  contasReceber: ContasReceberResumo;
  contasPagar: ContasPagarResumo;
  qualidadeOperacional: QualidadeOperacionalData;
};

async function countProdutosParados(
  supabase: SupabaseClient<Database>,
  tenantId: string,
  dias: number,
): Promise<number> {
  const threshold = new Date();
  threshold.setDate(threshold.getDate() - dias);
  const thresholdIso = threshold.toISOString();

  const { data: produtos, error: produtosError } = await supabase
    .from("produtos")
    .select("id")
    .eq("tenant_id", tenantId)
    .is("deleted_at", null)
    .eq("ativo", true)
    .not("tipo", "eq", "servico")
    .gt("estoque_atual", 0);

  if (produtosError) throw new Error(produtosError.message);

  const ids = (produtos ?? []).map((row) => row.id);
  if (ids.length === 0) return 0;

  const { data: movs, error: movsError } = await supabase
    .from("estoque_movimentacoes")
    .select("produto_id")
    .eq("tenant_id", tenantId)
    .is("deleted_at", null)
    .gte("created_at", thresholdIso)
    .in("produto_id", ids);

  if (movsError) throw new Error(movsError.message);

  const moved = new Set((movs ?? []).map((row) => row.produto_id));
  return ids.filter((id) => !moved.has(id)).length;
}

function resolveConcentracao(
  rankingClientes: DashboardRankingItem[],
  faturamentoVendasProxy: number,
): DashboardIntelligenceInput["concentracaoCliente"] {
  const top = rankingClientes[0];
  if (!top || faturamentoVendasProxy <= 0) {
    return { clienteId: null, clienteNome: null, sharePct: 0 };
  }
  const sharePct = (top.value / faturamentoVendasProxy) * 100;
  return {
    clienteId: top.id,
    clienteNome: top.label,
    sharePct: Number.isFinite(sharePct) ? sharePct : 0,
  };
}

export async function buildDashboardIntelligence(
  params: BuildIntelligenceParams,
): Promise<DashboardIntelligenceResult> {
  const supabase = await createClient();
  const {
    tenantId,
    tenantSlug,
    tenantName,
    segment,
    filters,
    kpis,
    comparisons,
    rankingClientes,
    fluxoResumo,
    contasReceber,
    contasPagar,
    qualidadeOperacional,
  } = params;

  const estoqueService = await createEstoqueService(tenantId);

  const [estoqueBaixo, produtosParadosCount, checklist, activities] =
    await Promise.all([
      estoqueService.listAlertasEstoqueBaixo(),
      countProdutosParados(
        supabase,
        tenantId,
        INTELLIGENCE_THRESHOLDS.produtoParadoDias,
      ),
      buildImplementationChecklist({
        supabase,
        tenantId,
        tenantSlug,
        tenantName,
        segment,
      }),
      buildRecentActivities({
        supabase,
        tenantId,
        tenantSlug,
      }),
    ]);

  const faturamentoClientes = rankingClientes.reduce(
    (acc, item) => acc + item.value,
    0,
  );

  const input: DashboardIntelligenceInput = {
    tenantSlug,
    tenantName,
    segment,
    periodo: filters,
    kpis: {
      faturamento: kpis.faturamento,
      receita_liquida: kpis.receita_liquida,
      ebitda: kpis.ebitda,
      cmv: kpis.cmv,
      margem_media: kpis.margem_media,
      saldo_bancario: kpis.saldo_bancario,
      entradas_previstas: kpis.entradas_previstas,
      saidas_previstas: kpis.saidas_previstas,
      quantidade_vendas: kpis.quantidade_vendas,
    },
    comparisons: {
      quantidade_vendas: comparisons.quantidade_vendas,
      faturamento: comparisons.faturamento,
    },
    fluxo: {
      saldo_projetado: fluxoResumo.saldo_projetado,
      saldo_atual: fluxoResumo.saldo_atual,
    },
    contasReceber: {
      total_aberto: contasReceber.total_aberto,
      total_vencido: contasReceber.total_vencido,
      quantidade_vencido: contasReceber.quantidade_vencido,
    },
    contasPagar: {
      total_aberto: contasPagar.total_aberto,
      total_vencido: contasPagar.total_vencido,
      quantidade_vencido: contasPagar.quantidade_vencido,
    },
    estoqueBaixoCount: estoqueBaixo.length,
    produtosParadosCount,
    concentracaoCliente: resolveConcentracao(
      rankingClientes,
      faturamentoClientes,
    ),
  };

  const healthScore = calculateHealthScore(input);
  const financeAlerts = buildIntelligenceAlerts(input);
  const qualidadeAlerts =
    qualidadeOperacional.hasData ||
    qualidadeOperacional.kpi.quantidadeRetornos > 0
      ? buildQualidadeOperacionalAlerts({
          tenantSlug,
          kpi: qualidadeOperacional.kpi,
          rankings: qualidadeOperacional.rankings,
          financeiro: qualidadeOperacional.financeiro,
        })
      : [];
  const alerts = [...financeAlerts, ...qualidadeAlerts];
  const priorities = buildPriorityCenter({ alerts, checklist });

  return {
    healthScore,
    alerts,
    priorities,
    checklist,
    activities,
  };
}
