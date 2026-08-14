#!/usr/bin/env node
/**
 * Sprint 34.9 — Contas a Pagar: beneficiários + presets + forma contextual.
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(root, p), "utf8");

describe("34.9 migration + schema contracts", () => {
  it("migration aditiva presente sem DELETE", () => {
    const path =
      "supabase/migrations/20260827_phase34_9_contas_pagar_beneficiarios.sql";
    assert.ok(existsSync(join(root, path)));
    const sql = read(path);
    assert.match(sql, /financeiro_beneficiarios/);
    assert.match(sql, /beneficiario_tipo/);
    assert.match(sql, /mecanico_id/);
    assert.match(sql, /fornecedor_id/);
    assert.ok(!/\bDELETE FROM\b/i.test(sql));
    assert.ok(!/\bDROP TABLE\b/i.test(sql));
  });

  it("migration catálogo formas CAP é aditiva e preserva legado", () => {
    const path =
      "supabase/migrations/20260828_phase34_9_formas_pagamento_catalog.sql";
    assert.ok(existsSync(join(root, path)));
    const sql = read(path);
    assert.match(sql, /Transferência bancária/);
    assert.match(sql, /Boleto/);
    assert.match(sql, /Débito automático/);
    assert.match(sql, /Depósito bancário/);
    assert.match(sql, /credito/);
    assert.ok(!/\bDELETE FROM\b/i.test(sql));
    assert.ok(!/\bDROP TABLE\b/i.test(sql));
  });

  it("migration categorias CAP é aditiva e preserva customizações", () => {
    const path =
      "supabase/migrations/20260829_phase34_9_finance_categories_catalog.sql";
    assert.ok(existsSync(join(root, path)));
    const sql = read(path);
    assert.match(sql, /Salários/);
    assert.match(sql, /Energia elétrica/);
    assert.match(sql, /Marketing \/ publicidade/);
    assert.match(sql, /despesas_pessoal/);
    assert.ok(!/\bDELETE FROM\b/i.test(sql));
    assert.ok(!/\bUPDATE\s+public\.categorias_financeiras\b/i.test(sql));
    assert.ok(!/\bDROP TABLE\b/i.test(sql));
  });
});

describe("34.9 presets + classificação", () => {
  it("resolve salário/aluguel/energia/água/royalties/marketing", async () => {
    const { resolveDespesaPreset, DESPESA_PRESETS } = await import(
      pathToFileURL(join(root, "lib/financeiro/despesa-presets.ts")).href +
        `?t=${Date.now()}`
    );
    assert.ok(DESPESA_PRESETS.length >= 15);

    const categorias = [
      { id: "c-sal", nome: "Salários", dre_linha: "despesas_pessoal" },
      { id: "c-alu", nome: "Aluguel", dre_linha: "despesas_operacionais" },
      { id: "c-ene", nome: "Energia elétrica", dre_linha: "despesas_operacionais" },
      { id: "c-agua", nome: "Água", dre_linha: "despesas_operacionais" },
      { id: "c-roy", nome: "Royalties", dre_linha: "despesas_operacionais" },
      { id: "c-mkt", nome: "Marketing", dre_linha: "despesas_comerciais" },
    ];
    const planos = [
      { id: "p-sal", nome: "Folha salarial", codigo: "3.1", dre_linha: "despesas_pessoal" },
      { id: "p-alu", nome: "Aluguel", codigo: "3.2", dre_linha: "despesas_operacionais" },
      { id: "p-ene", nome: "Energia", codigo: "3.3", dre_linha: "despesas_operacionais" },
      { id: "p-agua", nome: "Água e saneamento", codigo: "3.4", dre_linha: "despesas_operacionais" },
      { id: "p-roy", nome: "Royalties", codigo: "3.5", dre_linha: "despesas_operacionais" },
      { id: "p-mkt", nome: "Publicidade", codigo: "3.6", dre_linha: "despesas_comerciais" },
    ];

    for (const id of [
      "salarios",
      "aluguel",
      "energia",
      "agua",
      "royalties",
      "marketing",
    ]) {
      const r = resolveDespesaPreset(id, categorias, planos);
      assert.ok(r, id);
      assert.equal(r.classificacaoPendente, false, id);
      assert.ok(r.categoriaId);
      assert.ok(r.planoContaId);
    }

    const pending = resolveDespesaPreset("internet", [], []);
    assert.ok(pending);
    assert.equal(pending.classificacaoPendente, true);
  });

  it("não inventa IDs", async () => {
    const { resolveDespesaPreset } = await import(
      pathToFileURL(join(root, "lib/financeiro/despesa-presets.ts")).href +
        `?t=${Date.now()}`
    );
    const r = resolveDespesaPreset("salarios", [], []);
    assert.equal(r.categoriaId, null);
    assert.equal(r.planoContaId, null);
  });
});

describe("34.9 forma de pagamento contextual", () => {
  const catalog = [
    { id: "fp-pix", nome: "PIX", tipo: "pix" },
    { id: "fp-ted", nome: "TED", tipo: "transferencia" },
    { id: "fp-transf", nome: "Transferência bancária", tipo: "transferencia" },
    { id: "fp-dep", nome: "Depósito bancário", tipo: "outros" },
    { id: "fp-din", nome: "Dinheiro", tipo: "dinheiro" },
    { id: "fp-bol", nome: "Boleto", tipo: "boleto" },
    { id: "fp-da", nome: "Débito automático", tipo: "outros" },
    { id: "fp-card", nome: "Cartão crédito", tipo: "cartao_credito" },
    { id: "fp-deb", nome: "Débito em conta", tipo: "outros" },
    { id: "fp-guia", nome: "Guia / código de barras", tipo: "outros" },
    { id: "fp-doc", nome: "DOC", tipo: "transferencia" },
    { id: "fp-cheque", nome: "Cheque", tipo: "cheque" },
  ];

  it("salário / prestador / aluguel / energia / água / royalties / marketing", async () => {
    const {
      suggestFormaPagamentoId,
      orderFormasPagamentoForPreset,
      isFormaPagamentoDoc,
    } = await import(
      pathToFileURL(join(root, "lib/financeiro/despesa-forma-pagamento.ts"))
        .href + `?t=${Date.now()}`
    );

    assert.equal(suggestFormaPagamentoId(catalog, "salarios"), "fp-pix");
    assert.equal(suggestFormaPagamentoId(catalog, "prestadores"), "fp-pix");
    assert.equal(suggestFormaPagamentoId(catalog, "aluguel"), "fp-pix");
    assert.equal(suggestFormaPagamentoId(catalog, "energia"), "fp-bol");
    assert.equal(suggestFormaPagamentoId(catalog, "agua"), "fp-bol");
    assert.equal(suggestFormaPagamentoId(catalog, "royalties"), "fp-pix");
    assert.equal(suggestFormaPagamentoId(catalog, "marketing"), "fp-pix");
    assert.equal(suggestFormaPagamentoId(catalog, "impostos"), "fp-pix");

    const orderedSalario = orderFormasPagamentoForPreset(catalog, "salarios");
    assert.equal(orderedSalario[0].id, "fp-pix");
    assert.ok(
      orderedSalario.findIndex((f) => f.id === "fp-doc") >
        orderedSalario.findIndex((f) => f.id === "fp-transf"),
    );
    assert.equal(
      isFormaPagamentoDoc(catalog.find((f) => f.id === "fp-doc")),
      true,
    );
  });

  it("não inventa forma quando catálogo não casa", async () => {
    const { suggestFormaPagamentoId } = await import(
      pathToFileURL(join(root, "lib/financeiro/despesa-forma-pagamento.ts"))
        .href + `?t=${Date.now()}`
    );
    assert.equal(
      suggestFormaPagamentoId(
        [{ id: "x", nome: "Cheque avulso", tipo: "cheque" }],
        "salarios",
      ),
      null,
    );
  });

  it("energia prioriza boleto sobre cartão; DOC nunca sugerido", async () => {
    const { suggestFormaPagamentoId, formaMatchesPreferencia } = await import(
      pathToFileURL(join(root, "lib/financeiro/despesa-forma-pagamento.ts"))
        .href + `?t=${Date.now()}`
    );
    const subset = [
      { id: "card", nome: "Cartão", tipo: "cartao_credito" },
      { id: "bol", nome: "Boleto", tipo: "boleto" },
      { id: "doc", nome: "DOC", tipo: "transferencia" },
    ];
    assert.equal(suggestFormaPagamentoId(subset, "energia"), "bol");
    assert.equal(
      formaMatchesPreferencia(
        { id: "doc", nome: "DOC", tipo: "transferencia" },
        "transferencia",
      ),
      false,
    );
  });

  it("UX aplica sugestão sem travar alteração manual", () => {
    const fields = read(
      "components/financeiro/conta-pagar-beneficiario-fields.tsx",
    );
    assert.match(fields, /suggestFormaPagamentoId/);
    assert.match(fields, /lastSuggestedFormaId/);
    assert.match(fields, /você pode alterar/);
    const form = read("components/financeiro/conta-pagar-form.tsx");
    assert.match(form, /Sugeridas para este lançamento/);
    assert.match(form, /resolveFormasForPreset/);
    assert.match(form, /formasPagamento=\{formasPagamento\}/);
  });

  it("beneficiário equipe/mecânico permanece sem virar fornecedor", () => {
    const fields = read(
      "components/financeiro/conta-pagar-beneficiario-fields.tsx",
    );
    assert.match(fields, /mecanico_id/);
    assert.match(fields, /beneficiario_profile_id/);
    assert.match(fields, /Não cria fornecedor/);
  });
});

describe("34.9 fonte REAL do select Forma de pagamento", () => {
  it("Nova conta carrega formas via listFormasPagamento (tabela formas_pagamento)", () => {
    const nova = read(
      "app/(app)/[tenant]/financeiro/contas-pagar/nova/page.tsx",
    );
    assert.match(nova, /listFormasPagamento/);
    assert.match(nova, /formasPagamento=\{formasPagamento\}/);
    assert.doesNotMatch(nova, /CREDITO.*DEBITO.*DINHEIRO/);
    assert.doesNotMatch(nova, /VENDA_FORMA_PAGAMENTO_OPTIONS/);

    const service = read("lib/financeiro/conta-pagar-service.ts");
    assert.match(service, /ensureContasPagarFormasCatalog/);
    assert.match(service, /\.from\("formas_pagamento"\)/);
    assert.match(service, /formatFormaPagamentoLabel/);
    assert.match(service, /missingContasPagarFormas/);
  });

  it("catálogo CAP completa boleto/transferência/débito automático sem apagar legado", async () => {
    const {
      missingContasPagarFormas,
      CONTAS_PAGAR_FORMAS_CATALOG,
      CONTAS_PAGAR_FORMAS_UI_LABELS_REQUIRED,
    } = await import(
      pathToFileURL(join(root, "lib/financeiro/formas-pagamento-catalog.ts"))
        .href + `?t=${Date.now()}`
    );

    const legacyOnly = [
      { id: "1", nome: "CREDITO", tipo: "cartao_credito" },
      { id: "2", nome: "DEBITO", tipo: "cartao_debito" },
      { id: "3", nome: "DINHEIRO", tipo: "dinheiro" },
      { id: "4", nome: "PIX", tipo: "pix" },
    ];
    const missing = missingContasPagarFormas(legacyOnly);
    const keys = missing.map((m) => m.key);
    assert.ok(keys.includes("transferencia"));
    assert.ok(keys.includes("boleto"));
    assert.ok(keys.includes("debito_automatico"));
    assert.ok(keys.includes("deposito"));
    assert.ok(!keys.includes("pix"));
    assert.ok(!keys.includes("cartao_credito"));
    assert.ok(!keys.includes("dinheiro"));
    assert.ok(!CONTAS_PAGAR_FORMAS_CATALOG.some((c) => /doc/i.test(c.nome)));
    assert.ok(CONTAS_PAGAR_FORMAS_UI_LABELS_REQUIRED.includes("Boleto"));
    assert.ok(
      CONTAS_PAGAR_FORMAS_UI_LABELS_REQUIRED.includes("Transferência bancária"),
    );
  });

  it("labels amigáveis para CREDITO/DEBITO/DINHEIRO/PIX", async () => {
    const { formatFormaPagamentoLabel } = await import(
      pathToFileURL(join(root, "lib/financeiro/payment-method-label.ts"))
        .href + `?t=${Date.now()}`
    );
    assert.equal(
      formatFormaPagamentoLabel({ nome: "CREDITO", tipo: "cartao_credito" }),
      "Cartão de crédito",
    );
    assert.equal(
      formatFormaPagamentoLabel({ nome: "DEBITO", tipo: "cartao_debito" }),
      "Cartão de débito",
    );
    assert.equal(
      formatFormaPagamentoLabel({ nome: "DINHEIRO", tipo: "dinheiro" }),
      "Dinheiro",
    );
    assert.equal(
      formatFormaPagamentoLabel({ nome: "PIX", tipo: "pix" }),
      "PIX",
    );
  });

  it("com catálogo completo, salário sugere PIX e energia sugere boleto; manual permanece possível", async () => {
    const { suggestFormaPagamentoId, resolveFormasForPreset } = await import(
      pathToFileURL(join(root, "lib/financeiro/despesa-forma-pagamento.ts"))
        .href + `?t=${Date.now()}`
    );
    const full = [
      { id: "pix", nome: "PIX", tipo: "pix" },
      { id: "tr", nome: "Transferência bancária", tipo: "transferencia" },
      { id: "bol", nome: "Boleto", tipo: "boleto" },
      { id: "da", nome: "Débito automático", tipo: "outros" },
      { id: "dep", nome: "Depósito bancário", tipo: "outros" },
      { id: "din", nome: "Dinheiro", tipo: "dinheiro" },
      { id: "cc", nome: "CREDITO", tipo: "cartao_credito" },
    ];
    assert.equal(suggestFormaPagamentoId(full, "salarios"), "pix");
    assert.equal(suggestFormaPagamentoId(full, "energia"), "bol");
    const energia = resolveFormasForPreset(full, "energia");
    assert.equal(energia.ordered[0].id, "bol");
    assert.ok(energia.ordered.some((f) => f.id === "da"));
    // Usuário pode escolher qualquer id do catálogo (não há lock).
    assert.ok(full.some((f) => f.id === "cc"));
  });
});

describe("34.9 fonte REAL do select Categoria financeira", () => {
  it("Nova conta carrega categorias via listCategorias (tabela categorias_financeiras)", () => {
    const nova = read(
      "app/(app)/[tenant]/financeiro/contas-pagar/nova/page.tsx",
    );
    assert.match(nova, /listCategorias/);
    assert.match(nova, /categorias=\{categorias\}/);
    const service = read("lib/financeiro/conta-pagar-service.ts");
    assert.match(service, /ensureContasPagarCategoriasCatalog/);
    assert.match(service, /\.from\("categorias_financeiras"\)/);
    assert.match(service, /missingContasPagarCategorias/);
    assert.match(service, /\.in\("tipo", \["despesa", "ambos"\]\)/);
  });

  it("catálogo mínimo cobre atalhos 34.9 e não duplica ENERGIA", async () => {
    const {
      CONTAS_PAGAR_CATEGORIAS_CATALOG,
      missingContasPagarCategorias,
      findCategoriaForPreset,
    } = await import(
      pathToFileURL(
        join(root, "lib/financeiro/categorias-financeiras-catalog.ts"),
      ).href + `?t=${Date.now()}`
    );

    assert.ok(CONTAS_PAGAR_CATEGORIAS_CATALOG.length >= 20);

    const sparse = [
      { id: "1", nome: "ENERGIA", tipo: "despesa", dre_linha: null },
      { id: "2", nome: "DESPESAS GERAIS", tipo: "despesa", dre_linha: null },
    ];
    const missing = missingContasPagarCategorias(sparse);
    assert.ok(!missing.some((m) => m.key === "energia"));
    assert.ok(missing.some((m) => m.key === "salarios"));
    assert.ok(missing.some((m) => m.key === "aluguel"));
    assert.ok(missing.some((m) => m.key === "marketing"));

    const withCustom = [
      ...sparse,
      {
        id: "9",
        nome: "Marketing Digital Loja X",
        tipo: "despesa",
        dre_linha: "despesas_comerciais",
      },
    ];
    const missing2 = missingContasPagarCategorias(withCustom);
    assert.ok(
      !missing2.some((m) => m.key === "marketing"),
      "custom marketing equivalente preservada",
    );

    for (const presetId of [
      "salarios",
      "aluguel",
      "energia",
      "agua",
      "royalties",
      "marketing",
      "prestadores",
    ]) {
      const hit = findCategoriaForPreset(presetId, [
        ...CONTAS_PAGAR_CATEGORIAS_CATALOG.map((c, i) => ({
          id: String(i),
          nome: c.nome,
          tipo: c.tipo,
          dre_linha: c.dre_linha,
        })),
      ]);
      assert.ok(hit, presetId);
    }
  });

  it("atalhos resolvem categoria+DRE no catálogo completo; plano pode ficar pendente", async () => {
    const { resolveDespesaPreset } = await import(
      pathToFileURL(join(root, "lib/financeiro/despesa-presets.ts")).href +
        `?t=${Date.now()}`
    );
    const { CONTAS_PAGAR_CATEGORIAS_CATALOG } = await import(
      pathToFileURL(
        join(root, "lib/financeiro/categorias-financeiras-catalog.ts"),
      ).href + `?t=${Date.now()}`
    );
    const categorias = CONTAS_PAGAR_CATEGORIAS_CATALOG.map((c, i) => ({
      id: `c-${i}`,
      nome: c.nome,
      dre_linha: c.dre_linha,
    }));
    for (const presetId of [
      "salarios",
      "prolabore",
      "comissoes",
      "prestadores",
      "aluguel",
      "condominio",
      "energia",
      "agua",
      "internet",
      "telefone",
      "contabilidade",
      "royalties",
      "marketing",
      "software",
      "combustivel",
      "frete",
      "manutencao",
      "material_escritorio",
      "impostos",
      "seguros",
      "tarifas_bancarias",
      "outras",
    ]) {
      const r = resolveDespesaPreset(presetId, categorias, []);
      assert.ok(r?.categoriaId, presetId);
      assert.equal(r.planoContaId, null, `${presetId} plano pendente ok`);
    }
    const sal = resolveDespesaPreset("salarios", categorias, []);
    assert.equal(
      categorias.find((c) => c.id === sal.categoriaId)?.dre_linha,
      "despesas_pessoal",
    );
    const ene = resolveDespesaPreset("energia", categorias, []);
    assert.equal(
      categorias.find((c) => c.id === ene.categoriaId)?.dre_linha,
      "despesas_operacionais",
    );
  });

  it("tenant isolation: missing é calculado por lista do tenant (sem vazamento)", async () => {
    const { missingContasPagarCategorias } = await import(
      pathToFileURL(
        join(root, "lib/financeiro/categorias-financeiras-catalog.ts"),
      ).href + `?t=${Date.now()}`
    );
    const tenantA = [
      { id: "a1", nome: "Salários", tipo: "despesa" },
      { id: "a2", nome: "Aluguel", tipo: "despesa" },
    ];
    const tenantB = [{ id: "b1", nome: "ENERGIA ELETRICA", tipo: "despesa" }];
    const missA = missingContasPagarCategorias(tenantA).map((m) => m.key);
    const missB = missingContasPagarCategorias(tenantB).map((m) => m.key);
    assert.ok(!missA.includes("salarios"));
    assert.ok(missA.includes("energia"));
    assert.ok(missB.includes("salarios"));
    assert.ok(!missB.includes("energia"));
  });
});

describe("34.9 beneficiário types + form wiring", () => {
  it("tipos e labels cobrem jornada", async () => {
    const mod = await import(
      pathToFileURL(join(root, "lib/financeiro/beneficiario-types.ts")).href +
        `?t=${Date.now()}`
    );
    assert.ok(mod.BENEFICIARIO_TIPOS.includes("fornecedor"));
    assert.ok(mod.BENEFICIARIO_TIPOS.includes("mecanico"));
    assert.ok(mod.BENEFICIARIO_TIPOS.includes("funcionario"));
    assert.ok(mod.BENEFICIARIO_CADASTRO_TIPOS.includes("prestador"));
    assert.ok(mod.BENEFICIARIO_CADASTRO_TIPOS.includes("concessionaria"));
  });

  it("form/nova page usam beneficiário + presets", () => {
    const form = read("components/financeiro/conta-pagar-form.tsx");
    assert.match(form, /ContaPagarBeneficiarioFields/);
    const fields = read(
      "components/financeiro/conta-pagar-beneficiario-fields.tsx",
    );
    assert.match(fields, /DESPESA_PRESETS/);
    assert.match(fields, /Tipo de beneficiário/);
    assert.match(fields, /Novo beneficiário/);
    const nova = read("app/(app)/[tenant]/financeiro/contas-pagar/nova/page.tsx");
    assert.match(nova, /beneficiarios/);
    assert.match(nova, /mecanicos/);
  });

  it("payload preserva fornecedor_id e adiciona tipagem", () => {
    const mappers = read("lib/financeiro/mappers.ts");
    assert.match(mappers, /beneficiario_tipo/);
    assert.match(mappers, /mecanico_id/);
    assert.match(mappers, /fornecedor_id/);
    const validations = read("lib/financeiro/validations.ts");
    assert.match(validations, /beneficiario_tipo/);
  });

  it("lista/detalhe usam rótulo Beneficiário", () => {
    assert.match(read("components/financeiro/conta-pagar-table.tsx"), /Beneficiário/);
    assert.match(read("components/financeiro/conta-pagar-detail.tsx"), /Beneficiário/);
  });
});

describe("34.9 evidence + billing freeze + tenant/RBAC contracts", () => {
  it("REPORT 34-9 presente", () => {
    assert.ok(existsSync(join(root, "docs/testing/evidence/34-9/REPORT.md")));
  });

  it("billing frozen", async () => {
    const healthMod = await import(
      pathToFileURL(join(root, "lib/platform/health.ts")).href + `?t=${Date.now()}`
    );
    const status = await healthMod.buildSystemStatus(false);
    assert.equal(status.billing.frozen, true);
  });

  it("CAP actions mantêm gate de tenant/permissão", () => {
    const actions = read("lib/financeiro/actions.ts");
    assert.match(actions, /createContaPagarAction/);
    assert.match(actions, /requireFinanceiroAction/);
    const benefActions = read("lib/financeiro/beneficiario-actions.ts");
    assert.match(benefActions, /requireFinanceiroAction/);
    assert.match(benefActions, /financeiro\.criar/);
  });
});
