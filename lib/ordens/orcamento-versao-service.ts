import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { createOrdemServicoService } from "@/lib/ordens/ordem-servico-service";
import { DEFAULT_ORCAMENTO_AVISO } from "@/lib/ordens/inspecao-aviso";
import { canEditOrcamento, OS_STATUS_LABELS, type OsStatus } from "@/lib/ordens/os-status";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

export type PublicarOrcamentoInput = {
  prazoEstimadoDias?: number | null;
  validadeDias?: number | null;
  justificativa?: string | null;
};

export type OrcamentoVersaoRecord = {
  id: string;
  tenant_id: string;
  ordem_servico_id: string;
  versao: number;
  status: string;
  subtotal: number;
  desconto_total: number;
  acrescimo_total: number;
  valor_total: number;
  prazo_estimado_dias: number | null;
  aviso_texto: string;
  aviso_versao: number;
  validade_ate: string | null;
  publicado_em: string | null;
  publicado_por: string | null;
  supersede_de: string | null;
  justificativa_revisao: string | null;
  created_at: string;
  updated_at: string;
};

export type OrcamentoVersaoItemRecord = {
  id: string;
  versao_id: string;
  item_origem_id: string | null;
  descricao: string;
  tipo_item: string;
  categoria_item: string;
  quantidade: number;
  valor_unitario: number;
  desconto: number;
  acrescimo: number;
  valor_total: number;
  produto_id: string | null;
  recomendacao: string;
  prazo_peca: string | null;
  disponibilidade: string | null;
  ordem: number;
};

export type OrcamentoVersaoDetail = OrcamentoVersaoRecord & {
  itens: OrcamentoVersaoItemRecord[];
};

export type OrcamentoVersaoDiff = {
  added: OrcamentoVersaoItemRecord[];
  removed: OrcamentoVersaoItemRecord[];
  changed: Array<{
    before: OrcamentoVersaoItemRecord;
    after: OrcamentoVersaoItemRecord;
    fields: string[];
  }>;
  totals: {
    before: { subtotal: number; valor_total: number };
    after: { subtotal: number; valor_total: number };
  };
};


/**
 * Publicação de versão de orçamento — snapshot imutável dos itens vivos.
 *
 * REGRA FINANCEIRA (Gate 1):
 * - NÃO cria receita, contas a receber ou movimentação bancária.
 * - NÃO baixa estoque nem reserva peças.
 * - NÃO gera venda/faturamento — isso ocorre apenas em OrdemServicoService.faturar().
 */
export class OrcamentoVersaoService {
  constructor(
    private readonly supabase: SupabaseClient<Database>,
    private readonly tenantId: string,
  ) {}

  async publishVersion(
    osId: string,
    input: PublicarOrcamentoInput,
    userId: string | null,
  ): Promise<OrcamentoVersaoDetail> {
    const osService = await createOrdemServicoService(this.tenantId);
    const os = await osService.getById(osId);
    if (!os) throw new Error("OS não encontrada.");

    if (os.itens.length === 0) {
      throw new Error("Adicione itens ao orçamento antes de publicar.");
    }

    if (!canEditOrcamento(os.status) && os.status !== "aguardando_aprovacao") {
      throw new Error(
        `Status atual (${OS_STATUS_LABELS[os.status as OsStatus] ?? os.status}) não permite publicar orçamento.`,
      );
    }

    const aviso = await this.loadAvisoTexto();
    const nextVersao = await this.nextVersionNumber(osId);
    const previousPublicado = await this.findLatestPublicada(osId);

    const subtotal = os.itens.reduce(
      (acc, item) =>
        acc + item.valor_total + item.desconto - item.acrescimo,
      0,
    );
    const descontoTotal = os.itens.reduce((acc, item) => acc + item.desconto, 0);
    const acrescimoTotal = os.itens.reduce((acc, item) => acc + item.acrescimo, 0);
    const valorTotal = os.itens.reduce((acc, item) => acc + item.valor_total, 0);

    const validadeAte =
      input.validadeDias != null && input.validadeDias > 0
        ? new Date(Date.now() + input.validadeDias * 86_400_000).toISOString()
        : null;

    const now = new Date().toISOString();

    if (previousPublicado) {
      const { error: supersedeError } = await this.supabase
        .from("ordem_servico_orcamento_versoes" as never)
        .update({ status: "supersedido", updated_at: now } as never)
        .eq("id", previousPublicado.id)
        .eq("tenant_id", this.tenantId)
        .is("deleted_at", null);

      if (supersedeError) throw new Error(supersedeError.message);
    }

    const { data: versao, error: versaoError } = await this.supabase
      .from("ordem_servico_orcamento_versoes" as never)
      .insert({
        tenant_id: this.tenantId,
        ordem_servico_id: osId,
        versao: nextVersao,
        status: "publicado",
        subtotal: Number(subtotal.toFixed(2)),
        desconto_total: Number(descontoTotal.toFixed(2)),
        acrescimo_total: Number(acrescimoTotal.toFixed(2)),
        valor_total: Number(valorTotal.toFixed(2)),
        prazo_estimado_dias: input.prazoEstimadoDias ?? null,
        aviso_texto: aviso.conteudo,
        aviso_versao: aviso.versao,
        validade_ate: validadeAte,
        publicado_em: now,
        publicado_por: userId,
        supersede_de: previousPublicado?.id ?? null,
        justificativa_revisao: input.justificativa ?? null,
      } as never)
      .select("*")
      .single();

    if (versaoError) throw new Error(versaoError.message);

    const versaoId = (versao as { id: string }).id;
    const snapshotRows = os.itens.map((item, index) => ({
      tenant_id: this.tenantId,
      versao_id: versaoId,
      item_origem_id: item.id,
      descricao: item.descricao,
      tipo_item: item.tipo_item,
      categoria_item: item.categoria_item,
      quantidade: item.quantidade,
      valor_unitario: item.valor_unitario,
      desconto: item.desconto,
      acrescimo: item.acrescimo,
      valor_total: item.valor_total,
      produto_id: item.produto_id,
      recomendacao: "recomendado",
      prazo_peca: null,
      disponibilidade: null,
      ordem: index,
    }));

    const { error: itensError } = await this.supabase
      .from("ordem_servico_orcamento_itens" as never)
      .insert(snapshotRows as never);

    if (itensError) throw new Error(itensError.message);

    await this.supabase.from("ordem_servico_eventos" as never).insert({
      tenant_id: this.tenantId,
      ordem_servico_id: osId,
      tipo: "orcamento_publicado",
      descricao: `Orçamento v${nextVersao} publicado para aprovação do cliente`,
      estado_anterior: os.status,
      estado_posterior: "aguardando_aprovacao",
      motivo: input.justificativa ?? null,
      entidade_tipo: "ordem_servico_orcamento_versao",
      entidade_id: versaoId,
      user_id: userId,
    } as never);

    if (os.status !== "aguardando_aprovacao") {
      await osService.changeStatus(
        osId,
        {
          status: "aguardando_aprovacao",
          motivo: `Orçamento v${nextVersao} publicado`,
        },
        userId,
      );
    }

    const detail = await this.getVersion(versaoId);
    if (!detail) throw new Error("Erro ao carregar versão publicada.");
    return detail;
  }

  async listVersions(osId: string): Promise<OrcamentoVersaoRecord[]> {
    const { data, error } = await this.supabase
      .from("ordem_servico_orcamento_versoes" as never)
      .select("*")
      .eq("tenant_id", this.tenantId)
      .eq("ordem_servico_id", osId)
      .is("deleted_at", null)
      .order("versao", { ascending: false });

    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as OrcamentoVersaoRecord[];
  }

  async getVersion(versionId: string): Promise<OrcamentoVersaoDetail | null> {
    const { data: versao, error } = await this.supabase
      .from("ordem_servico_orcamento_versoes" as never)
      .select("*")
      .eq("id", versionId)
      .eq("tenant_id", this.tenantId)
      .is("deleted_at", null)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!versao) return null;

    const { data: itens, error: itensError } = await this.supabase
      .from("ordem_servico_orcamento_itens" as never)
      .select("*")
      .eq("versao_id", versionId)
      .eq("tenant_id", this.tenantId)
      .order("ordem");

    if (itensError) throw new Error(itensError.message);

    return {
      ...(versao as unknown as OrcamentoVersaoRecord),
      itens: (itens ?? []) as unknown as OrcamentoVersaoItemRecord[],
    };
  }

  async diffVersions(
    versionIdA: string,
    versionIdB: string,
  ): Promise<OrcamentoVersaoDiff> {
    const [a, b] = await Promise.all([
      this.getVersion(versionIdA),
      this.getVersion(versionIdB),
    ]);

    if (!a || !b) {
      throw new Error("Uma ou ambas as versões não foram encontradas.");
    }

    if (a.ordem_servico_id !== b.ordem_servico_id) {
      throw new Error("Versões pertencem a ordens de serviço diferentes.");
    }

    const mapByOrigem = (items: OrcamentoVersaoItemRecord[]) => {
      const map = new Map<string, OrcamentoVersaoItemRecord>();
      for (const item of items) {
        const key = item.item_origem_id ?? item.id;
        map.set(key, item);
      }
      return map;
    };

    const mapA = mapByOrigem(a.itens);
    const mapB = mapByOrigem(b.itens);

    const added: OrcamentoVersaoItemRecord[] = [];
    const removed: OrcamentoVersaoItemRecord[] = [];
    const changed: OrcamentoVersaoDiff["changed"] = [];

    for (const [key, itemB] of mapB) {
      const itemA = mapA.get(key);
      if (!itemA) {
        added.push(itemB);
        continue;
      }

      const fields: string[] = [];
      const compareFields: Array<keyof OrcamentoVersaoItemRecord> = [
        "descricao",
        "quantidade",
        "valor_unitario",
        "desconto",
        "acrescimo",
        "valor_total",
        "recomendacao",
      ];

      for (const field of compareFields) {
        if (String(itemA[field]) !== String(itemB[field])) {
          fields.push(field);
        }
      }

      if (fields.length > 0) {
        changed.push({ before: itemA, after: itemB, fields });
      }
    }

    for (const [key, itemA] of mapA) {
      if (!mapB.has(key)) {
        removed.push(itemA);
      }
    }

    return {
      added,
      removed,
      changed,
      totals: {
        before: { subtotal: a.subtotal, valor_total: a.valor_total },
        after: { subtotal: b.subtotal, valor_total: b.valor_total },
      },
    };
  }

  private async loadAvisoTexto(): Promise<{ conteudo: string; versao: number }> {
    const { data, error } = await this.supabase
      .from("oficina_textos" as never)
      .select("conteudo, versao")
      .eq("tenant_id", this.tenantId)
      .eq("chave", "aviso_orcamento_previo")
      .eq("ativo", true)
      .is("deleted_at", null)
      .order("versao", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw new Error(error.message);

    if (data) {
      const row = data as { conteudo: string; versao: number };
      return { conteudo: row.conteudo, versao: row.versao };
    }

    return { conteudo: DEFAULT_ORCAMENTO_AVISO, versao: 1 };
  }

  private async nextVersionNumber(osId: string): Promise<number> {
    const { data, error } = await this.supabase
      .from("ordem_servico_orcamento_versoes" as never)
      .select("versao")
      .eq("tenant_id", this.tenantId)
      .eq("ordem_servico_id", osId)
      .is("deleted_at", null)
      .order("versao", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw new Error(error.message);
    const current = (data as { versao?: number } | null)?.versao ?? 0;
    return current + 1;
  }

  private async findLatestPublicada(
    osId: string,
  ): Promise<OrcamentoVersaoRecord | null> {
    const { data, error } = await this.supabase
      .from("ordem_servico_orcamento_versoes" as never)
      .select("*")
      .eq("tenant_id", this.tenantId)
      .eq("ordem_servico_id", osId)
      .eq("status", "publicado")
      .is("deleted_at", null)
      .order("versao", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw new Error(error.message);
    return (data as unknown as OrcamentoVersaoRecord | null) ?? null;
  }
}

export async function createOrcamentoVersaoService(tenantId: string) {
  const supabase = await createClient();
  return new OrcamentoVersaoService(supabase, tenantId);
}
