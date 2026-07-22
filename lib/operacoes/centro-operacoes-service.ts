import type { SupabaseClient } from "@supabase/supabase-js";

import {
  OPERACAO_BOARD_COLUMNS,
  OS_STATUS_TERMINAL,
  type OperacaoBoardColumnKey,
} from "@/lib/operacoes/metricas";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

export type CentroOpsCard = {
  key: string;
  label: string;
  count: number;
  hrefFilter: string;
  tone?: "default" | "warn" | "danger" | "ok";
};

export type OperacaoBoardCard = {
  id: string;
  numero: number;
  status: string;
  clienteNome: string | null;
  placa: string | null;
  modelo: string | null;
  dataAbertura: string;
  previsaoEntrega: string | null;
  mecanicoId: string | null;
  mecanicoNome: string | null;
  consultorId: string | null;
  consultorNome: string | null;
  valorEstimado: number;
  prioridade: string;
  atrasada: boolean;
  semAtualizacao: boolean;
  isGarantia: boolean;
  isRetorno: boolean;
  horasNaEtapa: number | null;
  columnKey: OperacaoBoardColumnKey | "outros";
};

export type CentroOperacoesData = {
  cards: CentroOpsCard[];
  board: Record<string, OperacaoBoardCard[]>;
  syncedAt: string;
};

type OsRow = {
  id: string;
  numero: number;
  status: string;
  data_abertura: string;
  previsao_entrega: string | null;
  valor_total: number;
  prioridade: string;
  mecanico_id: string | null;
  consultor_id: string | null;
  updated_at: string;
  ordem_retorno_id: string | null;
  garantia_dias: number | null;
  tipo_abertura: string | null;
  cliente: { nome: string } | null;
  veiculo: { placa: string; modelo: string | null } | null;
};

function isoToday() {
  return new Date().toISOString().slice(0, 10);
}

function hoursSince(iso: string) {
  const ms = Date.now() - new Date(iso).getTime();
  return Math.max(0, Math.round(ms / (1000 * 60 * 60)));
}

function columnForStatus(status: string): OperacaoBoardColumnKey | "outros" {
  for (const col of OPERACAO_BOARD_COLUMNS) {
    if ((col.statuses as readonly string[]).includes(status)) {
      return col.key;
    }
  }
  return "outros";
}

export class CentroOperacoesService {
  constructor(
    private readonly supabase: SupabaseClient<Database>,
    private readonly tenantId: string,
  ) {}

  async getData(tenantSlug: string): Promise<CentroOperacoesData> {
    const hoje = isoToday();
    const limiarSemUpdate = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

    const { data, error } = await this.supabase
      .from("ordens_servico")
      .select(
        "id, numero, status, data_abertura, previsao_entrega, valor_total, prioridade, mecanico_id, consultor_id, updated_at, ordem_retorno_id, garantia_dias, tipo_abertura, cliente:clientes(nome), veiculo:veiculos(placa, modelo)",
      )
      .eq("tenant_id", this.tenantId)
      .is("deleted_at", null)
      .is("arquivado_em", null)
      .order("data_abertura", { ascending: false })
      .limit(400);

    let rows = (data ?? []) as unknown as OsRow[];
    if (error && /arquivado_em/i.test(error.message)) {
      const retry = await this.supabase
        .from("ordens_servico")
        .select(
          "id, numero, status, data_abertura, previsao_entrega, valor_total, prioridade, mecanico_id, consultor_id, updated_at, ordem_retorno_id, garantia_dias, tipo_abertura, cliente:clientes(nome), veiculo:veiculos(placa, modelo)",
        )
        .eq("tenant_id", this.tenantId)
        .is("deleted_at", null)
        .order("data_abertura", { ascending: false })
        .limit(400);
      if (retry.error) throw new Error(retry.error.message);
      rows = (retry.data ?? []) as unknown as OsRow[];
    } else if (error) {
      throw new Error(error.message);
    }

    const abertas = rows.filter((r) => !OS_STATUS_TERMINAL.has(r.status));
    const naOficina = abertas.filter((r) => r.veiculo?.placa);
    const atrasadas = abertas.filter(
      (r) => r.previsao_entrega && r.previsao_entrega.slice(0, 10) < hoje,
    );
    const finalizadasHoje = rows.filter((r) => {
      if (!["entregue", "faturado"].includes(r.status)) return false;
      // updated_at do dia como proxy de finalização recente
      return r.updated_at.slice(0, 10) === hoje;
    });

    const countStatus = (...statuses: string[]) =>
      rows.filter((r) => statuses.includes(r.status)).length;

    const listBase = `/${tenantSlug}/ordens`;
    const qs = (status: string) => `${listBase}?status=${encodeURIComponent(status)}`;

    const cards: CentroOpsCard[] = [
      {
        key: "carros",
        label: "Carros na oficina",
        count: naOficina.length,
        hrefFilter: listBase,
        tone: "default",
      },
      {
        key: "abertas",
        label: "OS abertas",
        count: abertas.length,
        hrefFilter: listBase,
      },
      {
        key: "diagnostico",
        label: "Em diagnóstico",
        count: countStatus(
          "aguardando_diagnostico",
          "diagnostico_concluido",
        ),
        hrefFilter: qs("aguardando_diagnostico"),
      },
      {
        key: "orcamento",
        label: "Em orçamento",
        count: countStatus("aguardando_orcamento"),
        hrefFilter: qs("aguardando_orcamento"),
      },
      {
        key: "aprovacao",
        label: "Aguardando aprovação",
        count: countStatus("aguardando_aprovacao"),
        hrefFilter: qs("aguardando_aprovacao"),
        tone: "warn",
      },
      {
        key: "pecas",
        label: "Aguardando peças",
        count: countStatus("aguardando_peca"),
        hrefFilter: qs("aguardando_peca"),
        tone: "warn",
      },
      {
        key: "execucao",
        label: "Em execução",
        count: countStatus("em_execucao", "aprovado", "parcialmente_aprovado"),
        hrefFilter: qs("em_execucao"),
      },
      {
        key: "pronto",
        label: "Prontas para entrega",
        count: countStatus("pronto_para_entrega"),
        hrefFilter: qs("pronto_para_entrega"),
        tone: "ok",
      },
      {
        key: "finalizadas_hoje",
        label: "Finalizadas hoje",
        count: finalizadasHoje.length,
        hrefFilter: `${listBase}?status=entregue`,
      },
      {
        key: "atrasadas",
        label: "Atrasadas",
        count: atrasadas.length,
        hrefFilter: listBase,
        tone: atrasadas.length ? "danger" : "default",
      },
      {
        key: "canceladas",
        label: "Canceladas",
        count: countStatus("cancelado", "cancelada"),
        hrefFilter: qs("cancelado"),
      },
      {
        key: "retornos",
        label: "Retornos / garantias",
        count: countStatus("retorno", "garantia"),
        hrefFilter: qs("retorno"),
        tone: "warn",
      },
    ];

    const profileIds = new Set<string>();
    for (const r of rows) {
      if (r.mecanico_id) profileIds.add(r.mecanico_id);
      if (r.consultor_id) profileIds.add(r.consultor_id);
    }
    const nameById = new Map<string, string>();
    if (profileIds.size) {
      const { data: profiles } = await this.supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", [...profileIds]);
      for (const p of profiles ?? []) {
        nameById.set(p.id, p.full_name || p.id.slice(0, 8));
      }
    }

    const board: Record<string, OperacaoBoardCard[]> = {};
    for (const col of OPERACAO_BOARD_COLUMNS) {
      board[col.key] = [];
    }
    board.outros = [];

    for (const r of rows) {
      if (r.status === "cancelado" || r.status === "cancelada") continue;
      const col = columnForStatus(r.status);
      const atrasada = Boolean(
        r.previsao_entrega &&
          r.previsao_entrega.slice(0, 10) < hoje &&
          !OS_STATUS_TERMINAL.has(r.status),
      );
      const card: OperacaoBoardCard = {
        id: r.id,
        numero: Number(r.numero),
        status: r.status,
        clienteNome: r.cliente?.nome ?? null,
        placa: r.veiculo?.placa ?? null,
        modelo: r.veiculo?.modelo ?? null,
        dataAbertura: r.data_abertura,
        previsaoEntrega: r.previsao_entrega,
        mecanicoId: r.mecanico_id,
        mecanicoNome: r.mecanico_id
          ? (nameById.get(r.mecanico_id) ?? null)
          : null,
        consultorId: r.consultor_id,
        consultorNome: r.consultor_id
          ? (nameById.get(r.consultor_id) ?? null)
          : null,
        valorEstimado: Number(r.valor_total ?? 0),
        prioridade: r.prioridade || "normal",
        atrasada,
        semAtualizacao:
          !OS_STATUS_TERMINAL.has(r.status) &&
          r.updated_at < limiarSemUpdate,
        isGarantia:
          r.status === "garantia" ||
          (r.garantia_dias != null && r.garantia_dias > 0),
        isRetorno: r.status === "retorno" || Boolean(r.ordem_retorno_id),
        horasNaEtapa: hoursSince(r.updated_at),
        columnKey: col,
      };
      (board[col] ??= []).push(card);
    }

    return {
      cards,
      board,
      syncedAt: new Date().toISOString(),
    };
  }
}

export async function createCentroOperacoesService(tenantId: string) {
  const supabase = await createClient();
  return new CentroOperacoesService(supabase, tenantId);
}
