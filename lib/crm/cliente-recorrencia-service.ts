import type { SupabaseClient } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

export type ClienteRecorrencia = {
  isRecorrente: boolean;
  qtdOs: number;
  qtdCompras: number;
  valorTotal: number;
  ticketMedio: number;
  ultimaCompra: string | null;
  diasComoCliente: number;
  descontoMedio: number;
  descontos30: number;
  descontos90: number;
  descontos365: number;
  alertaAbusoDesconto: boolean;
};

export class ClienteRecorrenciaService {
  constructor(
    private readonly supabase: SupabaseClient<Database>,
    private readonly tenantId: string,
  ) {}

  async get(clienteId: string): Promise<ClienteRecorrencia> {
    const [{ count: qtdOs }, { data: vendas }, { data: cliente }, { data: descontos }] =
      await Promise.all([
        this.supabase
          .from("ordens_servico")
          .select("id", { count: "exact", head: true })
          .eq("tenant_id", this.tenantId)
          .eq("cliente_id", clienteId)
          .is("deleted_at", null)
          .neq("status", "cancelado"),
        this.supabase
          .from("vendas")
          .select("total, data_venda, desconto_total")
          .eq("tenant_id", this.tenantId)
          .eq("cliente_id", clienteId)
          .eq("status", "faturado")
          .is("deleted_at", null),
        this.supabase
          .from("clientes")
          .select("created_at")
          .eq("id", clienteId)
          .maybeSingle(),
        this.supabase
          .from("desconto_eventos" as never)
          .select("valor_desconto, created_at, status")
          .eq("tenant_id", this.tenantId)
          .eq("cliente_id", clienteId)
          .eq("status", "aprovado"),
      ]);

    const vendasRows = vendas ?? [];
    const valorTotal = vendasRows.reduce((s, v) => s + Number(v.total), 0);
    const qtdCompras = vendasRows.length;
    const ultimaCompra =
      vendasRows
        .map((v) => v.data_venda)
        .sort()
        .at(-1) ?? null;

    const created = cliente?.created_at
      ? new Date(cliente.created_at).getTime()
      : Date.now();
    const diasComoCliente = Math.max(
      0,
      Math.floor((Date.now() - created) / (1000 * 60 * 60 * 24)),
    );

    const now = Date.now();
    const since = (days: number) =>
      new Date(now - days * 86400000).toISOString();

    const descRows = (descontos ?? []) as {
      valor_desconto: number;
      created_at: string;
    }[];

    const sumDays = (days: number) =>
      descRows
        .filter((d) => d.created_at >= since(days))
        .reduce((s, d) => s + Number(d.valor_desconto), 0);

    const descontos365 = sumDays(365);
    const descontoMedio =
      descRows.length > 0
        ? Number(
            (
              descRows.reduce((s, d) => s + Number(d.valor_desconto), 0) /
              descRows.length
            ).toFixed(2),
          )
        : 0;

    const isRecorrente =
      (qtdOs ?? 0) + qtdCompras >= 3 ||
      (qtdCompras >= 2 && diasComoCliente >= 30);

    return {
      isRecorrente,
      qtdOs: qtdOs ?? 0,
      qtdCompras,
      valorTotal: Number(valorTotal.toFixed(2)),
      ticketMedio:
        qtdCompras > 0
          ? Number((valorTotal / qtdCompras).toFixed(2))
          : 0,
      ultimaCompra,
      diasComoCliente,
      descontoMedio,
      descontos30: sumDays(30),
      descontos90: sumDays(90),
      descontos365,
      alertaAbusoDesconto: descontos365 > valorTotal * 0.2 && valorTotal > 0,
    };
  }
}

export async function createClienteRecorrenciaService(tenantId: string) {
  const supabase = await createClient();
  return new ClienteRecorrenciaService(supabase, tenantId);
}
