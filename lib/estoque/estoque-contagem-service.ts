import type { SupabaseClient } from "@supabase/supabase-js";

import { EstoqueService } from "@/lib/estoque/estoque-service";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";
import type {
  ContagemPeriodicidade,
  CreateContagemInput,
  EstoqueContagem,
  EstoqueContagemDetail,
  EstoqueContagemItem,
  EstoqueContagemListItem,
  FecharContagemResult,
  SalvarItemContagemInput,
} from "@/types/estoque-contagem";

const ITEM_SELECT = `
  id,
  contagem_id,
  produto_id,
  quantidade_sistema,
  custo_unitario_snapshot,
  quantidade_contada,
  diferenca,
  observacao,
  produto:produtos ( id, nome, sku, unidade_medida, categoria )
`;

type ItemRow = {
  id: string;
  contagem_id: string;
  produto_id: string;
  quantidade_sistema: number;
  custo_unitario_snapshot: number;
  quantidade_contada: number | null;
  diferenca: number | null;
  observacao: string | null;
  produto: {
    id: string;
    nome: string;
    sku: string | null;
    unidade_medida: string;
    categoria: string | null;
  } | null;
};

function mapItem(row: ItemRow): EstoqueContagemItem {
  return {
    id: row.id,
    contagem_id: row.contagem_id,
    produto_id: row.produto_id,
    quantidade_sistema: Number(row.quantidade_sistema),
    custo_unitario_snapshot: Number(row.custo_unitario_snapshot),
    quantidade_contada:
      row.quantidade_contada == null ? null : Number(row.quantidade_contada),
    diferenca: row.diferenca == null ? null : Number(row.diferenca),
    observacao: row.observacao,
    produto: row.produto,
  };
}

const PERIODICIDADE_LABEL: Record<ContagemPeriodicidade, string> = {
  semanal: "Semanal",
  quinzenal: "Quinzenal",
  mensal: "Mensal",
  avulsa: "Avulsa",
};

export class EstoqueContagemService {
  constructor(
    private readonly supabase: SupabaseClient<Database>,
    private readonly tenantId: string,
  ) {}

  async list(): Promise<EstoqueContagemListItem[]> {
    const { data, error } = await this.supabase
      .from("estoque_contagens")
      .select(
        "*, estoque_contagem_itens(quantidade_contada)",
      )
      .eq("tenant_id", this.tenantId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);

    return ((data ?? []) as Array<
      EstoqueContagem & {
        estoque_contagem_itens: Array<{ quantidade_contada: number | null }>;
      }
    >).map((row) => {
      const { estoque_contagem_itens, ...contagem } = row;
      return {
        ...contagem,
        total_itens: estoque_contagem_itens.length,
        itens_contados: estoque_contagem_itens.filter(
          (i) => i.quantidade_contada != null,
        ).length,
      };
    });
  }

  async getById(id: string): Promise<EstoqueContagemDetail | null> {
    const { data: contagem, error } = await this.supabase
      .from("estoque_contagens")
      .select("*")
      .eq("tenant_id", this.tenantId)
      .eq("id", id)
      .is("deleted_at", null)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!contagem) return null;

    const { data: itens, error: itensError } = await this.supabase
      .from("estoque_contagem_itens")
      .select(ITEM_SELECT)
      .eq("tenant_id", this.tenantId)
      .eq("contagem_id", id)
      .order("created_at", { ascending: true });

    if (itensError) throw new Error(itensError.message);

    return {
      ...(contagem as EstoqueContagem),
      itens: ((itens ?? []) as unknown as ItemRow[]).map(mapItem),
    };
  }

  /**
   * Abre uma nova contagem: tira uma "foto" do estoque atual de cada produto
   * com controle de estoque (quantidade_sistema + custo do momento) e calcula
   * o valor do estoque inicial. Contagens em aberto não travam a criação de
   * uma nova — quem decide o quê fazer com a anterior é o usuário.
   */
  async create(
    input: CreateContagemInput,
    createdBy: string | null,
  ): Promise<EstoqueContagem> {
    const { data: produtos, error: produtosError } = await this.supabase
      .from("produtos")
      .select("id, estoque_atual, custo")
      .eq("tenant_id", this.tenantId)
      .eq("ativo", true)
      .eq("controla_estoque", true)
      .is("deleted_at", null);

    if (produtosError) throw new Error(produtosError.message);
    if (!produtos || produtos.length === 0) {
      throw new Error(
        "Nenhum produto com controle de estoque cadastrado para contar.",
      );
    }

    const estoqueInicialValor = produtos.reduce(
      (acc, p) => acc + Number(p.estoque_atual ?? 0) * Number(p.custo ?? 0),
      0,
    );

    const { data: contagem, error: contagemError } = await this.supabase
      .from("estoque_contagens")
      .insert({
        tenant_id: this.tenantId,
        periodicidade: input.periodicidade,
        status: "aberta",
        estoque_inicial_valor: Math.round(estoqueInicialValor * 100) / 100,
        created_by: createdBy,
      })
      .select("*")
      .single();

    if (contagemError) throw new Error(contagemError.message);

    const itensInsert = produtos.map((p) => ({
      contagem_id: contagem.id,
      tenant_id: this.tenantId,
      produto_id: p.id,
      quantidade_sistema: Number(p.estoque_atual ?? 0),
      custo_unitario_snapshot: Number(p.custo ?? 0),
    }));

    const { error: itensError } = await this.supabase
      .from("estoque_contagem_itens")
      .insert(itensInsert);

    if (itensError) throw new Error(itensError.message);

    return contagem as EstoqueContagem;
  }

  /** Registra a quantidade contada de um item — pode ser chamado várias vezes até fechar. */
  async salvarItem(
    contagemId: string,
    input: SalvarItemContagemInput,
  ): Promise<void> {
    const { data: contagem, error: contagemError } = await this.supabase
      .from("estoque_contagens")
      .select("id, status")
      .eq("tenant_id", this.tenantId)
      .eq("id", contagemId)
      .is("deleted_at", null)
      .maybeSingle();

    if (contagemError) throw new Error(contagemError.message);
    if (!contagem) throw new Error("Contagem não encontrada.");
    if (contagem.status !== "aberta") {
      throw new Error("Esta contagem já foi fechada.");
    }

    if (input.quantidade_contada < 0) {
      throw new Error("A quantidade contada não pode ser negativa.");
    }

    const { error } = await this.supabase
      .from("estoque_contagem_itens")
      .update({
        quantidade_contada: input.quantidade_contada,
        observacao: input.observacao ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq("tenant_id", this.tenantId)
      .eq("contagem_id", contagemId)
      .eq("produto_id", input.produto_id);

    if (error) throw new Error(error.message);
  }

  /**
   * Fecha a contagem: itens não contados assumem a quantidade do sistema
   * (sem diferença — não inventamos perda de quem não foi contado). Para
   * cada item com diferença real, gera um ajuste de estoque de verdade
   * (mesma trilha usada em qualquer movimentação manual). Calcula o CMV
   * sugerido pelo método clássico de estoque físico: inicial + compras -
   * final. "Compras no período" é uma estimativa — valoriza as entradas de
   * estoque registradas no período pelo custo atual do produto, já que o
   * sistema não guarda o custo histórico de cada entrada.
   */
  async fechar(
    contagemId: string,
    userId: string | null,
  ): Promise<FecharContagemResult> {
    const detail = await this.getById(contagemId);
    if (!detail) throw new Error("Contagem não encontrada.");
    if (detail.status !== "aberta") {
      throw new Error("Esta contagem já foi fechada.");
    }

    const itensSemContagem = detail.itens.filter(
      (i) => i.quantidade_contada == null,
    ).length;

    // Itens não contados: preenche quantidade_contada = quantidade_sistema
    // (sem diferença), pra não travar o fechamento nem inventar perda.
    const pendentes = detail.itens.filter((i) => i.quantidade_contada == null);
    if (pendentes.length > 0) {
      await Promise.all(
        pendentes.map((item) =>
          this.supabase
            .from("estoque_contagem_itens")
            .update({ quantidade_contada: item.quantidade_sistema })
            .eq("id", item.id),
        ),
      );
    }

    const itensFinal = detail.itens.map((i) => ({
      ...i,
      quantidade_contada: i.quantidade_contada ?? i.quantidade_sistema,
    }));

    const estoqueFinalValor = itensFinal.reduce(
      (acc, i) => acc + i.quantidade_contada! * i.custo_unitario_snapshot,
      0,
    );

    let perdasValor = 0;
    let sobrasValor = 0;
    const comDiferenca = itensFinal.filter(
      (i) => i.quantidade_contada! !== i.quantidade_sistema,
    );

    for (const item of comDiferenca) {
      const diff = item.quantidade_contada! - item.quantidade_sistema;
      const valorDiff = diff * item.custo_unitario_snapshot;
      if (diff < 0) perdasValor += Math.abs(valorDiff);
      else sobrasValor += valorDiff;
    }

    // Compras no período: entradas de estoque registradas desde a abertura
    // da contagem, valorizadas pelo custo atual (estimativa — o sistema não
    // guarda o custo histórico por movimentação).
    const { data: entradas, error: entradasError } = await this.supabase
      .from("estoque_movimentacoes")
      .select("produto_id, quantidade")
      .eq("tenant_id", this.tenantId)
      .eq("tipo", "entrada")
      .is("deleted_at", null)
      .gte("created_at", detail.created_at);

    if (entradasError) throw new Error(entradasError.message);

    const custoPorProduto = new Map(
      detail.itens.map((i) => [i.produto_id, i.custo_unitario_snapshot]),
    );
    const comprasPeriodoValor = (entradas ?? []).reduce((acc, e) => {
      const custo = custoPorProduto.get(e.produto_id) ?? 0;
      return acc + Number(e.quantidade) * custo;
    }, 0);

    const estoqueInicialValor = detail.estoque_inicial_valor ?? 0;
    const cmvSugerido =
      estoqueInicialValor + comprasPeriodoValor - estoqueFinalValor;

    // Aplica os ajustes reais de estoque via serviço de movimentações —
    // mesma trilha de auditoria de qualquer ajuste manual.
    const estoqueService = new EstoqueService(this.supabase, this.tenantId);

    for (const item of comDiferenca) {
      await estoqueService.createMovimentacao(
        {
          produto_id: item.produto_id,
          tipo: "ajuste",
          quantidade: item.quantidade_contada!,
          motivo: `Contagem de estoque (${PERIODICIDADE_LABEL[detail.periodicidade]}) — ajuste pra bater com a contagem física`,
          origem: "inventario",
        },
        userId,
      );
    }

    const nowIso = new Date().toISOString();
    const { error: updateError } = await this.supabase
      .from("estoque_contagens")
      .update({
        status: "fechada",
        data_fim: nowIso.slice(0, 10),
        estoque_final_valor: Math.round(estoqueFinalValor * 100) / 100,
        compras_periodo_valor: Math.round(comprasPeriodoValor * 100) / 100,
        perdas_valor: Math.round(perdasValor * 100) / 100,
        sobras_valor: Math.round(sobrasValor * 100) / 100,
        cmv_sugerido: Math.round(cmvSugerido * 100) / 100,
        fechada_por: userId,
        fechada_em: nowIso,
        updated_at: nowIso,
      })
      .eq("tenant_id", this.tenantId)
      .eq("id", contagemId);

    if (updateError) throw new Error(updateError.message);

    return {
      itensSemContagem,
      itensAjustados: comDiferenca.length,
      perdasValor: Math.round(perdasValor * 100) / 100,
      sobrasValor: Math.round(sobrasValor * 100) / 100,
      cmvSugerido: Math.round(cmvSugerido * 100) / 100,
    };
  }

  async softDelete(id: string): Promise<void> {
    const { data, error } = await this.supabase
      .from("estoque_contagens")
      .update({ deleted_at: new Date().toISOString() })
      .eq("tenant_id", this.tenantId)
      .eq("id", id)
      .is("deleted_at", null)
      .select("id")
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data) throw new Error("Contagem não encontrada ou já excluída.");
  }
}

export async function createEstoqueContagemService(tenantId: string) {
  const supabase = await createClient();
  return new EstoqueContagemService(supabase, tenantId);
}
