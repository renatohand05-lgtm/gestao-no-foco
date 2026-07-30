/**
 * Sprint 25.3 — Preview NF-e via Import Engine + parser seguro existente.
 */

"use server";

import { getCurrentProfile } from "@/lib/auth/session";
import {
  buildInvoiceItemRows,
  canAutoCreateProductFromInvoice,
  parseInvoiceXmlSafe,
  resolveInvoiceItemMatch,
} from "@/lib/catalog-import/invoice-bridge";
import { buildCatalogPreviewSummary } from "@/lib/catalog-import/preview-summary";
import {
  createEnterpriseContext,
  createRbacSupabaseAdapter,
} from "@/lib/enterprise";
import { INVOICE_IMPORT_ADAPTER } from "@/lib/import-engine/adapters/invoice/adapter";
import { createProductionImportEngine } from "@/lib/import-engine";
import { createClient } from "@/lib/supabase/server";
import { requireTenant } from "@/lib/tenants";

async function resolveInvoiceAuth(tenantSlug: string) {
  const tenant = await requireTenant(tenantSlug);
  const profile = await getCurrentProfile();
  if (!profile?.id) throw new Error("Sessão ausente.");
  const client = await createClient();
  const rbac = createRbacSupabaseAdapter(client);
  const snap = await rbac.resolveAuthorizationSnapshot(tenant.id, profile.id);
  const permissions = snap.permissions ?? [];
  const needed = ["compras.receber", "estoque.importar", "estoque.movimentar"];
  if (!needed.some((p) => permissions.includes(p))) {
    throw new Error(`Sem permissão (${needed.join(" | ")}).`);
  }
  createEnterpriseContext({
    tenantId: tenant.id,
    userId: profile.id,
    roles: snap.roles ?? [],
    permissions,
    source: "server_action",
  });
  return { tenant, profile, client };
}

export async function previewInvoiceXmlImportAction(
  tenantSlug: string,
  formData: FormData,
) {
  const auth = await resolveInvoiceAuth(tenantSlug);
  const file = formData.get("file");
  if (!(file instanceof File)) throw new Error("Arquivo XML obrigatório.");
  const bytes = new Uint8Array(await file.arrayBuffer());
  const parsed = parseInvoiceXmlSafe({
    fileName: file.name,
    mimeType: file.type,
    bytes,
  });

  const { data: existingNota } = await auth.client
    .from("notas_fiscais_entrada" as never)
    .select("id")
    .eq("tenant_id", auth.tenant.id)
    .eq("chave_acesso", parsed.chave_acesso)
    .is("deleted_at", null)
    .maybeSingle();

  const { data: products } = await auth.client
    .from("produtos")
    .select("id, sku, codigo_barras, codigo_interno, nome")
    .eq("tenant_id", auth.tenant.id)
    .is("deleted_at", null)
    .limit(5000);

  const byEan = new Map<string, string>();
  const bySku = new Map<string, string>();
  const bySupplierCode = new Map<string, string>();
  const byName = new Map<string, string>();
  for (const p of products ?? []) {
    if (p.codigo_barras) byEan.set(p.codigo_barras, p.id);
    if (p.sku) bySku.set(p.sku.toUpperCase(), p.id);
    if (p.codigo_interno) {
      bySupplierCode.set(p.codigo_interno, p.id);
      bySku.set(p.codigo_interno.toUpperCase(), p.id);
    }
    if (p.nome) {
      byName.set(
        p.nome
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase()
          .trim(),
        p.id,
      );
    }
  }

  const itemRows = buildInvoiceItemRows(parsed);
  const matches = itemRows.map((item, idx) => {
    const match = resolveInvoiceItemMatch({
      ean: item.ean,
      codigo: item.codigo_produto,
      descricao: item.descricao,
      byEan,
      bySku,
      bySupplierCode,
      byName,
    });
    return {
      line: idx + 1,
      ...match,
      quantidade: item.quantidade,
      valorUnitario: item.valor_unitario,
      canAutoCreate: canAutoCreateProductFromInvoice(match.confidence),
    };
  });

  const summary = buildCatalogPreviewSummary({
    fileName: file.name,
    detectedType: "nfe_xml",
    totalRows: itemRows.length,
    financialTotal: parsed.totais.valor_total,
    duplicates: existingNota ? 1 : 0,
    newProducts: matches.filter((m) => m.status === "nao_encontrado").length,
    lowConfidence: matches.filter((m) => m.confidence < 0.75).length,
    supplierLabel: parsed.emitente.razao_social,
    accountsPayablePreview: parsed.totais.valor_total,
    notes: [
      existingNota
        ? "NF já existente neste tenant — reimportação deve ser idempotente."
        : "NF nova — confirmação via fluxo de estoque/notas-fiscais.",
      "Persistência canônica: NfeEntradaService (Import Engine registra histórico).",
      "Baixa confiança não cria produto automaticamente.",
      "DANFE PDF é apenas auxiliar — não processado como NF.",
    ],
  });

  // Registra preview no histórico da engine (sem commit de estoque)
  const bundle = createProductionImportEngine(auth.client);
  await bundle.history.append({
    tenantId: auth.tenant.id,
    userId: auth.profile.id,
    userLabel: auth.profile.name ?? auth.profile.email,
    module: INVOICE_IMPORT_ADAPTER.moduleKey,
    targetEntity: INVOICE_IMPORT_ADAPTER.targetEntity,
    fileName: file.name,
    format: "xml",
    status: "preview",
    totalRows: itemRows.length,
    importedRows: 0,
    rejectedRows: 0,
    errorCount: 0,
    durationMs: 0,
    errorsSample: [],
    mappingSnapshot: { chave_acesso: parsed.chave_acesso },
    correlationId: parsed.chave_acesso,
    engineVersion: "25.3",
  });

  return {
    summary,
    matches,
    chaveAcesso: parsed.chave_acesso,
    alreadyExists: Boolean(existingNota),
    financial: parsed.totais,
    redirectTo: `/${tenantSlug}/estoque/notas-fiscais/nova`,
  };
}
