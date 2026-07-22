import type { SupabaseClient } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

export type DescontoDashboardKpis = {
  totalDia: number;
  totalMes: number;
  percentualSobreFaturamento: number;
  qtdOs: number;
  qtdVendas: number;
  descontoMedio: number;
  maiorDesconto: number;
  margemPerdida: number;
  clientesRecorrentes: number;
};

export type DescontoDashboardData = {
  kpis: DescontoDashboardKpis;
  porMotivo: { label: string; valor: number }[];
  porDia: { label: string; valor: number }[];
  porAutorizador: { label: string; valor: number }[];
  eventos: Array<{
    id: string;
    created_at: string;
    entidade_tipo: string;
    entidade_id: string;
    valor_desconto: number;
    percentual: number;
    motivo: string;
    tipo_desconto: string | null;
    status: string;
  }>;
};

function startOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function startOfMonth(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export class DescontoDashboardService {
  constructor(
    private readonly supabase: SupabaseClient<Database>,
    private readonly tenantId: string,
  ) {}

  async getData(fromIso?: string, toIso?: string): Promise<DescontoDashboardData> {
    const from = fromIso ?? startOfMonth().toISOString();
    const to = toIso ?? new Date().toISOString();
    const diaIni = startOfDay().toISOString();

    const { data: eventos } = await this.supabase
      .from("desconto_eventos")
      .select(
        "id, created_at, entidade_tipo, entidade_id, valor_desconto, percentual, motivo, tipo_desconto, status, autorizador_id, margem_antes, margem_depois, cliente_id",
      )
      .eq("tenant_id", this.tenantId)
      .gte("created_at", from)
      .lte("created_at", to)
      .order("created_at", { ascending: false })
      .limit(500);

    const rows = (eventos ?? []) as Array<{
      id: string;
      created_at: string;
      entidade_tipo: string;
      entidade_id: string;
      valor_desconto: number;
      percentual: number;
      motivo: string;
      tipo_desconto: string | null;
      status: string;
      autorizador_id: string | null;
      margem_antes: number | null;
      margem_depois: number | null;
      cliente_id: string | null;
    }>;

    const aprovados = rows.filter((r) => r.status === "aprovado");
    const sum = (list: typeof aprovados) =>
      list.reduce((s, r) => s + Number(r.valor_desconto), 0);

    const doDia = aprovados.filter((r) => r.created_at >= diaIni);
    const totalMes = sum(aprovados);
    const totalDia = sum(doDia);

    const { data: vendasMes } = await this.supabase
      .from("vendas")
      .select("total")
      .eq("tenant_id", this.tenantId)
      .eq("status", "faturado")
      .is("deleted_at", null)
      .gte("data_venda", from.slice(0, 10));

    const faturamento = (vendasMes ?? []).reduce(
      (s, v) => s + Number(v.total),
      0,
    );

    const porMotivoMap = new Map<string, number>();
    const porDiaMap = new Map<string, number>();
    const porAuthMap = new Map<string, number>();

    for (const r of aprovados) {
      const motivo = r.tipo_desconto || r.motivo || "outro";
      porMotivoMap.set(motivo, (porMotivoMap.get(motivo) ?? 0) + Number(r.valor_desconto));
      const day = r.created_at.slice(0, 10);
      porDiaMap.set(day, (porDiaMap.get(day) ?? 0) + Number(r.valor_desconto));
      const auth = r.autorizador_id ?? "sem_autorizador";
      porAuthMap.set(auth, (porAuthMap.get(auth) ?? 0) + Number(r.valor_desconto));
    }

    const valores = aprovados.map((r) => Number(r.valor_desconto));
    const clientesSet = new Set(
      aprovados.map((r) => r.cliente_id).filter(Boolean),
    );

    return {
      kpis: {
        totalDia,
        totalMes,
        percentualSobreFaturamento:
          faturamento > 0
            ? Number(((totalMes / faturamento) * 100).toFixed(2))
            : 0,
        qtdOs: aprovados.filter((r) => r.entidade_tipo === "os").length,
        qtdVendas: aprovados.filter((r) => r.entidade_tipo === "venda").length,
        descontoMedio:
          valores.length > 0
            ? Number(
                (valores.reduce((a, b) => a + b, 0) / valores.length).toFixed(2),
              )
            : 0,
        maiorDesconto: valores.length ? Math.max(...valores) : 0,
        margemPerdida: aprovados.reduce((s, r) => {
          if (r.margem_antes == null || r.margem_depois == null) return s;
          return s + Math.max(0, Number(r.margem_antes) - Number(r.margem_depois));
        }, 0),
        clientesRecorrentes: clientesSet.size,
      },
      porMotivo: [...porMotivoMap.entries()]
        .map(([label, valor]) => ({ label, valor }))
        .sort((a, b) => b.valor - a.valor)
        .slice(0, 10),
      porDia: [...porDiaMap.entries()]
        .map(([label, valor]) => ({ label, valor }))
        .sort((a, b) => a.label.localeCompare(b.label)),
      porAutorizador: [...porAuthMap.entries()]
        .map(([label, valor]) => ({ label, valor }))
        .sort((a, b) => b.valor - a.valor)
        .slice(0, 10),
      eventos: aprovados.slice(0, 50).map((r) => ({
        id: r.id,
        created_at: r.created_at,
        entidade_tipo: r.entidade_tipo,
        entidade_id: r.entidade_id,
        valor_desconto: Number(r.valor_desconto),
        percentual: Number(r.percentual),
        motivo: r.motivo,
        tipo_desconto: r.tipo_desconto,
        status: r.status,
      })),
    };
  }
}

export async function createDescontoDashboardService(tenantId: string) {
  const supabase = await createClient();
  return new DescontoDashboardService(supabase, tenantId);
}
