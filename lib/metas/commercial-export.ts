import {
  formatCurrency,
  formatNumber,
  formatPercent,
} from "@/lib/dashboard/format";
import {
  CONFIANCA_LABEL,
  HEATMAP_LABEL,
  PROBABILIDADE_LABEL,
  TENDENCIA_LABEL,
  type CommercialPanelData,
} from "@/types/commercial-panel";
import { META_STATUS_LABEL } from "@/lib/metas/projection";

type ExportRow = Record<string, string | number | null>;

function escapeCsvValue(value: string | number | null): string {
  if (value === null || value === undefined) return "";
  const text = String(value);
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function rowsToCsv(rows: ExportRow[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]!);
  return `\uFEFF${[
    headers.map(escapeCsvValue).join(","),
    ...rows.map((row) =>
      headers.map((h) => escapeCsvValue(row[h] ?? null)).join(","),
    ),
  ].join("\n")}`;
}

function downloadBlob(content: BlobPart, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function filename(tenantName: string, ext: string) {
  const safe = tenantName.toLowerCase().replace(/[^a-z0-9]+/gi, "-");
  return `painel-comercial-${safe}-${new Date().toISOString().slice(0, 10)}.${ext}`;
}

function buildResumoRows(data: CommercialPanelData): ExportRow[] {
  const p = data.projecao;
  return [
    { Indicador: "Competência", Valor: data.competencia.slice(0, 7) },
    {
      Indicador: "Meta",
      Valor: p.valor_meta === null ? "—" : formatCurrency(p.valor_meta),
    },
    { Indicador: "Realizado", Valor: formatCurrency(p.faturamento_realizado) },
    {
      Indicador: "Projeção dias corridos",
      Valor: formatCurrency(p.projecao_dias_corridos),
    },
    {
      Indicador: "Projeção dias úteis",
      Valor: formatCurrency(p.projecao_dias_uteis),
    },
    {
      Indicador: "Atingimento",
      Valor:
        p.percentual_atingido === null
          ? "—"
          : formatPercent(p.percentual_atingido),
    },
    {
      Indicador: "Gap (úteis)",
      Valor:
        p.gap_projetado_uteis === null
          ? "—"
          : formatCurrency(p.gap_projetado_uteis),
    },
    {
      Indicador: "Necessário / dia útil",
      Valor:
        p.necessario_por_dia_util === null
          ? "—"
          : formatCurrency(p.necessario_por_dia_util),
    },
    { Indicador: "Ritmo esperado", Valor: formatPercent(p.ritmo_esperado) },
    {
      Indicador: "Ritmo atual",
      Valor: p.ritmo_atual === null ? "—" : formatPercent(p.ritmo_atual),
    },
    { Indicador: "Tendência", Valor: TENDENCIA_LABEL[data.tendencia] },
    {
      Indicador: "Tendência insuficiente",
      Valor: data.tendencia_insuficiente ? "sim" : "não",
    },
    { Indicador: "Confiança", Valor: CONFIANCA_LABEL[data.confianca] },
    {
      Indicador: "Probabilidade",
      Valor: PROBABILIDADE_LABEL[data.probabilidade],
    },
    { Indicador: "Status", Valor: META_STATUS_LABEL[p.status] },
    {
      Indicador: "Ticket médio",
      Valor: formatCurrency(data.ticket.ticket_medio_atual),
    },
    {
      Indicador: "Qtd. vendas",
      Valor: formatNumber(data.ticket.quantidade_vendas),
    },
  ];
}

function buildCentroRows(data: CommercialPanelData): ExportRow[] {
  return data.centros.map((row) => ({
    Centro: row.centro_nome,
    Meta: row.valor_meta === null ? "—" : formatCurrency(row.valor_meta),
    Realizado: formatCurrency(row.faturamento_realizado),
    Projeção: formatCurrency(row.projecao_dias_uteis),
    Atingimento:
      row.percentual_atingido === null
        ? "—"
        : formatPercent(row.percentual_atingido),
    Gap:
      row.gap_projetado === null ? "—" : formatCurrency(row.gap_projetado),
    "Nec. dia útil":
      row.necessario_por_dia_util === null
        ? "—"
        : formatCurrency(row.necessario_por_dia_util),
    "Ticket médio": formatCurrency(row.ticket_medio),
    Tendência: TENDENCIA_LABEL[row.tendencia],
    Status: META_STATUS_LABEL[row.status],
  }));
}

function buildDailyRows(data: CommercialPanelData): ExportRow[] {
  return data.daily.map((d) => ({
    Data: d.data,
    "Dia útil": d.is_util ? "sim" : "não",
    Fimsemana: d.is_weekend ? "sim" : "não",
    Futuro: d.is_future ? "sim" : "não",
    "Meta diária": formatCurrency(d.meta_diaria),
    Realizado: formatCurrency(d.realizado),
    Diferença: d.diferenca === null ? "—" : formatCurrency(d.diferenca),
    Projetado: formatCurrency(d.projetado),
    "Dif %":
      d.diferenca_pct === null ? "—" : formatPercent(d.diferenca_pct),
    "Acum. realizado": formatCurrency(d.acumulado_realizado),
    "Acum. meta": formatCurrency(d.acumulado_meta),
    "Acum. projetado": formatCurrency(d.acumulado_projetado),
    "Dif. acumulada":
      d.diferenca_acumulada === null
        ? "—"
        : formatCurrency(d.diferenca_acumulada),
    Heatmap: HEATMAP_LABEL[d.heatmap_band],
  }));
}

function buildRankingSheet(
  tipo: string,
  items: CommercialPanelData["rankings"]["clientes"],
): ExportRow[] {
  return items.map((item, index) => ({
    Tipo: tipo,
    Posição: index + 1,
    Id: item.id,
    Nome: item.label,
    Valor: formatCurrency(item.valor),
    Participação:
      item.participacao_pct === null
        ? "—"
        : formatPercent(item.participacao_pct),
  }));
}

function buildRankingRows(data: CommercialPanelData): ExportRow[] {
  return [
    ...buildRankingSheet("clientes", data.rankings.clientes),
    ...buildRankingSheet("produtos", data.rankings.produtos),
    ...buildRankingSheet("servicos", data.rankings.servicos),
    ...buildRankingSheet("centros", data.rankings.centros),
  ];
}

function buildInsightRows(data: CommercialPanelData): ExportRow[] {
  return data.insights.map((item) => ({
    Código: item.codigo,
    Título: item.titulo,
    Descrição: item.descricao,
    Impacto: item.impacto,
    Recomendação: item.recomendacao,
    Severidade: item.severidade,
  }));
}

function rowsToExcelXml(sheets: Array<{ name: string; rows: ExportRow[] }>) {
  const sheetXml = sheets
    .map((sheet) => {
      if (sheet.rows.length === 0) {
        return `<Worksheet ss:Name="${sheet.name}"><Table><Row><Cell><Data ss:Type="String">Sem dados</Data></Cell></Row></Table></Worksheet>`;
      }
      const headers = Object.keys(sheet.rows[0]!);
      const headerRow = `<Row>${headers
        .map((h) => `<Cell><Data ss:Type="String">${h}</Data></Cell>`)
        .join("")}</Row>`;
      const body = sheet.rows
        .map(
          (row) =>
            `<Row>${headers
              .map((h) => {
                const v = row[h];
                const type = typeof v === "number" ? "Number" : "String";
                return `<Cell><Data ss:Type="${type}">${String(v ?? "")
                  .replace(/&/g, "&amp;")
                  .replace(/</g, "&lt;")}</Data></Cell>`;
              })
              .join("")}</Row>`,
        )
        .join("");
      return `<Worksheet ss:Name="${sheet.name}"><Table>${headerRow}${body}</Table></Worksheet>`;
    })
    .join("");

  return `<?xml version="1.0"?><?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
${sheetXml}
</Workbook>`;
}

export function exportCommercialCsv(
  data: CommercialPanelData,
  tenantName: string,
) {
  const rows = [
    ...buildResumoRows(data),
    {},
    ...buildCentroRows(data),
    {},
    ...buildDailyRows(data),
    {},
    ...buildRankingRows(data),
    {},
    ...buildInsightRows(data),
  ];
  downloadBlob(
    rowsToCsv(rows as ExportRow[]),
    filename(tenantName, "csv"),
    "text/csv;charset=utf-8",
  );
}

export function exportCommercialExcel(
  data: CommercialPanelData,
  tenantName: string,
) {
  const sheets: Array<{ name: string; rows: ExportRow[] }> = [
    { name: "Resumo", rows: buildResumoRows(data) },
    { name: "Centros", rows: buildCentroRows(data) },
    { name: "Diario", rows: buildDailyRows(data) },
    { name: "Rankings", rows: buildRankingRows(data) },
    { name: "Insights", rows: buildInsightRows(data) },
  ];
  // Skip canais when empty (no mock sheet).
  if (data.canais.length > 0) {
    sheets.push({
      name: "Canais",
      rows: data.canais.map((c) => ({
        Canal: c.canal,
        Realizado: formatCurrency(c.realizado),
        Participação: formatPercent(c.participacao_pct),
      })),
    });
  }
  const xml = rowsToExcelXml(sheets);
  downloadBlob(
    xml,
    filename(tenantName, "xls"),
    "application/vnd.ms-excel",
  );
}

export function exportCommercialPdf(
  data: CommercialPanelData,
  tenantName: string,
) {
  const p = data.projecao;
  const html = `<!DOCTYPE html><html><head><title>Painel Comercial</title>
  <style>body{font-family:system-ui,sans-serif;padding:24px;color:#111}
  h1{font-size:18px} table{border-collapse:collapse;width:100%;margin:12px 0;font-size:12px}
  th,td{border:1px solid #ddd;padding:6px;text-align:left} th{background:#f5f5f5}</style></head>
  <body>
  <h1>Painel Comercial — ${tenantName}</h1>
  <p>Competência ${data.competencia.slice(0, 7)}</p>
  <table><tr><th>Indicador</th><th>Valor</th></tr>
  ${buildResumoRows(data)
    .map((r) => `<tr><td>${r.Indicador}</td><td>${r.Valor}</td></tr>`)
    .join("")}
  </table>
  <h2>Insights</h2>
  <ul>${data.insights.map((i) => `<li><strong>${i.titulo}</strong> — ${i.descricao}</li>`).join("")}</ul>
  <p>Projeção úteis: ${formatCurrency(p.projecao_dias_uteis)} · Status: ${META_STATUS_LABEL[p.status]}</p>
  <p style="font-size:11px;color:#666">${data.meta_diaria_regra}</p>
  <script>window.onload=()=>window.print()</script>
  </body></html>`;
  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(html);
  w.document.close();
}
