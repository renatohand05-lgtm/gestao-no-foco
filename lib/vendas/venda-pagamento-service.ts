import type { SupabaseClient } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

export type VendaPagamentoInput = {
  forma_pagamento_id: string;
  valor: number;
  quantidade_parcelas?: number;
  taxa_percent?: number;
  data_prevista?: string | null;
  conta_bancaria_id?: string | null;
  observacao?: string | null;
};

export class VendaPagamentoService {
  constructor(
    private readonly supabase: SupabaseClient<Database>,
    private readonly tenantId: string,
  ) {}

  async replacePagamentos(
    vendaId: string,
    pagamentos: VendaPagamentoInput[],
    totalEsperado: number,
  ) {
    if (pagamentos.length === 0) {
      throw new Error("Informe ao menos uma forma de pagamento.");
    }

    const soma = pagamentos.reduce((s, p) => s + Number(p.valor), 0);
    if (Math.abs(soma - totalEsperado) > 0.01) {
      throw new Error(
        `Soma dos pagamentos (R$ ${soma.toFixed(2)}) deve igualar o total (R$ ${totalEsperado.toFixed(2)}).`,
      );
    }

    for (const p of pagamentos) {
      if (p.valor <= 0) throw new Error("Valor de pagamento deve ser positivo.");
      if ((p.quantidade_parcelas ?? 1) < 1) {
        throw new Error("Parcelas inválidas.");
      }
    }

    await this.supabase
      .from("venda_pagamentos")
      .delete()
      .eq("tenant_id", this.tenantId)
      .eq("venda_id", vendaId);

    const rows = pagamentos.map((p, i) => ({
      tenant_id: this.tenantId,
      venda_id: vendaId,
      forma_pagamento_id: p.forma_pagamento_id,
      valor: Number(p.valor.toFixed(2)),
      quantidade_parcelas: p.quantidade_parcelas ?? 1,
      taxa_percent: p.taxa_percent ?? 0,
      data_prevista: p.data_prevista || null,
      conta_bancaria_id: p.conta_bancaria_id || null,
      observacao: p.observacao || null,
      ordem: i,
    }));

    const { error } = await this.supabase.from("venda_pagamentos").insert(rows);
    if (error) throw new Error(error.message);

    // compat: principal = maior valor
    const principal = [...pagamentos].sort((a, b) => b.valor - a.valor)[0];
    await this.supabase
      .from("vendas")
      .update({
        forma_pagamento_id: principal.forma_pagamento_id,
        quantidade_parcelas: principal.quantidade_parcelas ?? 1,
      })
      .eq("id", vendaId)
      .eq("tenant_id", this.tenantId);
  }

  async listByVenda(vendaId: string) {
    const { data, error } = await this.supabase
      .from("venda_pagamentos")
      .select(
        "*, forma:formas_pagamento(id, nome, tipo)",
      )
      .eq("tenant_id", this.tenantId)
      .eq("venda_id", vendaId)
      .order("ordem");
    if (error) throw new Error(error.message);
    return data ?? [];
  }

  async faturarComPagamentos(vendaId: string, createdBy: string | null) {
    const { data, error } = await this.supabase.rpc(
      "faturar_venda_com_pagamentos_atomico",
      {
        p_tenant_id: this.tenantId,
        p_venda_id: vendaId,
        p_created_by: createdBy,
      },
    );
    if (error) throw new Error(error.message);
    return data as string;
  }
}

export async function createVendaPagamentoService(tenantId: string) {
  const supabase = await createClient();
  return new VendaPagamentoService(supabase, tenantId);
}
