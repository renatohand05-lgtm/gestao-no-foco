import "server-only";

import { chromium } from "playwright";

export type InspecaoPdfData = {
  oficina: {
    nome: string;
    logoUrl?: string | null;
    telefone?: string | null;
    endereco?: string | null;
  };
  os: {
    numero: number | string;
    dataAbertura?: string | null;
    quilometragem?: number | null;
    reclamacao?: string | null;
    status?: string | null;
  };
  cliente: {
    nome: string;
  };
  veiculo: {
    placa?: string | null;
    marca?: string | null;
    modelo?: string | null;
    ano?: number | null;
    cor?: string | null;
  };
  checklist?: Array<{
    categoria?: string | null;
    itemLabel: string;
    classificacao: string;
    observacao?: string | null;
  }>;
  diagnosticos?: Array<{
    sintoma?: string | null;
    diagnostico?: string | null;
    causa?: string | null;
    recomendacao?: string | null;
    gravidade?: string | null;
    observacoesCliente?: string | null;
  }>;
  orcamento?: {
    versao?: number;
    valorTotal?: number;
    subtotal?: number;
    descontoTotal?: number;
    acrescimoTotal?: number;
    prazoEstimadoDias?: number | null;
    validadeAte?: string | null;
    avisoTexto?: string;
    itens?: Array<{
      descricao: string;
      quantidade: number;
      valorUnitario: number;
      valorTotal: number;
      recomendacao?: string;
    }>;
  } | null;
  geradoEm?: string;
};

const CLASSIFICACAO_LABELS: Record<string, string> = {
  bom: "Bom",
  atencao: "Atenção",
  critico: "Crítico",
  nao_verificado: "Não verificado",
  nao_aplicavel: "N/A",
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatCurrency(value: number): string {
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(value?: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("pt-BR");
}

function classificacaoBadge(classificacao: string): string {
  const label = CLASSIFICACAO_LABELS[classificacao] ?? classificacao;
  const tone =
    classificacao === "bom"
      ? "#15803d"
      : classificacao === "atencao"
        ? "#b45309"
        : classificacao === "critico"
          ? "#b91c1c"
          : "#64748b";
  return `<span style="color:${tone};font-weight:600;">${escapeHtml(label)}</span>`;
}

export function buildInspecaoHtml(data: InspecaoPdfData): string {
  const geradoEm =
    data.geradoEm ?? new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });

  const veiculoParts = [
    data.veiculo.marca,
    data.veiculo.modelo,
    data.veiculo.ano ? String(data.veiculo.ano) : null,
    data.veiculo.cor,
  ].filter(Boolean);

  const checklistRows = (data.checklist ?? [])
    .map(
      (item) => `
      <tr>
        <td>${escapeHtml(item.categoria ?? "—")}</td>
        <td>${escapeHtml(item.itemLabel)}</td>
        <td>${classificacaoBadge(item.classificacao)}</td>
        <td>${escapeHtml(item.observacao ?? "—")}</td>
      </tr>`,
    )
    .join("");

  const diagnosticoBlocks = (data.diagnosticos ?? [])
    .map(
      (d) => `
      <div class="card">
        ${d.sintoma ? `<p><strong>Sintoma:</strong> ${escapeHtml(d.sintoma)}</p>` : ""}
        ${d.diagnostico ? `<p><strong>Diagnóstico:</strong> ${escapeHtml(d.diagnostico)}</p>` : ""}
        ${d.causa ? `<p><strong>Causa provável:</strong> ${escapeHtml(d.causa)}</p>` : ""}
        ${d.recomendacao ? `<p><strong>Recomendação:</strong> ${escapeHtml(d.recomendacao)}</p>` : ""}
        ${d.gravidade ? `<p><strong>Gravidade:</strong> ${escapeHtml(d.gravidade)}</p>` : ""}
        ${d.observacoesCliente ? `<p><strong>Para o cliente:</strong> ${escapeHtml(d.observacoesCliente)}</p>` : ""}
      </div>`,
    )
    .join("");

  const orcamentoItens = (data.orcamento?.itens ?? [])
    .map(
      (item) => `
      <tr>
        <td>${escapeHtml(item.descricao)}</td>
        <td style="text-align:right;">${item.quantidade}</td>
        <td style="text-align:right;">${formatCurrency(item.valorUnitario)}</td>
        <td style="text-align:right;">${formatCurrency(item.valorTotal)}</td>
      </tr>`,
    )
    .join("");

  const orcamentoSection = data.orcamento
    ? `
    <section>
      <h2>Orçamento${data.orcamento.versao ? ` — v${data.orcamento.versao}` : ""}</h2>
      <table>
        <thead>
          <tr>
            <th>Descrição</th>
            <th style="text-align:right;">Qtd</th>
            <th style="text-align:right;">Unit.</th>
            <th style="text-align:right;">Total</th>
          </tr>
        </thead>
        <tbody>${orcamentoItens || `<tr><td colspan="4">Sem itens</td></tr>`}</tbody>
        <tfoot>
          <tr>
            <td colspan="3" style="text-align:right;font-weight:600;">Total</td>
            <td style="text-align:right;font-weight:700;">${formatCurrency(data.orcamento.valorTotal ?? 0)}</td>
          </tr>
        </tfoot>
      </table>
      ${
        data.orcamento.prazoEstimadoDias
          ? `<p><strong>Prazo estimado:</strong> ${data.orcamento.prazoEstimadoDias} dia(s)</p>`
          : ""
      }
      ${
        data.orcamento.validadeAte
          ? `<p><strong>Válido até:</strong> ${formatDate(data.orcamento.validadeAte)}</p>`
          : ""
      }
      ${
        data.orcamento.avisoTexto
          ? `<div class="aviso"><strong>Aviso importante</strong><p>${escapeHtml(data.orcamento.avisoTexto)}</p></div>`
          : ""
      }
    </section>`
    : "";

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>Inspeção OS #${escapeHtml(String(data.os.numero))}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: "Segoe UI", Arial, sans-serif;
      color: #0f172a;
      margin: 0;
      padding: 32px;
      font-size: 12px;
      line-height: 1.5;
    }
    header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #1e40af;
      padding-bottom: 16px;
      margin-bottom: 24px;
    }
    h1 { margin: 0 0 4px; font-size: 22px; color: #1e3a8a; }
    h2 {
      font-size: 14px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: #1e40af;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 6px;
      margin: 24px 0 12px;
    }
    .meta { color: #64748b; font-size: 11px; }
    .grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }
    .card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 12px 14px;
      margin-bottom: 10px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 8px;
    }
    th, td {
      border: 1px solid #e2e8f0;
      padding: 8px 10px;
      vertical-align: top;
    }
    th {
      background: #eff6ff;
      text-align: left;
      font-size: 11px;
      text-transform: uppercase;
      color: #334155;
    }
    .aviso {
      margin-top: 12px;
      padding: 12px;
      background: #fffbeb;
      border: 1px solid #fcd34d;
      border-radius: 8px;
      font-size: 11px;
    }
    footer {
      margin-top: 32px;
      padding-top: 12px;
      border-top: 1px solid #e2e8f0;
      color: #94a3b8;
      font-size: 10px;
      text-align: center;
    }
  </style>
</head>
<body>
  <header>
    <div>
      <h1>${escapeHtml(data.oficina.nome)}</h1>
      <div class="meta">
        ${data.oficina.telefone ? escapeHtml(data.oficina.telefone) + " · " : ""}
        ${data.oficina.endereco ? escapeHtml(data.oficina.endereco) : ""}
      </div>
    </div>
    <div style="text-align:right;">
      <div style="font-size:18px;font-weight:700;">OS #${escapeHtml(String(data.os.numero))}</div>
      <div class="meta">Gerado em ${escapeHtml(geradoEm)}</div>
    </div>
  </header>

  <section class="grid">
    <div class="card">
      <strong>Cliente</strong>
      <div>${escapeHtml(data.cliente.nome)}</div>
    </div>
    <div class="card">
      <strong>Veículo</strong>
      <div>${escapeHtml(data.veiculo.placa ?? "—")}</div>
      <div class="meta">${escapeHtml(veiculoParts.join(" · ") || "—")}</div>
      ${
        data.os.quilometragem != null
          ? `<div class="meta">KM entrada: ${data.os.quilometragem}</div>`
          : ""
      }
    </div>
  </section>

  ${
    data.os.reclamacao
      ? `<section><h2>Reclamação do cliente</h2><p>${escapeHtml(data.os.reclamacao)}</p></section>`
      : ""
  }

  ${
    checklistRows
      ? `<section>
      <h2>Checklist de inspeção</h2>
      <table>
        <thead>
          <tr>
            <th>Categoria</th>
            <th>Item</th>
            <th>Classificação</th>
            <th>Observação</th>
          </tr>
        </thead>
        <tbody>${checklistRows}</tbody>
      </table>
    </section>`
      : ""
  }

  ${
    diagnosticoBlocks
      ? `<section><h2>Diagnóstico técnico</h2>${diagnosticoBlocks}</section>`
      : ""
  }

  ${orcamentoSection}

  <footer>
    Documento gerado automaticamente — inspeção digital do veículo.
    Este relatório não constitui fatura nem comprovante de pagamento.
  </footer>
</body>
</html>`;
}

export async function renderPdfBuffer(html: string): Promise<Buffer> {
  let browser: Awaited<ReturnType<typeof chromium.launch>> | null = null;

  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle" });
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "16mm", bottom: "16mm", left: "14mm", right: "14mm" },
    });
    return Buffer.from(pdf);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (
      message.includes("Executable doesn't exist") ||
      message.includes("browserType.launch")
    ) {
      throw new Error(
        "Geração de PDF indisponível: Chromium do Playwright não instalado. Execute `npm run install:chromium` no servidor.",
      );
    }
    throw new Error(
      `Não foi possível gerar o PDF da inspeção. ${message}`,
    );
  } finally {
    await browser?.close();
  }
}
