/**
 * Sprint 25.3 — Exportação real XLSX/CSV do catálogo e modelo de produtos.
 * Usa SheetJS (sem PDF fingido).
 */

import * as XLSX from "xlsx";

import {
  filterCatalogServices,
  loadPlatformServiceCatalog,
  materializeCatalogPrices,
  type CatalogFilter,
} from "./catalog-source.ts";
import {
  CATALOG_REFERENCE_HOUR_RATES,
  PRICE_BAND_LABELS,
  type PriceBandId,
  type PriceBandRates,
} from "./price-bands.ts";

export type ExportFormat = "xlsx" | "csv";

const SERVICE_HEADERS = [
  "codigo_servico",
  "categoria",
  "subcategoria",
  "nome_servico",
  "descricao_curta",
  "prioridade_comercial",
  "frequencia_estimada",
  "tempo_padrao_h",
  "tempo_minimo_h",
  "tempo_maximo_h",
  "complexidade",
  "hora_tecnica_economica",
  "hora_tecnica_popular",
  "hora_tecnica_estruturada",
  "hora_tecnica_especializada",
  "preco_venda",
  "elevador_necessario",
  "scanner_necessario",
  "alinhamento_apos_servico",
  "teste_rodagem",
  "quantidade_mecanicos",
  "garantia_dias",
  "status",
  "regiao_referencia",
  "observacao_tecnica",
] as const;

const PRODUCT_HEADERS = [
  "sku",
  "codigo_interno",
  "codigo_barras",
  "nome",
  "descricao",
  "categoria",
  "subcategoria",
  "marca",
  "fabricante",
  "unidade",
  "ncm",
  "cest",
  "origem",
  "custo_medio",
  "custo_reposicao",
  "preco_venda",
  "preco_minimo",
  "margem_alvo",
  "quantidade_atual",
  "estoque_minimo",
  "estoque_maximo",
  "estoque_seguranca",
  "deposito",
  "localizacao",
  "fornecedor_principal",
  "lote",
  "serie",
  "validade",
  "ativo",
  "controla_estoque",
  "tipo",
] as const;

export function buildServiceCatalogExport(input: {
  format: ExportFormat;
  filter?: CatalogFilter;
  band?: PriceBandId;
  rates?: PriceBandRates;
}): { bytes: Uint8Array; fileName: string; mimeType: string; rowCount: number } {
  const catalog = loadPlatformServiceCatalog();
  const band = input.band ?? "popular";
  const rates = input.rates ?? catalog.rates ?? CATALOG_REFERENCE_HOUR_RATES;
  const filtered = filterCatalogServices(input.filter ?? {}, catalog);
  const priced = materializeCatalogPrices(filtered, band, rates);

  const importRows = priced.map((r) => {
    const row: Record<string, unknown> = {};
    for (const h of SERVICE_HEADERS) {
      if (h === "preco_venda") row[h] = r.preco_venda;
      else row[h] = (r as Record<string, unknown>)[h] ?? null;
    }
    return row;
  });

  if (input.format === "csv") {
    const ws = XLSX.utils.json_to_sheet(importRows, {
      header: [...SERVICE_HEADERS],
    });
    const csv = XLSX.utils.sheet_to_csv(ws);
    const bytes = new TextEncoder().encode(csv);
    return {
      bytes,
      fileName: `catalogo-servicos-${band}.csv`,
      mimeType: "text/csv;charset=utf-8",
      rowCount: importRows.length,
    };
  }

  const wb = XLSX.utils.book_new();
  const wsImport = XLSX.utils.json_to_sheet(
    importRows.length
      ? importRows
      : [Object.fromEntries(SERVICE_HEADERS.map((h) => [h, ""]))],
    { header: [...SERVICE_HEADERS] },
  );
  XLSX.utils.book_append_sheet(wb, wsImport, "Importacao_Gestao_no_Foco");

  const wsCat = XLSX.utils.json_to_sheet(catalog.categories);
  XLSX.utils.book_append_sheet(wb, wsCat, "Categorias");

  const premisesAoA = [
    ["PREMISSAS DE PRECIFICACAO E IMPORTACAO"],
    ["Premissa", "Valor", "Uso na plataforma", "Observacao"],
    [
      "Hora tecnica economica (R$/h)",
      rates.economico,
      "Faixa editavel",
      "Não é verdade universal",
    ],
    [
      "Hora tecnica popular (R$/h)",
      rates.popular,
      "Faixa editavel",
      PRICE_BAND_LABELS.popular,
    ],
    [
      "Hora tecnica estruturada (R$/h)",
      rates.estruturado,
      "Faixa editavel",
      PRICE_BAND_LABELS.estruturado,
    ],
    [
      "Hora tecnica especializada (R$/h)",
      rates.especializado,
      "Faixa editavel",
      PRICE_BAND_LABELS.especializado,
    ],
    ["Faixa aplicada neste export", PRICE_BAND_LABELS[band], "Preview", ""],
  ];
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet(premisesAoA),
    "Premissas",
  );

  const readme = [
    ["CATALOGO PARA IMPORTACAO NO GESTAO NO FOCO"],
    ["Item", "Orientacao"],
    ["1", "Preços são referência editável — confirme a faixa antes de importar."],
    ["2", "Serviços não movimentam estoque."],
    ["3", "Código único por tenant; duplicidade exige decisão humana."],
    ["4", "Reimporte este arquivo após editar preços/tempos."],
    ["5", "PDF não é formato de importação/exportação deste módulo."],
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(readme), "Leia_me");

  const out = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
  return {
    bytes: new Uint8Array(out),
    fileName: `catalogo-servicos-${band}.xlsx`,
    mimeType:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    rowCount: importRows.length,
  };
}

export function buildProductStockTemplate(format: ExportFormat): {
  bytes: Uint8Array;
  fileName: string;
  mimeType: string;
} {
  const example = Object.fromEntries(
    PRODUCT_HEADERS.map((h) => {
      if (h === "sku") return [h, "EXEMPLO-SKU-001"];
      if (h === "nome") return [h, "EXEMPLO — Filtro de óleo (remover antes de importar)"];
      if (h === "unidade") return [h, "UN"];
      if (h === "tipo") return [h, "produto"];
      if (h === "ativo") return [h, "sim"];
      if (h === "controla_estoque") return [h, "sim"];
      if (h === "quantidade_atual") return [h, 0];
      return [h, ""];
    }),
  );

  if (format === "csv") {
    const ws = XLSX.utils.json_to_sheet([example], {
      header: [...PRODUCT_HEADERS],
    });
    const csv = XLSX.utils.sheet_to_csv(ws);
    return {
      bytes: new TextEncoder().encode(csv),
      fileName: "modelo-produtos-estoque.csv",
      mimeType: "text/csv;charset=utf-8",
    };
  }

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet([example], { header: [...PRODUCT_HEADERS] }),
    "Produtos",
  );
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([
      ["categoria", "observacao"],
      ["Filtros", "Exemplo — edite conforme seu tenant"],
    ]),
    "Categorias",
  );
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([
      ["codigo", "nome", "ativo"],
      ["DEP-01", "Depósito principal", "sim"],
    ]),
    "Depositos",
  );
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([
      ["documento", "razao_social", "prazo_dias"],
      ["00.000.000/0000-00", "Fornecedor exemplo", 30],
    ]),
    "Fornecedores",
  );
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([
      ["INSTRUCOES"],
      ["1. Remova a linha de exemplo antes de importar."],
      ["2. Saldo inicial gera movimentação auditável (entrada / importacao)."],
      ["3. Serviço não recebe quantidade."],
      ["4. SKU e código de barras devem ser únicos por tenant."],
      ["5. Confirme preview — nunca grava sem confirmação humana."],
    ]),
    "Instrucoes",
  );

  const out = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
  return {
    bytes: new Uint8Array(out),
    fileName: "modelo-produtos-estoque.xlsx",
    mimeType:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  };
}
