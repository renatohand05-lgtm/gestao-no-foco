#!/usr/bin/env node
/**
 * Inventário de selects — Sprint 27.8.1 (não migra; apenas documenta).
 */
import { readdirSync, readFileSync, writeFileSync, mkdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const root = process.cwd();
const OUT = join(root, "docs/testing/evidence/27-8-1");
mkdirSync(OUT, { recursive: true });

const ROOTS = ["components", "app"];
const rows = [];

function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) {
      if (name === "node_modules" || name === ".next" || name === ".next-build") {
        continue;
      }
      walk(p);
      continue;
    }
    if (!/\.(tsx|jsx)$/.test(name)) continue;
    const text = readFileSync(p, "utf8");
    const rel = relative(root, p).replaceAll("\\", "/");
    const patterns = [
      { re: /<GFSelect\b/g, tipo: "GFSelect", risco: "baixo", acao: "manter" },
      {
        re: /<GFCombobox\b/g,
        tipo: "GFCombobox",
        risco: "baixo",
        acao: "manter",
      },
      {
        re: /<NativeSelect\b/g,
        tipo: "NativeSelect",
        risco: "médio",
        acao: "migrar para GFSelect se crítico/UX",
      },
      {
        re: /<select\b/g,
        tipo: "select nativo",
        risco: "alto (painel SO)",
        acao: "envolver NativeSelect ou migrar GFSelect",
      },
    ];
    for (const { re, tipo, risco, acao } of patterns) {
      // NativeSelect wraps <select> — ignore native-select.tsx bare select
      if (tipo === "select nativo" && rel.endsWith("components/ui/native-select.tsx")) {
        continue;
      }
      let m;
      const copy = new RegExp(re.source, re.flags);
      while ((m = copy.exec(text)) !== null) {
        const line = text.slice(0, m.index).split(/\r?\n/).length;
        const snippet = text
          .split(/\r?\n/)
          [line - 1]?.trim()
          .slice(0, 120);
        rows.push({
          arquivo: rel,
          linha: line,
          campo: snippet || "(sem contexto)",
          tipo_atual: tipo,
          risco_visual: risco,
          proxima_acao: acao,
        });
      }
    }
  }
}

for (const r of ROOTS) walk(join(root, r));

const summary = {
  at: new Date().toISOString(),
  totals: {
    GFSelect: rows.filter((r) => r.tipo_atual === "GFSelect").length,
    GFCombobox: rows.filter((r) => r.tipo_atual === "GFCombobox").length,
    NativeSelect: rows.filter((r) => r.tipo_atual === "NativeSelect").length,
    select_nativo: rows.filter((r) => r.tipo_atual === "select nativo").length,
    total: rows.length,
  },
  rows,
};

writeFileSync(join(OUT, "selects-inventory.json"), JSON.stringify(summary, null, 2));

const md = [
  "# Inventário de selects — Sprint 27.8.1",
  "",
  `Gerado em: ${summary.at}`,
  "",
  "## Totais",
  "",
  `| Tipo | Qtd |`,
  `|---|---:|`,
  `| GFSelect | ${summary.totals.GFSelect} |`,
  `| GFCombobox | ${summary.totals.GFCombobox} |`,
  `| NativeSelect | ${summary.totals.NativeSelect} |`,
  `| select nativo (bare) | ${summary.totals.select_nativo} |`,
  `| **Total ocorrências** | **${summary.totals.total}** |`,
  "",
  "## Lista",
  "",
  "| Arquivo | Campo | Tipo atual | Risco visual | Próxima ação |",
  "|---|---|---|---|---|",
  ...rows.map(
    (r) =>
      `| \`${r.arquivo}:${r.linha}\` | ${r.campo.replaceAll("|", "\\|")} | ${r.tipo_atual} | ${r.risco_visual} | ${r.proxima_acao} |`,
  ),
  "",
];
writeFileSync(join(OUT, "SELECTS_REMAINING.md"), md.join("\n"));

console.log(
  `Selects: GF=${summary.totals.GFSelect} CB=${summary.totals.GFCombobox} NS=${summary.totals.NativeSelect} bare=${summary.totals.select_nativo} total=${summary.totals.total}`,
);
