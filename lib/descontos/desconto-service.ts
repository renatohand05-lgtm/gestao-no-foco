import type { SupabaseClient } from "@supabase/supabase-js";

import type { TenantRole } from "@/lib/constants";
import {
  roleToDescontoCargo,
  type DescontoCargo,
  type DescontoTipo,
} from "@/lib/permissoes/constants";
import { createClient } from "@/lib/supabase/server";
import type { Database, Json } from "@/types/database";

export type DescontoAvaliacaoInput = {
  valorOriginal: number;
  descontoValor: number;
  descontoPercentual: number;
  margemPercentual?: number | null;
  motivo: string;
  tipo: DescontoTipo;
  solicitanteId: string | null;
  role: TenantRole;
};

export type DescontoAvaliacaoResult =
  | {
      status: "aprovado";
      valorDesconto: number;
      percentual: number;
      valorFinal: number;
      autorizadorCargo: DescontoCargo;
    }
  | {
      status: "pendente_aprovacao" | "bloqueado";
      valorDesconto: number;
      percentual: number;
      valorFinal: number;
      motivoBloqueio: string;
      autorizadorCargo: DescontoCargo;
    };

export type DescontoEventoInput = {
  entidadeTipo: "os" | "venda";
  entidadeId: string;
  clienteId?: string | null;
  solicitanteId?: string | null;
  autorizadorId?: string | null;
  cargoAutorizador?: string | null;
  valorOriginal: number;
  valorDesconto: number;
  percentual: number;
  valorFinal: number;
  margemAntes?: number | null;
  margemDepois?: number | null;
  tipoDesconto?: string | null;
  motivo: string;
  status: string;
  observacao?: string | null;
  payload?: Json;
};

export class DescontoService {
  constructor(
    private readonly supabase: SupabaseClient<Database>,
    private readonly tenantId: string,
  ) {}

  async getAlcada(cargo: DescontoCargo) {
    const { data } = await this.supabase
      .from("desconto_alcadas")
      .select("*")
      .eq("tenant_id", this.tenantId)
      .eq("cargo", cargo)
      .eq("ativo", true)
      .maybeSingle();

    if (data) return data as {
      limite_percentual: number;
      limite_valor: number | null;
      margem_minima_percentual: number;
      pode_aprovar_acima: boolean;
    };

    // defaults offline se migration não aplicada
    const defaults: Record<
      DescontoCargo,
      {
        limite_percentual: number;
        limite_valor: number | null;
        margem_minima_percentual: number;
        pode_aprovar_acima: boolean;
      }
    > = {
      membro: {
        limite_percentual: 0,
        limite_valor: null,
        margem_minima_percentual: 15,
        pode_aprovar_acima: false,
      },
      supervisor_operacao: {
        limite_percentual: 5,
        limite_valor: null,
        margem_minima_percentual: 10,
        pode_aprovar_acima: true,
      },
      gerente_operacao: {
        limite_percentual: 15,
        limite_valor: null,
        margem_minima_percentual: 5,
        pode_aprovar_acima: true,
      },
      admin: {
        limite_percentual: 30,
        limite_valor: null,
        margem_minima_percentual: 0,
        pode_aprovar_acima: true,
      },
      owner: {
        limite_percentual: 100,
        limite_valor: null,
        margem_minima_percentual: 0,
        pode_aprovar_acima: true,
      },
    };
    return defaults[cargo];
  }

  avaliar(input: DescontoAvaliacaoInput): DescontoAvaliacaoResult {
    const cargo = roleToDescontoCargo(input.role);
    const original = Math.max(0, Number(input.valorOriginal) || 0);
    let valorDesc = Math.max(0, Number(input.descontoValor) || 0);
    let pct = Math.max(0, Number(input.descontoPercentual) || 0);

    if (!input.motivo?.trim()) {
      return {
        status: "bloqueado",
        valorDesconto: 0,
        percentual: 0,
        valorFinal: original,
        motivoBloqueio: "Informe o motivo do desconto.",
        autorizadorCargo: cargo,
      };
    }

    if (pct > 0 && valorDesc <= 0 && original > 0) {
      valorDesc = Number(((original * pct) / 100).toFixed(2));
    }
    if (valorDesc > 0 && pct <= 0 && original > 0) {
      pct = Number(((valorDesc / original) * 100).toFixed(4));
    }

    if (valorDesc > original) {
      return {
        status: "bloqueado",
        valorDesconto: valorDesc,
        percentual: pct,
        valorFinal: original,
        motivoBloqueio: "Desconto não pode ser maior que o valor.",
        autorizadorCargo: cargo,
      };
    }

    const valorFinal = Number((original - valorDesc).toFixed(2));
    if (valorFinal < 0) {
      return {
        status: "bloqueado",
        valorDesconto: valorDesc,
        percentual: pct,
        valorFinal: original,
        motivoBloqueio: "Preço final não pode ser negativo.",
        autorizadorCargo: cargo,
      };
    }

    // sync resolve alçada async — caller should use avaliarAsync
    return {
      status: "aprovado",
      valorDesconto: valorDesc,
      percentual: pct,
      valorFinal,
      autorizadorCargo: cargo,
    };
  }

  async avaliarAsync(
    input: DescontoAvaliacaoInput,
  ): Promise<DescontoAvaliacaoResult> {
    const base = this.avaliar(input);
    if (base.status === "bloqueado") return base;

    const cargo = roleToDescontoCargo(input.role);
    const alcada = await this.getAlcada(cargo);
    const { valorDesconto, percentual, valorFinal } = base;

    if (percentual > alcada.limite_percentual) {
      if (alcada.pode_aprovar_acima && cargo !== "membro") {
        return {
          status: "pendente_aprovacao",
          valorDesconto,
          percentual,
          valorFinal,
          motivoBloqueio: `Desconto ${percentual}% acima da alçada (${alcada.limite_percentual}%). Solicite aprovação superior.`,
          autorizadorCargo: cargo,
        };
      }
      return {
        status: "bloqueado",
        valorDesconto,
        percentual,
        valorFinal,
        motivoBloqueio: `Desconto acima do limite do seu cargo (${alcada.limite_percentual}%).`,
        autorizadorCargo: cargo,
      };
    }

    if (
      alcada.limite_valor != null &&
      valorDesconto > Number(alcada.limite_valor)
    ) {
      return {
        status: "pendente_aprovacao",
        valorDesconto,
        percentual,
        valorFinal,
        motivoBloqueio: `Valor de desconto acima do limite em R$ do seu cargo.`,
        autorizadorCargo: cargo,
      };
    }

    if (
      input.margemPercentual != null &&
      input.margemPercentual < alcada.margem_minima_percentual
    ) {
      return {
        status: "pendente_aprovacao",
        valorDesconto,
        percentual,
        valorFinal,
        motivoBloqueio: `Margem ${input.margemPercentual.toFixed(1)}% abaixo do mínimo (${alcada.margem_minima_percentual}%).`,
        autorizadorCargo: cargo,
      };
    }

    return {
      status: "aprovado",
      valorDesconto,
      percentual,
      valorFinal,
      autorizadorCargo: cargo,
    };
  }

  async recordEvent(input: DescontoEventoInput): Promise<void> {
    const { error } = await this.supabase.from("desconto_eventos").insert({
      tenant_id: this.tenantId,
      entidade_tipo: input.entidadeTipo,
      entidade_id: input.entidadeId,
      cliente_id: input.clienteId ?? null,
      solicitante_id: input.solicitanteId ?? null,
      autorizador_id: input.autorizadorId ?? null,
      cargo_autorizador: input.cargoAutorizador ?? null,
      valor_original: input.valorOriginal,
      valor_desconto: input.valorDesconto,
      percentual: input.percentual,
      valor_final: input.valorFinal,
      margem_antes: input.margemAntes ?? null,
      margem_depois: input.margemDepois ?? null,
      tipo_desconto: input.tipoDesconto ?? null,
      motivo: input.motivo,
      status: input.status,
      observacao: input.observacao ?? null,
      payload: input.payload ?? {},
    });

    if (error) {
      console.error("[desconto_eventos]", error.message);
    }
  }

  async getClienteDescontoStats(clienteId: string) {
    const now = new Date();
    const since = (days: number) => {
      const d = new Date(now);
      d.setDate(d.getDate() - days);
      return d.toISOString();
    };

    const { data } = await this.supabase
      .from("desconto_eventos")
      .select("valor_desconto, created_at, status")
      .eq("tenant_id", this.tenantId)
      .eq("cliente_id", clienteId)
      .eq("status", "aprovado")
      .gte("created_at", since(365));

    const rows = (data ?? []) as {
      valor_desconto: number;
      created_at: string;
    }[];

    const sumSince = (days: number) =>
      rows
        .filter((r) => r.created_at >= since(days))
        .reduce((s, r) => s + Number(r.valor_desconto), 0);

    return {
      total30: sumSince(30),
      total90: sumSince(90),
      total365: sumSince(365),
      quantidade365: rows.length,
    };
  }
}

export async function createDescontoService(tenantId: string) {
  const supabase = await createClient();
  return new DescontoService(supabase, tenantId);
}
