#!/usr/bin/env node
/**
 * Sprint 34.9 — Contas a Pagar: beneficiários + presets.
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

describe("34.9 evidence + billing freeze", () => {
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
});
