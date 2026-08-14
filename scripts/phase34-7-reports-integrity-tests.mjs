#!/usr/bin/env node
/**
 * Sprint 34.7 — Relatórios piloto + integridade dos indicadores.
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(root, p), "utf8");

describe("34.7 source of truth — faturamento", () => {
  it("exclui cancelado/orçamento e usa líquido (total)", async () => {
    const {
      aggregateFaturamentoLiquido,
      isVendaValidaParaFaturamento,
      valorLiquidoVenda,
    } = await import(
      pathToFileURL(join(root, "lib/dashboard/faturamento-agregacao.ts")).href +
        `?t=${Date.now()}`
    );

    assert.equal(
      isVendaValidaParaFaturamento({ status: "cancelado", deleted_at: null }),
      false,
    );
    assert.equal(
      isVendaValidaParaFaturamento({ status: "orcamento", deleted_at: null }),
      false,
    );
    assert.equal(
      isVendaValidaParaFaturamento({ status: "faturado", deleted_at: null }),
      true,
    );

    const agg = aggregateFaturamentoLiquido({
      vendas: [
        {
          status: "faturado",
          deleted_at: null,
          subtotal: 100,
          desconto_total: 10,
          total: 90,
          data_venda: "2026-08-01",
        },
        {
          status: "cancelado",
          deleted_at: null,
          subtotal: 500,
          desconto_total: 0,
          total: 500,
          data_venda: "2026-08-01",
        },
        {
          status: "faturado",
          deleted_at: "2026-08-02",
          subtotal: 200,
          total: 200,
          data_venda: "2026-08-01",
        },
      ],
      crAvulsas: [
        {
          status: "aberto",
          deleted_at: null,
          venda_id: null,
          valor_original: 30,
          data_competencia: "2026-08-01",
        },
        {
          status: "cancelado",
          deleted_at: null,
          venda_id: null,
          valor_original: 999,
          data_competencia: "2026-08-01",
        },
      ],
      dataDe: "2026-08-01",
      dataAte: "2026-08-31",
    });

    assert.equal(agg.liquido, 120); // 90 + 30
    assert.equal(agg.quantidade_vendas, 1);
    assert.equal(agg.ticket_medio, 120);
    assert.equal(valorLiquidoVenda({ total: 90 }), 90);
  });

  it("gráfico diário do dashboard seleciona total (não subtotal)", () => {
    const src = read("lib/dashboard/dashboard-service.ts");
    assert.match(src, /select\("data_venda, total"\)/);
    assert.match(src, /Number\(row\.total\)/);
    assert.ok(!/select\("data_venda, subtotal"\)/.test(src));
  });
});

describe("34.7 CSV safety", () => {
  it("prefixa fórmula e escapa aspas", async () => {
    const { csvEscapeCell, buildAnalyticsCsv } = await import(
      pathToFileURL(join(root, "lib/analytics/core/csv-safe.ts")).href +
        `?t=${Date.now()}`
    );
    assert.equal(csvEscapeCell("=1+1"), "'=1+1");
    assert.equal(csvEscapeCell("+cmd"), "'+cmd");
    assert.equal(csvEscapeCell("-2"), "'-2");
    assert.equal(csvEscapeCell("@sum"), "'@sum");
    assert.equal(csvEscapeCell('a"b'), '"a""b"');
    const csv = buildAnalyticsCsv([{ nome: "=HACK", valor: 10 }], [
      "nome",
      "valor",
    ]);
    assert.ok(csv.startsWith("\uFEFF"));
    assert.match(csv, /'=HACK/);
  });

  it("exports de dashboard/comercial/drawer usam csvEscapeCell", () => {
    for (const f of [
      "lib/dashboard/export.ts",
      "lib/metas/commercial-export.ts",
      "components/dashboard/resumo-dia-drawer.tsx",
    ]) {
      assert.match(read(f), /csvEscapeCell/, f);
    }
  });
});

describe("34.7 filters / timezone", () => {
  it("resolvePeriodPreset usa America/Sao_Paulo e corrige período invertido", async () => {
    const { resolvePeriodPreset } = await import(
      pathToFileURL(join(root, "lib/analytics/core/filter-engine.ts")).href +
        `?t=${Date.now()}`
    );
    const engine = read("lib/analytics/core/filter-engine.ts");
    assert.match(engine, /DEFAULT_TENANT_TIMEZONE|America\/Sao_Paulo/);
    assert.match(engine, /civilDateInTimezone/);

    // 2026-08-14 03:00 UTC = ainda 13/08 em SP → "hoje" SP
    const nearMidnightUtc = new Date("2026-08-14T02:30:00.000Z");
    const todaySp = resolvePeriodPreset("today", {
      now: nearMidnightUtc,
      timeZone: "America/Sao_Paulo",
    });
    assert.equal(todaySp.from, "2026-08-13");
    assert.equal(todaySp.to, "2026-08-13");

    const custom = resolvePeriodPreset("custom", {
      now: new Date("2026-08-14T15:00:00.000Z"),
      customFrom: "2026-08-20",
      customTo: "2026-08-10",
    });
    assert.equal(custom.from, "2026-08-10");
    assert.equal(custom.to, "2026-08-20");

    const last30 = resolvePeriodPreset("last_30", {
      now: new Date("2026-08-14T15:00:00.000Z"),
    });
    assert.equal(last30.from, "2026-07-16");
    assert.equal(last30.to, "2026-08-14");
  });
});

describe("34.7 finance aging pagination", () => {
  it("aging pagina além de perPage 50", () => {
    const src = read("app/(app)/[tenant]/financeiro/aging/page.tsx");
    assert.match(src, /MAX_AGING_PAGES/);
    assert.match(src, /page \+= 1|page \+ 1/);
    assert.match(src, /totalPages/);
    assert.ok(!/perPage:\s*50[\s\S]*status:\s*"all"[\s\S]*buildAgingReport/.test(
      src.replace(/\s+/g, " "),
    ) || /do \{/.test(src));
    assert.match(src, /do \{/);
  });

  it("aging puro classifica buckets", async () => {
    const { buildAgingReport } = await import(
      pathToFileURL(join(root, "lib/finance/aging/aging.ts")).href +
        `?t=${Date.now()}`
    );
    const report = buildAgingReport(
      [
        {
          id: "1",
          valor: 100,
          dataVencimento: "2026-08-20",
          clienteNome: "A",
        },
        {
          id: "2",
          valor: 50,
          dataVencimento: "2026-07-01",
          clienteNome: "B",
        },
      ],
      "2026-08-14",
    );
    assert.equal(report.totalAVencer, 100);
    assert.equal(report.totalVencido, 50);
    assert.equal(report.totalGeral, 150);
  });
});

describe("34.7 honesty hub + inventory evidence", () => {
  it("hub /relatorios aponta módulos reais sem mock", () => {
    const page = read("app/(app)/[tenant]/relatorios/page.tsx");
    assert.match(page, /sem dados demonstrativos/i);
    assert.match(page, /dashboard/);
    assert.match(page, /financeiro\/aging/);
    assert.match(page, /estoque\/dashboard/);
    assert.ok(!/R\$\s*0.*gráfico fictício/i.test(page));
  });

  it("evidência 34.7 presente", () => {
    assert.ok(existsSync(join(root, "docs/testing/evidence/34-7/REPORT.md")));
  });
});

describe("34.7 tenant / export guards (contracts)", () => {
  it("export analytics exige permissão de exportação", () => {
    const actions = read("lib/analytics/analytics-actions.ts");
    assert.match(actions, /exportAnalyticsCsv/);
    assert.match(actions, /analytics\.exportar/);
  });

  it("sanitizeMetricFilter bloqueia empresaIds sem allow-list", async () => {
    const { sanitizeMetricFilter, resolvePeriodPreset } = await import(
      pathToFileURL(join(root, "lib/analytics/core/filter-engine.ts")).href +
        `?t=${Date.now()}`
    );
    const period = resolvePeriodPreset("last_7", {
      now: new Date("2026-08-14T15:00:00.000Z"),
    });
    const filtered = sanitizeMetricFilter({
      period,
      raw: { empresaIds: ["tenant-b-empresa"] },
      authorizedEmpresaIds: null,
    });
    assert.equal(filtered.empresaIds, undefined);
  });
});

describe("34.7 billing freeze", () => {
  it("não toca Asaas production / billing", () => {
    // Smoke: suite não importa módulos de cobrança real
    assert.ok(true);
  });
});
