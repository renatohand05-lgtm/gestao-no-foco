import {
  formatCurrency,
  formatNumber,
  formatPercent,
  formatVariationPct,
} from "@/lib/dashboard/format";
import type { DashboardExecutiveData } from "@/types/dashboard-executive";

type ExportRow = Record<string, string | number | null>;

function escapeCsvValue(value: string | number | null): string {
  if (value === null || value === undefined) return "";
  const text = String(value);
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function rowsToCsv(rows: ExportRow[]): string {
  if (rows.length === 0) return "";

  const headers = Object.keys(rows[0]!);
  const lines = [
    headers.map(escapeCsvValue).join(","),
    ...rows.map((row) => headers.map((header) => escapeCsvValue(row[header] ?? null)).join(",")),
  ];

  return `\uFEFF${lines.join("\n")}`;
}

function downloadBlob(content: BlobPart, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function buildExportFilename(tenantName: string, extension: string) {
  const safeName = tenantName
    .toLowerCase()
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-|-$/g, "");
  const date = new Date().toISOString().slice(0, 10);
  return `dashboard-${safeName || "executivo"}-${date}.${extension}`;
}

function buildKpiRows(data: DashboardExecutiveData): ExportRow[] {
  const { kpis, comparisons } = data;

  const entries: Array<[string, string, keyof typeof comparisons | null]> = [
    ["Faturamento", formatCurrency(kpis.faturamento), "faturamento"],
    ["Receita Líquida", formatCurrency(kpis.receita_liquida), "receita_liquida"],
    ["EBITDA", formatCurrency(kpis.ebitda), "ebitda"],
    ["CMV", formatCurrency(kpis.cmv), "cmv"],
    ["Margem média", formatPercent(kpis.margem_media), "margem_media"],
    ["Saldo bancário", formatCurrency(kpis.saldo_bancario), null],
    ["Contas a receber", formatCurrency(kpis.contas_receber_aberto), "contas_receber_aberto"],
    ["Contas a pagar", formatCurrency(kpis.contas_pagar_aberto), "contas_pagar_aberto"],
    ["Entradas previstas", formatCurrency(kpis.entradas_previstas), null],
    ["Saídas previstas", formatCurrency(kpis.saidas_previstas), null],
    ["Ticket médio", formatCurrency(kpis.ticket_medio), "ticket_medio"],
    ["Vendas", formatNumber(kpis.quantidade_vendas), "quantidade_vendas"],
    ["Clientes", formatNumber(kpis.quantidade_clientes), null],
  ];

  return entries.map(([indicador, valor, comparisonKey]) => {
    const comparison = comparisonKey ? comparisons[comparisonKey] : null;
    return {
      Indicador: indicador,
      Valor: valor,
      "Variação %": comparison ? formatVariationPct(comparison.variationPct) : "—",
      Tendência: comparison?.trend ?? "—",
    };
  });
}

function buildRankingRows(
  title: string,
  items: DashboardExecutiveData["rankings"]["clientes"],
): ExportRow[] {
  return items.map((item, index) => ({
    Ranking: title,
    Posição: index + 1,
    Nome: item.label,
    Valor: formatCurrency(item.value),
  }));
}

function buildChartRows(
  title: string,
  points: DashboardExecutiveData["charts"]["faturamentoDiario"],
  secondaryLabel?: string,
): ExportRow[] {
  return points.map((point) => ({
    Gráfico: title,
    Data: point.data,
    Rótulo: point.label,
    Valor: point.value,
    ...(secondaryLabel
      ? { [secondaryLabel]: point.secondary ?? 0 }
      : {}),
  }));
}

function buildAllExportRows(data: DashboardExecutiveData): ExportRow[] {
  return [
    { Seção: "Período", Valor: data.periodo.label },
    { Seção: "Período anterior", Valor: data.periodoAnterior.label },
    { Seção: "Health Score", Valor: data.intelligence.healthScore.score },
    { Seção: "Classificação", Valor: data.intelligence.healthScore.label },
    ...buildKpiRows(data),
    ...buildRankingRows("Top clientes", data.rankings.clientes),
    ...buildRankingRows("Top produtos", data.rankings.produtos),
    ...buildRankingRows("Top serviços", data.rankings.servicos),
    ...buildRankingRows("Top categorias", data.rankings.categorias),
    ...buildChartRows("Faturamento diário", data.charts.faturamentoDiario),
    ...buildChartRows(
      "Receitas vs despesas",
      data.charts.receitasVsDespesas,
      "Despesas",
    ),
    ...buildChartRows("Fluxo acumulado", data.charts.fluxoAcumulado),
    ...buildChartRows("Evolução EBITDA", data.charts.ebitdaEvolucao),
    { Seção: "Qualidade — Taxa retorno", Valor: formatPercent(data.qualidadeOperacional.kpi.taxaRetornoPct) },
    { Seção: "Qualidade — Retornos", Valor: data.qualidadeOperacional.kpi.quantidadeRetornos },
    { Seção: "Qualidade — Serviços concluídos", Valor: data.qualidadeOperacional.kpi.totalServicosConcluidos },
    ...data.qualidadeOperacional.rankings.mecanicos.map((item, index) => ({
      Ranking: "Top mecânicos retorno",
      Posição: index + 1,
      Nome: item.label,
      Valor: formatPercent(item.value),
    })),
  ];
}

function rowsToExcelXml(rows: ExportRow[], sheetName: string): string {
  const headers = Array.from(
    rows.reduce((set, row) => {
      Object.keys(row).forEach((key) => set.add(key));
      return set;
    }, new Set<string>()),
  );

  const escapeXml = (value: string | number | null) =>
    String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  const headerRow = headers
    .map((header) => `<Cell><Data ss:Type="String">${escapeXml(header)}</Data></Cell>`)
    .join("");

  const dataRows = rows
    .map((row) => {
      const cells = headers
        .map((header) => {
          const value = row[header];
          const type =
            typeof value === "number" ? "Number" : "String";
          return `<Cell><Data ss:Type="${type}">${escapeXml(value ?? "")}</Data></Cell>`;
        })
        .join("");
      return `<Row>${cells}</Row>`;
    })
    .join("");

  return `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
<Worksheet ss:Name="${escapeXml(sheetName)}">
<Table>
<Row>${headerRow}</Row>
${dataRows}
</Table>
</Worksheet>
</Workbook>`;
}

function buildPdfHtml(data: DashboardExecutiveData, tenantName: string) {
  const kpiRows = buildKpiRows(data)
    .map(
      (row) =>
        `<tr><td>${row.Indicador}</td><td>${row.Valor}</td><td>${row["Variação %"]}</td></tr>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>Dashboard Executivo — ${tenantName}</title>
  <style>
    body { font-family: system-ui, sans-serif; color: #0f172a; padding: 32px; }
    h1 { font-size: 22px; margin-bottom: 4px; }
    p { color: #64748b; margin-top: 0; }
    table { width: 100%; border-collapse: collapse; margin-top: 24px; }
    th, td { border: 1px solid #e2e8f0; padding: 8px 10px; text-align: left; font-size: 13px; }
    th { background: #f8fafc; }
    .meta { margin-top: 16px; font-size: 13px; color: #475569; }
  </style>
</head>
<body>
  <h1>Dashboard Executivo — ${tenantName}</h1>
  <p>Período: ${data.periodo.label}</p>
  <div class="meta">
    Health Score: <strong>${data.intelligence.healthScore.score}</strong>
    (${data.intelligence.healthScore.label})
  </div>
  <table>
    <thead>
      <tr><th>Indicador</th><th>Valor</th><th>Variação</th></tr>
    </thead>
    <tbody>${kpiRows}</tbody>
  </table>
</body>
</html>`;
}

export function exportDashboardCsv(data: DashboardExecutiveData, tenantName: string) {
  const rows = buildAllExportRows(data);
  const csv = rowsToCsv(rows);
  downloadBlob(csv, buildExportFilename(tenantName, "csv"), "text/csv;charset=utf-8");
}

export function exportDashboardExcel(data: DashboardExecutiveData, tenantName: string) {
  const rows = buildAllExportRows(data);
  const xml = rowsToExcelXml(rows, "Dashboard");
  downloadBlob(
    xml,
    buildExportFilename(tenantName, "xls"),
    "application/vnd.ms-excel",
  );
}

export function exportDashboardPdf(data: DashboardExecutiveData, tenantName: string) {
  const html = buildPdfHtml(data, tenantName);
  const printWindow = window.open("", "_blank");

  if (!printWindow) {
    throw new Error("Não foi possível abrir a janela de impressão.");
  }

  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
}
