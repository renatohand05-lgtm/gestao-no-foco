/**
 * Retrato dos dados da empresa que o assistente enxerga.
 * Vem da função `ai_assistant_snapshot` do banco (roda com as permissões do
 * usuário, sem telefone/CPF/e-mail de ninguém). Toda seção é opcional: se
 * uma parte falhar ou não houver dados, ela simplesmente vem vazia ou com
 * `erro` — a conversa nunca quebra por isso.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

export type SnapshotValorQtd = { qtd: number; valor: number };

export type SnapshotOsEmAndamento = {
  numero: number | string;
  status: string;
  cliente: string | null;
  veiculo: string | null;
  placa: string | null;
  mecanico: string | null;
  valor: number;
  dias_desde_abertura: number;
  dias_sem_movimento: number;
  previsao_entrega: string | null;
  atrasada: boolean;
};

export type AiSnapshot = {
  hoje?: string;
  dia_do_mes?: number;
  dias_no_mes?: number;
  empresa?: {
    nome?: string;
    segmento?: string | null;
    base_faturamento?: string;
    erro?: string;
  };
  faturamento?: {
    erro?: string;
    historico_desde?: string | null;
    serie_13_meses?: Array<{ mes: string; valor: number; qtd: number }>;
    mes_atual?: {
      valor: number;
      qtd: number;
      ticket_medio: number | null;
      projecao_linear_fim_do_mes: number | null;
    };
    mes_anterior?: {
      valor: number;
      qtd: number;
      ticket_medio: number | null;
      ate_o_mesmo_dia: number;
    };
  };
  metas?: {
    erro?: string;
    tem_meta_no_mes?: boolean;
    mes_atual?: {
      meta: number;
      realizado: number;
      percentual_atingido: number;
      falta_para_meta: number;
      dias_restantes_no_mes: number;
      faturamento_diario_necessario: number | null;
      faturamento_diario_atual: number | null;
    } | null;
    proximos_meses?: Array<{ mes: string; meta: number }>;
    ano?: {
      meses_com_meta: number;
      meta_dos_meses_com_meta: number;
      realizado_nesses_meses: number;
      percentual_atingido: number;
    } | null;
  };
  os?: {
    erro?: string;
    em_andamento_por_status?: Record<string, SnapshotValorQtd>;
    em_andamento_lista?: SnapshotOsEmAndamento[];
    rascunhos?: number;
    ultimos_90_dias?: {
      faturadas_qtd: number;
      faturadas_valor: number;
      ticket_medio: number | null;
      canceladas_qtd: number;
      canceladas_valor: number;
      retornos_retrabalho_qtd: number;
      descontos_concedidos: number;
      descontos_percentual_do_bruto: number | null;
      faturadas_sem_mecanico_percentual: number | null;
      faturadas_sem_veiculo_percentual: number | null;
    };
  };
  itens?: {
    erro?: string;
    receita_em_itens_genericos_percentual?: number | null;
  } & Record<string, unknown>;
  equipe_90d?: Array<Record<string, unknown>>;
  marcas_veiculos_12m?: Array<Record<string, unknown>>;
  clientes?: {
    erro?: string;
    faturamento_sem_cliente_identificado_12m?: {
      qtd: number;
      valor: number;
      percentual_do_faturamento: number | null;
    };
    cadastrados?: number;
    novos_ultimos_30_dias?: number;
    compraram_ultimos_90_dias?: number;
    sem_comprar_ha_mais_de_90_dias?: number;
    recorrentes_2_ou_mais_compras?: number;
    concentracao_top5_percentual_12m?: number | null;
    melhores_clientes_12m?: Array<Record<string, unknown>>;
    para_reativar?: Array<{
      nome: string;
      ultima_compra: string;
      dias_sem_comprar: number;
      total_gasto: number;
      compras: number;
      ticket_medio: number;
    }>;
  };
  financeiro?: {
    erro?: string;
    contas_a_pagar?: {
      em_aberto: SnapshotValorQtd;
      vencidas: SnapshotValorQtd;
      vencem_em_7_dias: SnapshotValorQtd;
      vencem_em_30_dias: SnapshotValorQtd;
      proximas: Array<{
        fornecedor: string;
        descricao: string | null;
        valor: number;
        vencimento: string;
        dias_para_vencer: number;
      }>;
    };
    contas_a_receber?: {
      em_aberto: SnapshotValorQtd;
      vencidas: SnapshotValorQtd;
      vencem_em_7_dias: SnapshotValorQtd;
      vencem_em_30_dias: SnapshotValorQtd;
      maiores_vencidas: Array<{
        cliente: string | null;
        descricao: string | null;
        valor: number;
        vencimento: string;
        dias_em_atraso: number;
      }>;
    };
    saldo_em_contas?: number;
  };
  despesas?: {
    erro?: string;
    total_mes_atual?: number;
    total_mes_anterior?: number;
    por_categoria?: Array<{
      categoria: string;
      mes_atual: number;
      mes_anterior: number;
    }>;
    maiores_lancamentos_mes_atual?: Array<Record<string, unknown>>;
  };
  estoque?: {
    erro?: string;
    produtos_fisicos?: number;
    abaixo_do_minimo_qtd?: number;
    zerados_qtd?: number;
    valor_em_estoque_a_custo?: number;
    itens_para_repor?: Array<{ nome: string; atual: number; minimo: number }>;
  };
};

/** Busca o retrato no banco. Devolve null se a função falhar ou não houver acesso. */
export async function loadAiAssistantSnapshot(
  client: SupabaseClient<Database>,
  tenantId: string,
): Promise<AiSnapshot | null> {
  const { data, error } = await client.rpc("ai_assistant_snapshot", {
    p_tenant: tenantId,
  });
  if (error || !data || typeof data !== "object" || Array.isArray(data)) {
    return null;
  }
  return data as unknown as AiSnapshot;
}
