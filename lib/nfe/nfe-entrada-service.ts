/**
 * Serviço de importação de NF-e de entrada — Sprint 13.22 Gate 2.
 *
 * Política de custo (CTO):
 * - Estoque: custo médio ponderado via RPC atômica
 * - OS direta / parcela OS: custo real da NF (não altera médio)
 * - Frete/seguro/despesas/descontos já rateados em custo_unitario_final
 */

import type { SupabaseClient } from "@supabase/supabase-js";

import { logger } from "@/lib/observability/logger";
import {
  allocateRates,
  computeItemFinalCost,
  NfeParseError,
  parseNfeXml,
  validateXmlUpload,
} from "@/lib/nfe/nfe-xml-parser";
import {
  matchFornecedorByDocumento,
  matchProdutoSuggestions,
} from "@/lib/nfe/nfe-matching";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";
import type {
  NfeDestino,
  NfeDuplicata,
  NfeEntradaDetail,
  NfeEntradaEvento,
  NfeEntradaItem,
  NfeEntradaListItem,
  NfeStatus,
} from "@/types/nfe-entrada";

const BUCKET = "nfe-entrada";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export class NfeEntradaService {
  constructor(
    private readonly supabase: SupabaseClient<Database>,
    private readonly tenantId: string,
  ) {}

  private async recordEvent(
    notaId: string,
    userId: string | null,
    input: {
      tipo: string;
      descricao: string;
      resultado?: string | null;
      referencia_tipo?: string | null;
      referencia_id?: string | null;
      payload?: Record<string, unknown>;
    },
  ) {
    await this.supabase.from("notas_fiscais_entrada_eventos" as never).insert({
      tenant_id: this.tenantId,
      nota_fiscal_id: notaId,
      tipo: input.tipo,
      descricao: input.descricao,
      resultado: input.resultado ?? null,
      referencia_tipo: input.referencia_tipo ?? null,
      referencia_id: input.referencia_id ?? null,
      payload: input.payload ?? {},
      user_id: userId,
    } as never);
  }

  async list(): Promise<NfeEntradaListItem[]> {
    const { data, error } = await this.supabase
      .from("notas_fiscais_entrada" as never)
      .select(
        "id, chave_acesso, numero, serie, data_emissao, status, valor_total, emitente_razao_social, emitente_cnpj_cpf, fornecedor_id, created_at",
      )
      .eq("tenant_id", this.tenantId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as NfeEntradaListItem[];
  }

  async getById(id: string): Promise<NfeEntradaDetail | null> {
    const { data: nota, error } = await this.supabase
      .from("notas_fiscais_entrada" as never)
      .select("*")
      .eq("tenant_id", this.tenantId)
      .eq("id", id)
      .is("deleted_at", null)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!nota) return null;

    const { data: itens } = await this.supabase
      .from("notas_fiscais_entrada_itens" as never)
      .select("*, produto:produtos(id, nome, custo)")
      .eq("tenant_id", this.tenantId)
      .eq("nota_fiscal_id", id)
      .is("deleted_at", null)
      .order("numero_item", { ascending: true });

    const { data: eventos } = await this.supabase
      .from("notas_fiscais_entrada_eventos" as never)
      .select(
        "id, tipo, descricao, resultado, referencia_tipo, referencia_id, user_id, created_at",
      )
      .eq("tenant_id", this.tenantId)
      .eq("nota_fiscal_id", id)
      .order("created_at", { ascending: false })
      .limit(100);

    const mappedItens: NfeEntradaItem[] = (
      (itens ?? []) as Array<Record<string, unknown>>
    ).map((row) => {
      const produto = row.produto as { id: string; nome: string; custo: number | null } | null;
      return {
        id: String(row.id),
        nota_fiscal_id: String(row.nota_fiscal_id),
        numero_item: Number(row.numero_item),
        codigo_fornecedor: (row.codigo_fornecedor as string | null) ?? null,
        ean: (row.ean as string | null) ?? null,
        descricao_original: String(row.descricao_original),
        produto_id: (row.produto_id as string | null) ?? null,
        produto_nome: produto?.nome ?? null,
        ncm: (row.ncm as string | null) ?? null,
        cest: (row.cest as string | null) ?? null,
        cfop: (row.cfop as string | null) ?? null,
        unidade: (row.unidade as string | null) ?? null,
        quantidade: Number(row.quantidade),
        valor_unitario: Number(row.valor_unitario),
        valor_total: Number(row.valor_total),
        valor_desconto: Number(row.valor_desconto),
        valor_frete_rateado: Number(row.valor_frete_rateado),
        valor_outras_despesas_rateado: Number(row.valor_outras_despesas_rateado),
        valor_impostos: Number(row.valor_impostos),
        custo_unitario_final: Number(row.custo_unitario_final),
        custo_total_final: Number(row.custo_total_final),
        lote: (row.lote as string | null) ?? null,
        destino: row.destino as NfeDestino,
        quantidade_estoque: Number(row.quantidade_estoque),
        quantidade_os: Number(row.quantidade_os),
        ordem_servico_id: (row.ordem_servico_id as string | null) ?? null,
        ordem_servico_item_id: (row.ordem_servico_item_id as string | null) ?? null,
        estoque_movimentacao_id: (row.estoque_movimentacao_id as string | null) ?? null,
        status_vinculo: row.status_vinculo as NfeEntradaItem["status_vinculo"],
        motivo_ignorar: (row.motivo_ignorar as string | null) ?? null,
        custo_produto_atual: produto?.custo ?? null,
      };
    });

    const n = nota as Record<string, unknown>;
    return {
      id: String(n.id),
      chave_acesso: String(n.chave_acesso),
      numero: (n.numero as string | null) ?? null,
      serie: (n.serie as string | null) ?? null,
      modelo: (n.modelo as string | null) ?? null,
      data_emissao: (n.data_emissao as string | null) ?? null,
      data_entrada: (n.data_entrada as string | null) ?? null,
      natureza_operacao: (n.natureza_operacao as string | null) ?? null,
      status: n.status as NfeStatus,
      valor_total: Number(n.valor_total),
      valor_produtos: Number(n.valor_produtos),
      valor_frete: Number(n.valor_frete),
      valor_seguro: Number(n.valor_seguro),
      valor_desconto: Number(n.valor_desconto),
      valor_outras_despesas: Number(n.valor_outras_despesas),
      valor_impostos: Number(n.valor_impostos),
      emitente_razao_social: (n.emitente_razao_social as string | null) ?? null,
      emitente_nome_fantasia: (n.emitente_nome_fantasia as string | null) ?? null,
      emitente_cnpj_cpf: (n.emitente_cnpj_cpf as string | null) ?? null,
      emitente_ie: (n.emitente_ie as string | null) ?? null,
      emitente_endereco: (n.emitente_endereco as NfeEntradaDetail["emitente_endereco"]) ?? {},
      fornecedor_id: (n.fornecedor_id as string | null) ?? null,
      forma_pagamento: (n.forma_pagamento as string | null) ?? null,
      duplicatas: (n.duplicatas as NfeDuplicata[]) ?? [],
      informacoes_complementares: (n.informacoes_complementares as string | null) ?? null,
      protocolo_autorizacao: (n.protocolo_autorizacao as string | null) ?? null,
      gerar_conta_pagar: Boolean(n.gerar_conta_pagar),
      conta_pagar_id: (n.conta_pagar_id as string | null) ?? null,
      categoria_financeira_id: (n.categoria_financeira_id as string | null) ?? null,
      plano_conta_id: (n.plano_conta_id as string | null) ?? null,
      centro_custo_id: (n.centro_custo_id as string | null) ?? null,
      observacoes: (n.observacoes as string | null) ?? null,
      erro_mensagem: (n.erro_mensagem as string | null) ?? null,
      xml_hash: String(n.xml_hash),
      storage_path: (n.storage_path as string | null) ?? null,
      processado_em: (n.processado_em as string | null) ?? null,
      created_at: String(n.created_at),
      updated_at: String(n.updated_at),
      itens: mappedItens,
      eventos: (eventos ?? []) as unknown as NfeEntradaEvento[],
    };
  }

  async findExistingByChaveOrHash(chave: string, xmlHash: string) {
    const { data } = await this.supabase
      .from("notas_fiscais_entrada" as never)
      .select("id, chave_acesso, status, numero")
      .eq("tenant_id", this.tenantId)
      .is("deleted_at", null)
      .or(`chave_acesso.eq.${chave},xml_hash.eq.${xmlHash}`)
      .limit(1)
      .maybeSingle();
    return data as { id: string; chave_acesso: string; status: string; numero: string | null } | null;
  }

  /**
   * Upload + parse + persistência em rascunho/aguardando_conferencia.
   * Idempotente: se chave/hash já existir, retorna a nota existente.
   */
  async importXml(input: {
    xml: string;
    filename: string;
    mimeType?: string | null;
    userId: string | null;
  }): Promise<{ notaId: string; duplicated: boolean }> {
    const bytes = Buffer.byteLength(input.xml, "utf8");
    validateXmlUpload({
      filename: input.filename,
      mimeType: input.mimeType,
      byteLength: bytes,
    });

    let parsed;
    try {
      parsed = parseNfeXml(input.xml);
    } catch (error) {
      logger.exception("nfe.parse_failed", error, {
        filename: input.filename,
        bytes,
      });
      if (error instanceof NfeParseError) throw error;
      throw new NfeParseError("Falha ao ler XML da NF-e.");
    }

    const existing = await this.findExistingByChaveOrHash(
      parsed.chave_acesso,
      parsed.xml_hash,
    );
    if (existing) {
      await this.recordEvent(existing.id, input.userId, {
        tipo: "upload",
        descricao: "XML reenviado — nota já existente (antiduplicidade).",
        resultado: "duplicado",
      });
      return { notaId: existing.id, duplicated: true };
    }

    const fornecedor = await matchFornecedorByDocumento(
      this.supabase,
      this.tenantId,
      parsed.emitente.cnpj_cpf,
    );

    const storagePath = `${this.tenantId}/nfe/${parsed.chave_acesso}.xml`;
    const { error: upErr } = await this.supabase.storage
      .from(BUCKET)
      .upload(storagePath, input.xml, {
        contentType: "application/xml",
        upsert: false,
      });
    // Storage pode falhar se bucket ainda não migrado — não bloqueia Gate 1 persistência do xml_original
    if (upErr) {
      logger.warn("nfe.storage_upload_failed", {
        message: upErr.message,
        path: storagePath,
      });
    }

    const somaItens =
      parsed.itens.reduce((s, i) => s + i.valor_total, 0) || 1;

    const { data: nota, error: notaErr } = await this.supabase
      .from("notas_fiscais_entrada" as never)
      .insert({
        tenant_id: this.tenantId,
        fornecedor_id: fornecedor?.id ?? null,
        chave_acesso: parsed.chave_acesso,
        xml_hash: parsed.xml_hash,
        numero: parsed.numero,
        serie: parsed.serie,
        modelo: parsed.modelo,
        data_emissao: parsed.data_emissao,
        data_entrada: todayISO(),
        natureza_operacao: parsed.natureza_operacao,
        emitente_cnpj_cpf: parsed.emitente.cnpj_cpf,
        emitente_razao_social: parsed.emitente.razao_social,
        emitente_nome_fantasia: parsed.emitente.nome_fantasia,
        emitente_ie: parsed.emitente.ie,
        emitente_endereco: parsed.emitente.endereco,
        valor_produtos: parsed.totais.valor_produtos,
        valor_frete: parsed.totais.valor_frete,
        valor_seguro: parsed.totais.valor_seguro,
        valor_desconto: parsed.totais.valor_desconto,
        valor_outras_despesas: parsed.totais.valor_outras_despesas,
        valor_impostos: parsed.totais.valor_impostos,
        valor_total: parsed.totais.valor_total,
        forma_pagamento: parsed.forma_pagamento,
        duplicatas: parsed.duplicatas,
        informacoes_complementares: parsed.informacoes_complementares,
        protocolo_autorizacao: parsed.protocolo_autorizacao,
        status: "aguardando_conferencia",
        storage_path: upErr ? null : storagePath,
        mime_type: "application/xml",
        file_size_bytes: bytes,
        xml_original: input.xml,
        origem_importacao: "upload_xml",
        created_by: input.userId,
      } as never)
      .select("id")
      .single();

    if (notaErr) {
      if (/duplicate|unique/i.test(notaErr.message)) {
        const again = await this.findExistingByChaveOrHash(
          parsed.chave_acesso,
          parsed.xml_hash,
        );
        if (again) return { notaId: again.id, duplicated: true };
      }
      throw new Error(notaErr.message);
    }

    const notaId = (nota as { id: string }).id;

    const itemRows = [];
    for (const item of parsed.itens) {
      const rates = allocateRates(item.valor_total, {
        frete: parsed.totais.valor_frete,
        outras: parsed.totais.valor_outras_despesas,
        seguro: parsed.totais.valor_seguro,
        somaItens,
      });
      const cost = computeItemFinalCost({
        valorTotal: item.valor_total,
        valorDesconto: item.valor_desconto,
        freteRateado: rates.frete,
        outrasRateado: rates.outras,
        seguroRateado: rates.seguro,
        quantidade: item.quantidade,
      });

      let produtoId: string | null = null;
      let statusVinculo: NfeEntradaItem["status_vinculo"] = "pendente";

      const suggestions = await matchProdutoSuggestions(this.supabase, this.tenantId, {
        fornecedorId: fornecedor?.id ?? null,
        codigoFornecedor: item.codigo_fornecedor,
        ean: item.ean,
        descricao: item.descricao,
      });
      const auto = suggestions.find(
        (s) => s.reason === "ean" || s.reason === "vinculo" || s.reason === "sku",
      );
      // Auto-vínculo somente por EAN/vínculo/SKU — nunca por descrição
      if (auto && (auto.reason === "ean" || auto.reason === "vinculo")) {
        produtoId = auto.produto_id;
        statusVinculo = "sugerido";
      }

      itemRows.push({
        tenant_id: this.tenantId,
        nota_fiscal_id: notaId,
        numero_item: item.numero_item,
        codigo_fornecedor: item.codigo_fornecedor,
        ean: item.ean && item.ean !== "0" ? item.ean : null,
        descricao_original: item.descricao,
        produto_id: produtoId,
        ncm: item.ncm,
        cest: item.cest,
        cfop: item.cfop,
        unidade: item.unidade,
        quantidade: item.quantidade,
        valor_unitario: item.valor_unitario,
        valor_total: item.valor_total,
        valor_desconto: item.valor_desconto,
        valor_frete_rateado: rates.frete,
        valor_outras_despesas_rateado: rates.outras + rates.seguro,
        valor_impostos: 0,
        custo_unitario_final: cost.custoUnitario,
        custo_total_final: cost.custoTotal,
        lote: item.lote,
        destino: "pendente",
        quantidade_estoque: 0,
        quantidade_os: 0,
        status_vinculo: statusVinculo,
      });
    }

    const { error: itensErr } = await this.supabase
      .from("notas_fiscais_entrada_itens" as never)
      .insert(itemRows as never);
    if (itensErr) throw new Error(itensErr.message);

    await this.recordEvent(notaId, input.userId, {
      tipo: "upload",
      descricao: `XML importado — ${parsed.itens.length} itens`,
      resultado: "ok",
      payload: {
        chave_prefix: parsed.chave_acesso.slice(0, 8),
        itens: parsed.itens.length,
        fornecedor_matched: Boolean(fornecedor),
      },
    });
    await this.recordEvent(notaId, input.userId, {
      tipo: "leitura",
      descricao: "XML validado e convertido",
      resultado: "ok",
    });
    if (fornecedor) {
      await this.recordEvent(notaId, input.userId, {
        tipo: "fornecedor_vinculado",
        descricao: `Fornecedor vinculado por CNPJ/CPF`,
        resultado: "ok",
        referencia_tipo: "fornecedor",
        referencia_id: fornecedor.id,
      });
    }

    logger.info("nfe.imported_draft", {
      notaId,
      itens: parsed.itens.length,
      duplicated: false,
    });

    return { notaId, duplicated: false };
  }

  async updateItem(
    notaId: string,
    itemId: string,
    patch: {
      produto_id?: string | null;
      destino?: NfeDestino;
      quantidade_estoque?: number;
      quantidade_os?: number;
      ordem_servico_id?: string | null;
      status_vinculo?: NfeEntradaItem["status_vinculo"];
      motivo_ignorar?: string | null;
    },
    userId: string | null,
  ) {
    const detail = await this.getById(notaId);
    if (!detail) throw new Error("Nota não encontrada.");
    if (["importada", "processando", "cancelada"].includes(detail.status)) {
      throw new Error("Nota não pode ser editada neste status.");
    }

    const item = detail.itens.find((i) => i.id === itemId);
    if (!item) throw new Error("Item não encontrado.");

    const destino = patch.destino ?? item.destino;
    let qEst = patch.quantidade_estoque ?? item.quantidade_estoque;
    let qOs = patch.quantidade_os ?? item.quantidade_os;

    if (destino === "estoque") {
      qEst = item.quantidade;
      qOs = 0;
    } else if (destino === "os") {
      qEst = 0;
      qOs = item.quantidade;
    } else if (destino === "misto") {
      if (Number((qEst + qOs).toFixed(4)) !== Number(item.quantidade.toFixed(4))) {
        throw new Error(
          "No destino misto, quantidade estoque + OS deve igualar a quantidade da nota.",
        );
      }
    } else {
      qEst = 0;
      qOs = 0;
    }

    if (qEst < 0 || qOs < 0) throw new Error("Quantidades não podem ser negativas.");
    if (destino === "os" || destino === "misto") {
      const osId = patch.ordem_servico_id ?? item.ordem_servico_id;
      if (!osId) throw new Error("Selecione uma Ordem de Serviço para o destino OS.");
      await this.assertOsTenant(osId);
    }
    if (destino === "ignorar" && !(patch.motivo_ignorar ?? item.motivo_ignorar)?.trim()) {
      throw new Error("Informe o motivo para ignorar o item.");
    }

    const { error } = await this.supabase
      .from("notas_fiscais_entrada_itens" as never)
      .update({
        produto_id: patch.produto_id === undefined ? item.produto_id : patch.produto_id,
        destino,
        quantidade_estoque: qEst,
        quantidade_os: qOs,
        ordem_servico_id:
          patch.ordem_servico_id === undefined
            ? item.ordem_servico_id
            : patch.ordem_servico_id,
        status_vinculo:
          patch.status_vinculo ??
          (patch.produto_id ? "vinculado" : item.status_vinculo),
        motivo_ignorar:
          patch.motivo_ignorar === undefined
            ? item.motivo_ignorar
            : patch.motivo_ignorar,
        updated_at: new Date().toISOString(),
      } as never)
      .eq("id", itemId)
      .eq("tenant_id", this.tenantId)
      .eq("nota_fiscal_id", notaId);

    if (error) throw new Error(error.message);

    if (patch.produto_id && detail.fornecedor_id && item.codigo_fornecedor) {
      await this.upsertVinculo({
        fornecedorId: detail.fornecedor_id,
        codigo: item.codigo_fornecedor,
        ean: item.ean,
        produtoId: patch.produto_id,
        userId,
      });
      await this.recordEvent(notaId, userId, {
        tipo: "produto_vinculado",
        descricao: `Item ${item.numero_item} vinculado ao produto`,
        referencia_tipo: "produto",
        referencia_id: patch.produto_id,
      });
    }

    await this.recordEvent(notaId, userId, {
      tipo: "destino_alterado",
      descricao: `Item ${item.numero_item}: destino=${destino}`,
      resultado: "ok",
    });
  }

  async updateHeader(
    notaId: string,
    patch: {
      fornecedor_id?: string | null;
      gerar_conta_pagar?: boolean;
      categoria_financeira_id?: string | null;
      plano_conta_id?: string | null;
      centro_custo_id?: string | null;
      observacoes?: string | null;
      data_entrada?: string | null;
    },
    userId: string | null,
  ) {
    const detail = await this.getById(notaId);
    if (!detail) throw new Error("Nota não encontrada.");
    if (["importada", "processando", "cancelada"].includes(detail.status)) {
      throw new Error("Nota não pode ser editada neste status.");
    }

    const { error } = await this.supabase
      .from("notas_fiscais_entrada" as never)
      .update({
        ...patch,
        updated_at: new Date().toISOString(),
      } as never)
      .eq("id", notaId)
      .eq("tenant_id", this.tenantId);

    if (error) throw new Error(error.message);

    if (patch.fornecedor_id) {
      await this.recordEvent(notaId, userId, {
        tipo: "fornecedor_vinculado",
        descricao: "Fornecedor confirmado na conferência",
        referencia_tipo: "fornecedor",
        referencia_id: patch.fornecedor_id,
      });
    }
  }

  private async upsertVinculo(input: {
    fornecedorId: string;
    codigo: string;
    ean: string | null;
    produtoId: string;
    userId: string | null;
  }) {
    const { data: existing } = await this.supabase
      .from("fornecedor_produto_vinculos" as never)
      .select("id")
      .eq("tenant_id", this.tenantId)
      .eq("fornecedor_id", input.fornecedorId)
      .eq("codigo_fornecedor", input.codigo)
      .is("deleted_at", null)
      .maybeSingle();

    if (existing) {
      await this.supabase
        .from("fornecedor_produto_vinculos" as never)
        .update({
          produto_id: input.produtoId,
          ean: input.ean,
          updated_at: new Date().toISOString(),
        } as never)
        .eq("id", (existing as { id: string }).id);
      return;
    }

    await this.supabase.from("fornecedor_produto_vinculos" as never).insert({
      tenant_id: this.tenantId,
      fornecedor_id: input.fornecedorId,
      codigo_fornecedor: input.codigo,
      ean: input.ean,
      produto_id: input.produtoId,
      created_by: input.userId,
    } as never);
  }

  private async assertOsTenant(osId: string) {
    const { data, error } = await this.supabase
      .from("ordens_servico")
      .select("id, tenant_id, status")
      .eq("id", osId)
      .eq("tenant_id", this.tenantId)
      .is("deleted_at", null)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) throw new Error("Ordem de Serviço inválida ou de outro tenant.");
    if (["faturado", "cancelado", "cancelada"].includes(data.status)) {
      throw new Error("OS faturada/cancelada não aceita itens da NF-e.");
    }
  }

  validateForImport(detail: NfeEntradaDetail): string[] {
    const errors: string[] = [];
    if (!detail.fornecedor_id) {
      errors.push("Vincule ou confirme o fornecedor.");
    }
    for (const item of detail.itens) {
      if (item.destino === "pendente") {
        errors.push(`Item ${item.numero_item}: defina o destino.`);
      }
      if (
        ["estoque", "os", "misto"].includes(item.destino) &&
        !item.produto_id &&
        item.destino !== "despesa"
      ) {
        errors.push(`Item ${item.numero_item}: vincule um produto do ERP.`);
      }
      if (
        (item.destino === "os" || item.destino === "misto") &&
        !item.ordem_servico_id
      ) {
        errors.push(`Item ${item.numero_item}: selecione a OS.`);
      }
      if (item.destino === "misto") {
        const sum = Number(
          (item.quantidade_estoque + item.quantidade_os).toFixed(4),
        );
        if (sum !== Number(item.quantidade.toFixed(4))) {
          errors.push(
            `Item ${item.numero_item}: quantidades mistas não fecham com a nota.`,
          );
        }
      }
      if (item.destino === "ignorar" && !item.motivo_ignorar?.trim()) {
        errors.push(`Item ${item.numero_item}: motivo obrigatório para ignorar.`);
      }
    }
    if (detail.gerar_conta_pagar) {
      if (
        !detail.categoria_financeira_id ||
        !detail.plano_conta_id ||
        !detail.centro_custo_id
      ) {
        errors.push(
          "Para gerar Conta a Pagar, informe categoria, plano de contas e centro de custo.",
        );
      }
    }
    return errors;
  }

  /**
   * Processamento final atômico via RPC `processar_nfe_entrada_atomico`.
   * Toda falha dentro da RPC faz rollback completo (estoque/OS/CP/status).
   * Em falha: marca `erro` fora da RPC para permitir correção e reprocesso.
   */
  async processImport(notaId: string, userId: string | null) {
    const detail = await this.getById(notaId);
    if (!detail) throw new Error("Nota não encontrada.");
    if (detail.status === "importada") {
      return { ok: true as const, already: true, contaPagarId: detail.conta_pagar_id };
    }
    if (detail.status === "processando") {
      throw new Error("Importação já em andamento.");
    }

    const errors = this.validateForImport(detail);
    if (errors.length) {
      throw new Error(errors[0]);
    }

    try {
      const { data, error } = await this.supabase.rpc(
        "processar_nfe_entrada_atomico" as never,
        {
          p_tenant_id: this.tenantId,
          p_nota_id: notaId,
          p_user_id: userId,
        } as never,
      );

      if (error) {
        throw new Error(error.message);
      }

      const payload = (data ?? {}) as {
        ok?: boolean;
        already?: boolean;
        conta_pagar_id?: string | null;
      };

      if (!payload.ok) {
        throw new Error("RPC não confirmou a importação.");
      }

      logger.info("nfe.process_ok", {
        notaId,
        already: Boolean(payload.already),
      });

      return {
        ok: true as const,
        already: Boolean(payload.already),
        contaPagarId: payload.conta_pagar_id ?? null,
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erro ao processar NF-e.";
      logger.exception("nfe.process_failed", error, { notaId });
      await this.supabase
        .from("notas_fiscais_entrada" as never)
        .update({
          status: "erro",
          erro_mensagem: message,
          updated_at: new Date().toISOString(),
        } as never)
        .eq("id", notaId)
        .eq("tenant_id", this.tenantId)
        .neq("status", "importada");
      await this.recordEvent(notaId, userId, {
        tipo: "erro",
        descricao: message,
        resultado: "erro",
      });
      throw new Error(message);
    }
  }
}

export async function createNfeEntradaService(tenantId: string) {
  const supabase = await createClient();
  return new NfeEntradaService(supabase, tenantId);
}
