"use server";

/**
 * Sprint 25.3 — Server actions da Central de Importação (catálogo / produtos / estoque).
 * Reutiliza Import Engine + ProdutoService + EstoqueService. Sem segunda engine.
 */

import { revalidatePath } from "next/cache";

import { getCurrentProfile } from "@/lib/auth/session";
import {
  buildProductStockTemplate,
  buildServiceCatalogExport,
} from "@/lib/catalog-import/catalog-export";
import {
  assertCatalogImportFeatureEnabled,
  assertStockSpreadsheetImportEnabled,
  isPdfOcrImportEnabled,
  isPdfSearchableImportEnabled,
} from "@/lib/catalog-import/catalog-upload-flags";
import {
  filterCatalogServices,
  loadPlatformServiceCatalog,
  materializeCatalogPrices,
} from "@/lib/catalog-import/catalog-source";
import { commitProductStockImportRow } from "@/lib/catalog-import/commit-products";
import { commitServiceImportRow } from "@/lib/catalog-import/commit-services";
import {
  findProductDuplicates,
  findServiceDuplicates,
  type DuplicateDecision,
} from "@/lib/catalog-import/duplicate-resolver";
import {
  buildCatalogPreviewSummary,
  sumFinite,
} from "@/lib/catalog-import/preview-summary";
import {
  CATALOG_REFERENCE_HOUR_RATES,
  assertValidHourRates,
  formatBrl,
  previewPriceRecalc,
  type PriceBandId,
  type PriceBandRates,
} from "@/lib/catalog-import/price-bands";
import {
  catalogImportPermissionSatisfied,
  resolveCatalogImportEffectivePermissions,
} from "@/lib/catalog-import/rbac-compat";
import {
  createEnterpriseContext,
  createRbacSupabaseAdapter,
} from "@/lib/enterprise";
import { CATALOG_IMPORT_ADAPTER } from "@/lib/import-engine/adapters/catalog/adapter";
import { INVOICE_IMPORT_ADAPTER } from "@/lib/import-engine/adapters/invoice/adapter";
import { STOCK_IMPORT_ADAPTER } from "@/lib/import-engine/adapters/stock/adapter";
import {
  createProductionImportEngine,
  type ImportColumnMapping,
  type ImportReviewRow,
} from "@/lib/import-engine";
import { assertImportFileWithinLimit } from "@/lib/import-engine/import-file-limits";
import { createClient } from "@/lib/supabase/server";
import { requireTenant } from "@/lib/tenants";

async function resolveCatalogAuth(
  tenantSlug: string,
  needed: readonly string[],
) {
  const tenant = await requireTenant(tenantSlug);
  const profile = await getCurrentProfile();
  if (!profile?.id) throw new Error("Sessão ausente.");

  const client = await createClient();
  const rbac = createRbacSupabaseAdapter(client);
  const snap = await rbac.resolveAuthorizationSnapshot(tenant.id, profile.id);
  const effective = resolveCatalogImportEffectivePermissions({
    membershipRole: tenant.role,
    snapshotRoles: snap.roles,
    snapshotPermissions: snap.permissions,
  });
  const permissions = effective.permissions;
  if (!catalogImportPermissionSatisfied(permissions, needed)) {
    throw new Error(`Sem permissão (${needed.join(" | ")}).`);
  }
  createEnterpriseContext({
    tenantId: tenant.id,
    userId: profile.id,
    roles: effective.roles,
    permissions,
    source: "server_action",
    metadata: {
      catalogAuthSource: effective.source,
      membershipRole: tenant.role,
    },
  });
  return { tenant, profile, client, permissions, roles: effective.roles };
}

function mergeRates(partial?: Partial<PriceBandRates>): PriceBandRates {
  const catalog = loadPlatformServiceCatalog();
  const rates: PriceBandRates = {
    ...CATALOG_REFERENCE_HOUR_RATES,
    ...catalog.rates,
    ...partial,
  };
  return rates;
}

export async function downloadServiceCatalogAction(
  tenantSlug: string,
  input: {
    format: "xlsx" | "csv";
    prioridade?: "A" | "AB" | "all";
    categoria?: string | null;
    complexidade?: string | null;
    emptyTemplate?: boolean;
    band?: PriceBandId;
    rates?: Partial<PriceBandRates>;
  },
) {
  assertCatalogImportFeatureEnabled();
  await resolveCatalogAuth(tenantSlug, [
    "produtos.visualizar",
    "servicos.importar",
    "produtos.importar",
  ]);
  const rates = mergeRates(input.rates);
  assertValidHourRates(rates, input.band);
  const exported = buildServiceCatalogExport({
    format: input.format,
    filter: {
      prioridade: input.prioridade ?? "all",
      categoria: input.categoria,
      complexidade: input.complexidade,
      emptyTemplate: input.emptyTemplate,
    },
    band: input.band ?? "popular",
    rates,
  });
  return {
    fileName: exported.fileName,
    mimeType: exported.mimeType,
    base64: Buffer.from(exported.bytes).toString("base64"),
    rowCount: exported.rowCount,
  };
}

export async function downloadProductStockTemplateAction(
  tenantSlug: string,
  format: "xlsx" | "csv" = "xlsx",
) {
  await resolveCatalogAuth(tenantSlug, [
    "produtos.visualizar",
    "estoque.importar",
    "produtos.importar",
  ]);
  const exported = buildProductStockTemplate(format);
  return {
    fileName: exported.fileName,
    mimeType: exported.mimeType,
    base64: Buffer.from(exported.bytes).toString("base64"),
  };
}

export async function previewCatalogPriceBandAction(
  tenantSlug: string,
  input: {
    band: PriceBandId;
    rates?: Partial<PriceBandRates>;
    prioridade?: "A" | "AB" | "all";
  },
) {
  await resolveCatalogAuth(tenantSlug, [
    "produtos.visualizar",
    "servicos.importar",
  ]);
  const rates = mergeRates(input.rates);
  assertValidHourRates(rates, input.band);
  const catalog = loadPlatformServiceCatalog();
  const rows = filterCatalogServices(
    { prioridade: input.prioridade ?? "all" },
    catalog,
  );
  const pricedBefore = materializeCatalogPrices(rows, "popular", rates);
  const recalc = previewPriceRecalc({
    band: input.band,
    rates,
    rows: pricedBefore.map((r) => ({
      codigo: r.codigo_servico,
      nome: r.nome_servico,
      tempoPadraoH: r.tempo_padrao_h,
      priceBefore: r.preco_venda,
    })),
  });
  return {
    ...recalc,
    hourRateLabel: formatBrl(recalc.hourRate),
    sampleDiffs: recalc.sampleDiffs.map((d) => ({
      ...d,
      priceBeforeLabel: formatBrl(d.priceBefore),
      priceAfterLabel: formatBrl(d.priceAfter),
      diffLabel: formatBrl(d.diff),
    })),
  };
}

export async function previewPlatformCatalogImportAction(
  tenantSlug: string,
  input: {
    band: PriceBandId;
    rates?: Partial<PriceBandRates>;
    prioridade?: "A" | "AB" | "all";
  },
) {
  assertCatalogImportFeatureEnabled();
  const auth = await resolveCatalogAuth(tenantSlug, [
    "servicos.importar",
    "produtos.criar",
  ]);
  const rates = mergeRates(input.rates);
  assertValidHourRates(rates, input.band);
  const catalog = loadPlatformServiceCatalog();
  const rows = materializeCatalogPrices(
    filterCatalogServices({ prioridade: input.prioridade ?? "all" }, catalog),
    input.band,
    rates,
  );

  const { data: existing } = await auth.client
    .from("produtos")
    .select("id, codigo_interno, sku")
    .eq("tenant_id", auth.tenant.id)
    .eq("tipo", "servico")
    .is("deleted_at", null)
    .limit(5000);

  const byCode = new Map<string, string>();
  for (const e of existing ?? []) {
    const code = (e.codigo_interno ?? e.sku ?? "").toUpperCase();
    if (code) byCode.set(code, e.id);
  }

  const duplicates = findServiceDuplicates({
    rows: rows.map((r, i) => ({
      rowNumber: i + 1,
      codigo: r.codigo_servico,
      nome: r.nome_servico,
    })),
    existingByCode: byCode,
  });

  const summary = buildCatalogPreviewSummary({
    fileName: "catalogo-plataforma-zona-sul-sp.xlsx",
    detectedType: "catalog_services",
    totalRows: rows.length,
    financialTotal: sumFinite(rows.map((r) => r.preco_venda)),
    newServices: rows.length - duplicates.length,
    duplicates: duplicates.length,
    priceBand: input.band,
    notes: [
      "Análise baseada no catálogo de referência editável.",
      "Serviços não movimentam estoque.",
      "Duplicidades exigem decisão (ignorar / atualizar / novo código).",
      "Nenhuma gravação ocorreu neste preview.",
    ],
  });

  return { summary, duplicates, sample: rows.slice(0, 20) };
}

export async function commitPlatformCatalogImportAction(
  tenantSlug: string,
  input: {
    band: PriceBandId;
    rates?: Partial<PriceBandRates>;
    prioridade?: "A" | "AB" | "all";
    confirmed: true;
    duplicatePolicy: DuplicateDecision;
  },
) {
  assertCatalogImportFeatureEnabled();
  const auth = await resolveCatalogAuth(tenantSlug, [
    "servicos.importar",
    "produtos.criar",
  ]);
  if (!input.confirmed) {
    throw new Error("Confirmação humana obrigatória.");
  }

  const rates = mergeRates(input.rates);
  assertValidHourRates(rates, input.band);
  const catalog = loadPlatformServiceCatalog();
  const rows = materializeCatalogPrices(
    filterCatalogServices({ prioridade: input.prioridade ?? "A" }, catalog),
    input.band,
    rates,
  );

  const { data: existing } = await auth.client
    .from("produtos")
    .select("id, codigo_interno, sku")
    .eq("tenant_id", auth.tenant.id)
    .eq("tipo", "servico")
    .is("deleted_at", null)
    .limit(5000);
  const byCode = new Map<string, string>();
  for (const e of existing ?? []) {
    const code = (e.codigo_interno ?? e.sku ?? "").toUpperCase();
    if (code) byCode.set(code, e.id);
  }

  const reviewRows: ImportReviewRow[] = rows.map((r, i) => ({
    rowNumber: i + 1,
    description: r.nome_servico,
    values: {
      codigo_servico: r.codigo_servico,
      nome_servico: r.nome_servico,
      categoria: r.categoria,
      subcategoria: r.subcategoria,
      descricao_curta: r.descricao_curta,
      preco_venda: r.preco_venda,
      garantia_dias: r.garantia_dias,
      status: r.status,
      observacao_tecnica: r.observacao_tecnica,
      tempo_padrao_h: r.tempo_padrao_h,
      unidade: "UN",
    },
    issues: [],
    classification: {
      rowNumber: i + 1,
      status: "confirmed",
      categorySuggested: r.categoria,
      subcategorySuggested: r.subcategoria,
      costCenterSuggested: null,
      dreGroupSuggested: null,
      confidence: 0.9,
      reason: "Catálogo plataforma confirmado pelo usuário",
    },
  }));

  const bundle = createProductionImportEngine(auth.client);
  const createdItems: Array<{
    tenantId: string;
    runId: string;
    rowNumber: number;
    targetType: string;
    targetId: string;
    operation: string;
  }> = [];

  const result = await bundle.engine.commit({
    request: {
      tenantId: auth.tenant.id,
      userId: auth.profile.id,
      module: CATALOG_IMPORT_ADAPTER.moduleKey,
      targetEntity: CATALOG_IMPORT_ADAPTER.targetEntity,
      fileName: "catalogo-plataforma.xlsx",
      format: "xlsx",
      mapping: {},
      rows: reviewRows,
      confirmedRowNumbers: reviewRows.map((r) => r.rowNumber),
    },
    userLabel: auth.profile.name ?? auth.profile.email,
    onCommitRow: async (row) => {
      const code = String(row.values.codigo_servico ?? "").toUpperCase();
      const existingId = byCode.get(code) ?? null;
      const decision: DuplicateDecision = existingId
        ? input.duplicatePolicy
        : "update";
      const res = await commitServiceImportRow(auth.client, {
        tenantId: auth.tenant.id,
        userId: auth.profile.id,
        values: {
          codigo_servico: String(row.values.codigo_servico ?? ""),
          nome_servico: String(row.values.nome_servico ?? ""),
          categoria: (row.values.categoria as string | null) ?? null,
          subcategoria: (row.values.subcategoria as string | null) ?? null,
          descricao_curta: (row.values.descricao_curta as string | null) ?? null,
          preco_venda:
            row.values.preco_venda != null
              ? Number(row.values.preco_venda)
              : null,
          garantia_dias:
            row.values.garantia_dias != null
              ? Number(row.values.garantia_dias)
              : null,
          status: (row.values.status as string | null) ?? null,
          observacao_tecnica:
            (row.values.observacao_tecnica as string | null) ?? null,
          tempo_padrao_h:
            row.values.tempo_padrao_h != null
              ? Number(row.values.tempo_padrao_h)
              : null,
          unidade: (row.values.unidade as string | null) ?? "UN",
        },
        decision,
        existingId,
        importRunId: null,
      });
      if (res.action === "ignored") return;
      if (res.productId && res.action === "created") {
        byCode.set(code, res.productId);
      }
      createdItems.push({
        tenantId: auth.tenant.id,
        runId: "",
        rowNumber: row.rowNumber,
        targetType: "produto",
        targetId: res.productId,
        operation: res.action,
      });
    },
  });

  if (createdItems.length && result.logId) {
    await bundle.runItems.appendMany(
      createdItems.map((it) => ({
        ...it,
        runId: result.logId,
      })),
    );
  }

  revalidatePath(`/${tenantSlug}/produtos`);
  return result;
}

export async function previewStockFileImportAction(
  tenantSlug: string,
  formData: FormData,
) {
  const auth = await resolveCatalogAuth(tenantSlug, [
    "estoque.importar",
    "produtos.importar",
    "produtos.criar",
  ]);
  const file = formData.get("file");
  if (!(file instanceof File)) throw new Error("Arquivo obrigatório.");
  assertStockSpreadsheetImportEnabled(file.name);
  const bytes = new Uint8Array(await file.arrayBuffer());
  assertImportFileWithinLimit({
    fileName: file.name,
    byteLength: bytes.byteLength,
  });
  const bundle = createProductionImportEngine(auth.client);
  const parsed = await bundle.engine.parseFile({
    fileName: file.name,
    mimeType: file.type,
    bytes,
  });
  const preview = await bundle.engine.buildPreview({
    tenantId: auth.tenant.id,
    module: STOCK_IMPORT_ADAPTER.moduleKey,
    targetEntity: STOCK_IMPORT_ADAPTER.targetEntity,
    parsed,
    targetFields: STOCK_IMPORT_ADAPTER.fields,
  });

  const { data: existing } = await auth.client
    .from("produtos")
    .select("id, sku, codigo_barras, nome")
    .eq("tenant_id", auth.tenant.id)
    .is("deleted_at", null)
    .limit(5000);
  const bySku = new Map<string, string>();
  const byBarcode = new Map<string, string>();
  for (const e of existing ?? []) {
    if (e.sku) bySku.set(e.sku.toUpperCase(), e.id);
    if (e.codigo_barras) byBarcode.set(e.codigo_barras, e.id);
  }

  const normalized = bundle.engine.normalize(
    parsed,
    preview.mapping,
    STOCK_IMPORT_ADAPTER.fields,
  );
  const duplicates = findProductDuplicates({
    rows: normalized.map((r) => ({
      rowNumber: r.rowNumber,
      sku: r.values.sku != null ? String(r.values.sku) : null,
      barcode:
        r.values.codigo_barras != null ? String(r.values.codigo_barras) : null,
      nome: String(r.values.nome ?? ""),
    })),
    existingBySku: bySku,
    existingByBarcode: byBarcode,
  });

  const qtys = normalized.map((r) => Number(r.values.quantidade_atual ?? 0));
  const values = normalized.map((r) => {
    const q = Number(r.values.quantidade_atual ?? 0);
    const c = Number(r.values.custo_medio ?? r.values.preco_venda ?? 0);
    return Number.isFinite(q) && Number.isFinite(c) ? q * c : null;
  });

  const reviewRows: ImportReviewRow[] = normalized.map((r) => ({
    rowNumber: r.rowNumber,
    description: String(r.values.nome ?? `Linha ${r.rowNumber}`),
    values: r.values,
    issues: r.issues ?? [],
    classification: {
      rowNumber: r.rowNumber,
      status: "confirmed",
      categorySuggested:
        r.values.categoria != null ? String(r.values.categoria) : null,
      subcategorySuggested:
        r.values.subcategoria != null ? String(r.values.subcategoria) : null,
      costCenterSuggested: null,
      dreGroupSuggested: null,
      confidence: 0.85,
      reason: "Arquivo de estoque/produtos — aguarda confirmação",
    },
  }));

  const summary = buildCatalogPreviewSummary({
    fileName: file.name,
    detectedType: parsed.format,
    totalRows: parsed.totalRows,
    newProducts: Math.max(0, normalized.length - duplicates.length),
    duplicates: duplicates.length,
    errors: preview.issues.filter((i) => i.severity === "error").length,
    stockQtyTotal: sumFinite(qtys),
    stockValueTotal: sumFinite(values),
    notes: [
      "Saldo inicial gera movimentação auditável após confirmação.",
      "Nenhuma gravação ocorreu neste preview.",
    ],
  });

  return {
    summary,
    duplicates,
    mapping: preview.mapping,
    columns: parsed.columns,
    format: parsed.format,
    sampleRows: normalized.slice(0, 30),
    reviewRows,
    confirmedRowNumbers: reviewRows.map((r) => r.rowNumber),
  };
}

export async function commitStockFileImportAction(
  tenantSlug: string,
  input: {
    fileName: string;
    format: string;
    mapping: ImportColumnMapping;
    rows: ImportReviewRow[];
    confirmedRowNumbers: number[];
    duplicatePolicy: DuplicateDecision;
  },
) {
  const auth = await resolveCatalogAuth(tenantSlug, [
    "estoque.importar",
    "produtos.criar",
    "produtos.importar",
    "estoque.movimentar",
  ]);
  if (!input.rows?.length) {
    throw new Error("Nenhuma linha para confirmar. Execute o preview com um arquivo.");
  }
  if (!input.confirmedRowNumbers?.length) {
    throw new Error("Confirmação humana obrigatória: selecione linhas válidas.");
  }
  assertStockSpreadsheetImportEnabled(input.fileName || input.format);
  const bundle = createProductionImportEngine(auth.client);

  const { data: existing } = await auth.client
    .from("produtos")
    .select("id, sku, codigo_barras")
    .eq("tenant_id", auth.tenant.id)
    .is("deleted_at", null)
    .limit(5000);
  const bySku = new Map<string, string>();
  for (const e of existing ?? []) {
    if (e.sku) bySku.set(e.sku.toUpperCase(), e.id);
  }

  const createdItems: Array<{
    tenantId: string;
    rowNumber: number;
    targetType: string;
    targetId: string;
    operation: string;
  }> = [];

  const result = await bundle.engine.commit({
    request: {
      tenantId: auth.tenant.id,
      userId: auth.profile.id,
      module: STOCK_IMPORT_ADAPTER.moduleKey,
      targetEntity: STOCK_IMPORT_ADAPTER.targetEntity,
      fileName: input.fileName,
      format: input.format as never,
      mapping: input.mapping,
      rows: input.rows,
      confirmedRowNumbers: input.confirmedRowNumbers,
    },
    userLabel: auth.profile.name ?? auth.profile.email,
    onCommitRow: async (row) => {
      const sku =
        row.values.sku != null ? String(row.values.sku).toUpperCase() : null;
      const existingId = sku ? (bySku.get(sku) ?? null) : null;
      const res = await commitProductStockImportRow(auth.client, {
        tenantId: auth.tenant.id,
        userId: auth.profile.id,
        values: {
          nome: String(row.values.nome ?? ""),
          sku: row.values.sku != null ? String(row.values.sku) : null,
          codigo_interno:
            row.values.codigo_interno != null
              ? String(row.values.codigo_interno)
              : null,
          codigo_barras:
            row.values.codigo_barras != null
              ? String(row.values.codigo_barras)
              : null,
          categoria:
            row.values.categoria != null ? String(row.values.categoria) : null,
          subcategoria:
            row.values.subcategoria != null
              ? String(row.values.subcategoria)
              : null,
          marca: row.values.marca != null ? String(row.values.marca) : null,
          fabricante:
            row.values.fabricante != null
              ? String(row.values.fabricante)
              : null,
          unidade:
            row.values.unidade != null ? String(row.values.unidade) : "UN",
          ncm: row.values.ncm != null ? String(row.values.ncm) : null,
          cest: row.values.cest != null ? String(row.values.cest) : null,
          custo_medio:
            row.values.custo_medio != null
              ? Number(row.values.custo_medio)
              : null,
          custo_reposicao:
            row.values.custo_reposicao != null
              ? Number(row.values.custo_reposicao)
              : null,
          preco_venda:
            row.values.preco_venda != null
              ? Number(row.values.preco_venda)
              : null,
          preco_minimo:
            row.values.preco_minimo != null
              ? Number(row.values.preco_minimo)
              : null,
          margem_alvo:
            row.values.margem_alvo != null
              ? Number(row.values.margem_alvo)
              : null,
          quantidade_atual:
            row.values.quantidade_atual != null
              ? Number(row.values.quantidade_atual)
              : 0,
          estoque_minimo:
            row.values.estoque_minimo != null
              ? Number(row.values.estoque_minimo)
              : null,
          estoque_maximo:
            row.values.estoque_maximo != null
              ? Number(row.values.estoque_maximo)
              : null,
          estoque_seguranca:
            row.values.estoque_seguranca != null
              ? Number(row.values.estoque_seguranca)
              : null,
          deposito:
            row.values.deposito != null ? String(row.values.deposito) : null,
          localizacao:
            row.values.localizacao != null
              ? String(row.values.localizacao)
              : null,
          fornecedor_principal:
            row.values.fornecedor_principal != null
              ? String(row.values.fornecedor_principal)
              : null,
          ativo: row.values.ativo,
          controla_estoque: row.values.controla_estoque,
          tipo: row.values.tipo != null ? String(row.values.tipo) : "produto",
          descricao:
            row.values.descricao != null ? String(row.values.descricao) : null,
        },
        decision: existingId ? input.duplicatePolicy : "update",
        existingId,
      });
      if (res.action === "ignored") return;
      if (res.productId && sku && res.action === "created") {
        bySku.set(sku, res.productId);
      }
      createdItems.push({
        tenantId: auth.tenant.id,
        rowNumber: row.rowNumber,
        targetType: "produto",
        targetId: res.productId,
        operation: res.action,
      });
      if (res.movementId) {
        createdItems.push({
          tenantId: auth.tenant.id,
          rowNumber: row.rowNumber,
          targetType: "estoque_movimentacao",
          targetId: res.movementId,
          operation: "created",
        });
      }
    },
  });

  if (createdItems.length && result.logId) {
    await bundle.runItems.appendMany(
      createdItems.map((it) => ({
        ...it,
        runId: result.logId,
      })),
    );
  }

  revalidatePath(`/${tenantSlug}/produtos`);
  revalidatePath(`/${tenantSlug}/estoque`);
  return result;
}

/**
 * Preview de arquivo real (XLSX/XLS/CSV) selecionado pelo usuário —
 * catálogo de serviços / produtos.
 */
export async function previewCatalogFileImportAction(
  tenantSlug: string,
  formData: FormData,
) {
  assertCatalogImportFeatureEnabled();
  const auth = await resolveCatalogAuth(tenantSlug, [
    "servicos.importar",
    "produtos.importar",
    "produtos.criar",
  ]);
  const file = formData.get("file");
  if (!(file instanceof File)) throw new Error("Arquivo obrigatório.");
  const kind = String(formData.get("kind") ?? "servicos").toLowerCase();
  const target =
    kind === "produtos" || kind === "estoque"
      ? ("produtos" as const)
      : ("servicos" as const);

  const bytes = new Uint8Array(await file.arrayBuffer());
  assertImportFileWithinLimit({
    fileName: file.name,
    byteLength: bytes.byteLength,
  });
  assertStockSpreadsheetImportEnabled(file.name);

  const bundle = createProductionImportEngine(auth.client);
  const parsed = await bundle.engine.parseFile({
    fileName: file.name,
    mimeType: file.type,
    bytes,
  });

  const adapter =
    target === "servicos" ? CATALOG_IMPORT_ADAPTER : STOCK_IMPORT_ADAPTER;

  const preview = await bundle.engine.buildPreview({
    tenantId: auth.tenant.id,
    module: adapter.moduleKey,
    targetEntity: adapter.targetEntity,
    parsed,
    targetFields: adapter.fields,
  });

  const normalized = bundle.engine.normalize(
    parsed,
    preview.mapping,
    adapter.fields,
  );

  const { data: existing } = await auth.client
    .from("produtos")
    .select("id, sku, codigo_interno, codigo_barras, nome, tipo")
    .eq("tenant_id", auth.tenant.id)
    .is("deleted_at", null)
    .limit(5000);

  let duplicatesCount = 0;
  if (target === "servicos") {
    const byCode = new Map<string, string>();
    for (const e of existing ?? []) {
      if (e.tipo && e.tipo !== "servico") continue;
      const code = (e.codigo_interno ?? e.sku ?? "").toUpperCase();
      if (code) byCode.set(code, e.id);
    }
    duplicatesCount = findServiceDuplicates({
      rows: normalized.map((r) => ({
        rowNumber: r.rowNumber,
        codigo: String(r.values.codigo_servico ?? ""),
        nome: String(r.values.nome_servico ?? ""),
      })),
      existingByCode: byCode,
    }).length;
  } else {
    const bySku = new Map<string, string>();
    const byBarcode = new Map<string, string>();
    for (const e of existing ?? []) {
      if (e.sku) bySku.set(e.sku.toUpperCase(), e.id);
      if (e.codigo_barras) byBarcode.set(e.codigo_barras, e.id);
    }
    duplicatesCount = findProductDuplicates({
      rows: normalized.map((r) => ({
        rowNumber: r.rowNumber,
        sku: r.values.sku != null ? String(r.values.sku) : null,
        barcode:
          r.values.codigo_barras != null
            ? String(r.values.codigo_barras)
            : null,
        nome: String(r.values.nome ?? ""),
      })),
      existingBySku: bySku,
      existingByBarcode: byBarcode,
    }).length;
  }

  const reviewRows: ImportReviewRow[] = normalized.map((r) => ({
    rowNumber: r.rowNumber,
    description: String(
      r.values.nome_servico ?? r.values.nome ?? `Linha ${r.rowNumber}`,
    ),
    values: r.values,
    issues: r.issues ?? [],
    classification: {
      rowNumber: r.rowNumber,
      status: "confirmed",
      categorySuggested:
        r.values.categoria != null ? String(r.values.categoria) : null,
      subcategorySuggested:
        r.values.subcategoria != null ? String(r.values.subcategoria) : null,
      costCenterSuggested: null,
      dreGroupSuggested: null,
      confidence: 0.85,
      reason: "Arquivo do computador — aguarda confirmação",
    },
  }));

  const prices = normalized.map((r) =>
    Number(r.values.preco_venda ?? r.values.custo_medio ?? 0),
  );

  const summary = buildCatalogPreviewSummary({
    fileName: file.name,
    detectedType: parsed.format,
    totalRows: parsed.totalRows,
    newServices: target === "servicos" ? Math.max(0, normalized.length - duplicatesCount) : 0,
    newProducts: target !== "servicos" ? Math.max(0, normalized.length - duplicatesCount) : 0,
    duplicates: duplicatesCount,
    errors: preview.issues.filter((i) => i.severity === "error").length,
    financialTotal: sumFinite(prices.map((p) => (Number.isFinite(p) ? p : null))),
    notes: [
      `Tipo: ${target === "servicos" ? "catálogo de serviços" : "produtos/estoque"}.`,
      "Arquivo selecionado do computador.",
      "Nenhuma gravação ocorreu neste preview.",
    ],
  });

  return {
    summary,
    kind: target,
    mapping: preview.mapping,
    columns: parsed.columns,
    format: parsed.format,
    sampleRows: normalized.slice(0, 30),
    reviewRows,
    confirmedRowNumbers: reviewRows.map((r) => r.rowNumber),
    fileMeta: {
      name: file.name,
      size: bytes.byteLength,
      mimeType: file.type || null,
      format: parsed.format,
    },
  };
}

export async function commitCatalogFileImportAction(
  tenantSlug: string,
  input: {
    kind: "servicos" | "produtos";
    fileName: string;
    format: string;
    mapping: ImportColumnMapping;
    rows: ImportReviewRow[];
    confirmedRowNumbers: number[];
    duplicatePolicy: DuplicateDecision;
    confirmed: true;
  },
) {
  assertCatalogImportFeatureEnabled();
  if (!input.confirmed) throw new Error("Confirmação humana obrigatória.");
  if (!input.rows?.length) {
    throw new Error("Nenhuma linha para confirmar. Execute o preview com um arquivo.");
  }

  if (input.kind === "servicos") {
    const auth = await resolveCatalogAuth(tenantSlug, [
      "servicos.importar",
      "produtos.criar",
    ]);
    const bundle = createProductionImportEngine(auth.client);
    const { data: existing } = await auth.client
      .from("produtos")
      .select("id, codigo_interno, sku")
      .eq("tenant_id", auth.tenant.id)
      .eq("tipo", "servico")
      .is("deleted_at", null)
      .limit(5000);
    const byCode = new Map<string, string>();
    for (const e of existing ?? []) {
      const code = (e.codigo_interno ?? e.sku ?? "").toUpperCase();
      if (code) byCode.set(code, e.id);
    }
    const createdItems: Array<{
      tenantId: string;
      rowNumber: number;
      targetType: string;
      targetId: string;
      operation: string;
    }> = [];

    const result = await bundle.engine.commit({
      request: {
        tenantId: auth.tenant.id,
        userId: auth.profile.id,
        module: CATALOG_IMPORT_ADAPTER.moduleKey,
        targetEntity: CATALOG_IMPORT_ADAPTER.targetEntity,
        fileName: input.fileName,
        format: input.format as never,
        mapping: input.mapping,
        rows: input.rows,
        confirmedRowNumbers: input.confirmedRowNumbers,
      },
      userLabel: auth.profile.name ?? auth.profile.email,
      onCommitRow: async (row) => {
        const code = String(row.values.codigo_servico ?? "").toUpperCase();
        const existingId = byCode.get(code) ?? null;
        const res = await commitServiceImportRow(auth.client, {
          tenantId: auth.tenant.id,
          userId: auth.profile.id,
          values: {
            codigo_servico: String(row.values.codigo_servico ?? ""),
            nome_servico: String(row.values.nome_servico ?? ""),
            categoria: (row.values.categoria as string | null) ?? null,
            subcategoria: (row.values.subcategoria as string | null) ?? null,
            descricao_curta:
              (row.values.descricao_curta as string | null) ?? null,
            preco_venda:
              row.values.preco_venda != null
                ? Number(row.values.preco_venda)
                : null,
            garantia_dias:
              row.values.garantia_dias != null
                ? Number(row.values.garantia_dias)
                : null,
            status: (row.values.status as string | null) ?? null,
            observacao_tecnica:
              (row.values.observacao_tecnica as string | null) ?? null,
            tempo_padrao_h:
              row.values.tempo_padrao_h != null
                ? Number(row.values.tempo_padrao_h)
                : null,
            unidade: (row.values.unidade as string | null) ?? "UN",
          },
          decision: existingId ? input.duplicatePolicy : "update",
          existingId,
          importRunId: null,
        });
        if (res.action === "ignored") return;
        if (res.productId && res.action === "created") {
          byCode.set(code, res.productId);
        }
        createdItems.push({
          tenantId: auth.tenant.id,
          rowNumber: row.rowNumber,
          targetType: "produto",
          targetId: res.productId,
          operation: res.action,
        });
      },
    });

    if (createdItems.length && result.logId) {
      await bundle.runItems.appendMany(
        createdItems.map((it) => ({ ...it, runId: result.logId })),
      );
    }
    revalidatePath(`/${tenantSlug}/produtos`);
    return result;
  }

  return commitStockFileImportAction(tenantSlug, {
    fileName: input.fileName,
    format: input.format,
    mapping: input.mapping,
    rows: input.rows,
    confirmedRowNumbers: input.confirmedRowNumbers,
    duplicatePolicy: input.duplicatePolicy,
  });
}

/**
 * Análise honesta de PDF auxiliar (estoque/produtos).
 * Sem OCR — image-only é rejeitado com mensagem clara.
 */
export async function previewPdfAssistDocumentAction(
  tenantSlug: string,
  formData: FormData,
) {
  await resolveCatalogAuth(tenantSlug, [
    "estoque.visualizar",
    "produtos.visualizar",
    "estoque.importar",
  ]);
  if (!isPdfSearchableImportEnabled()) {
    throw new Error(
      "Análise de PDF pesquisável desativada (IMPORT_PDF_SEARCHABLE_ENABLED=0).",
    );
  }
  const file = formData.get("file");
  if (!(file instanceof File)) throw new Error("Arquivo PDF obrigatório.");
  if (!file.name.toLowerCase().endsWith(".pdf")) {
    throw new Error("Formato inválido. Envie um arquivo PDF.");
  }
  const bytes = new Uint8Array(await file.arrayBuffer());
  assertImportFileWithinLimit({
    fileName: file.name,
    byteLength: bytes.byteLength,
  });

  const { extractPdfText } = await import(
    "@/lib/import-engine/parsers/pdf-text-extractor"
  );
  let extraction;
  try {
    extraction = extractPdfText(Buffer.from(bytes));
  } catch (err) {
    throw new Error(
      err instanceof Error
        ? `PDF inválido ou corrompido: ${err.message}`
        : "PDF inválido ou corrompido.",
    );
  }

  if (extraction.status === "image_only") {
    if (isPdfOcrImportEnabled()) {
      throw new Error(
        "PDF imagem detectado. OCR está sinalizado mas sem provider seguro nesta sprint — use XML NF-e, Excel ou CSV.",
      );
    }
    throw new Error(
      "PDF sem texto pesquisável (imagem/scan). OCR está desligado. Exporte como Excel/CSV ou use XML oficial da NF-e.",
    );
  }

  return {
    ok: true as const,
    fileName: file.name,
    size: bytes.byteLength,
    pageCount: extraction.pageCount,
    textChars: extraction.text.length,
    previewText: extraction.text.slice(0, 800),
    notes: [
      "PDF usado apenas como documento auxiliar / análise assistida.",
      "Não substitui o XML oficial da NF-e.",
      "Nenhum produto foi inventado ou gravado.",
    ],
  };
}

export async function listCatalogImportHistoryAction(tenantSlug: string) {
  const auth = await resolveCatalogAuth(tenantSlug, [
    "produtos.visualizar",
    "estoque.visualizar",
    "servicos.importar",
    "estoque.importar",
  ]);
  const bundle = createProductionImportEngine(auth.client);
  const [catalog, stock, invoice] = await Promise.all([
    bundle.engine.listHistory(
      auth.tenant.id,
      CATALOG_IMPORT_ADAPTER.moduleKey,
      50,
    ),
    bundle.engine.listHistory(
      auth.tenant.id,
      STOCK_IMPORT_ADAPTER.moduleKey,
      50,
    ),
    bundle.engine.listHistory(
      auth.tenant.id,
      INVOICE_IMPORT_ADAPTER.moduleKey,
      50,
    ),
  ]);
  return [...catalog, ...stock, ...invoice].sort((a, b) =>
    a.createdAt < b.createdAt ? 1 : -1,
  );
}
