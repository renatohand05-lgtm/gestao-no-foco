import "server-only";

import { renderPdfBuffer } from "@/lib/ordens/inspecao-pdf-service";

export type VendaReciboPdfData = {
  empresa: {
    nome: string;
  };
  venda: {
    numero: number | string;
    dataVenda: string;
    formaPagamento?: string | null;
    canalVenda?: string | null;
    observacoes?: string | null;
  };
  cliente: {
    nome: string;
    documento?: string | null;
    telefone?: string | null;
  } | null;
  itens: Array<{
    descricao: string;
    quantidade: number;
    precoUnitario: number;
    desconto: number;
    total: number;
  }>;
  totais: {
    subtotal: number;
    descontoTotal: number;
    total: number;
  };
  geradoEm?: string;
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

export function buildVendaReciboHtml(data: VendaReciboPdfData): string {
  const geradoEm =
    data.geradoEm ?? new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });

  const itensRows = data.itens
    .map(
      (item) => `
      <tr>
        <td>${escapeHtml(item.descricao)}</td>
        <td style="text-align:right;">${item.quantidade}</td>
        <td style="text-align:right;">${formatCurrency(item.precoUnitario)}</td>
        <td style="text-align:right;">${item.desconto > 0 ? formatCurrency(item.desconto) : "—"}</td>
        <td style="text-align:right;">${formatCurrency(item.total)}</td>
      </tr>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>Comprovante de Venda #${escapeHtml(String(data.venda.numero))}</title>
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
    .totais td { border: none; padding: 4px 10px; }
    .aviso {
      margin-top: 16px;
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
      <h1>${escapeHtml(data.empresa.nome)}</h1>
      <div class="meta">Comprovante de venda</div>
    </div>
    <div style="text-align:right;">
      <div style="font-size:18px;font-weight:700;">Venda #${escapeHtml(String(data.venda.numero))}</div>
      <div class="meta">Gerado em ${escapeHtml(geradoEm)}</div>
    </div>
  </header>

  <section class="grid">
    <div class="card">
      <strong>Cliente</strong>
      <div>${escapeHtml(data.cliente?.nome ?? "Consumidor não identificado")}</div>
      ${data.cliente?.documento ? `<div class="meta">${escapeHtml(data.cliente.documento)}</div>` : ""}
      ${data.cliente?.telefone ? `<div class="meta">${escapeHtml(data.cliente.telefone)}</div>` : ""}
    </div>
    <div class="card">
      <strong>Dados da venda</strong>
      <div class="meta">Data: ${formatDate(data.venda.dataVenda)}</div>
      ${data.venda.formaPagamento ? `<div class="meta">Pagamento: ${escapeHtml(data.venda.formaPagamento)}</div>` : ""}
      ${data.venda.canalVenda ? `<div class="meta">Canal: ${escapeHtml(data.venda.canalVenda)}</div>` : ""}
    </div>
  </section>

  <section>
    <h2>Itens</h2>
    <table>
      <thead>
        <tr>
          <th>Descrição</th>
          <th style="text-align:right;">Qtd</th>
          <th style="text-align:right;">Unit.</th>
          <th style="text-align:right;">Desc.</th>
          <th style="text-align:right;">Total</th>
        </tr>
      </thead>
      <tbody>${itensRows || `<tr><td colspan="5">Sem itens</td></tr>`}</tbody>
    </table>
    <table class="totais" style="margin-top:12px;max-width:280px;margin-left:auto;">
      <tr><td>Subtotal</td><td style="text-align:right;">${formatCurrency(data.totais.subtotal)}</td></tr>
      ${
        data.totais.descontoTotal > 0
          ? `<tr><td>Desconto</td><td style="text-align:right;">−${formatCurrency(data.totais.descontoTotal)}</td></tr>`
          : ""
      }
      <tr><td style="font-weight:700;font-size:14px;">Total</td><td style="text-align:right;font-weight:700;font-size:14px;">${formatCurrency(data.totais.total)}</td></tr>
    </table>
  </section>

  ${
    data.venda.observacoes
      ? `<section><h2>Observações</h2><p>${escapeHtml(data.venda.observacoes)}</p></section>`
      : ""
  }

  <div class="aviso">
    <strong>Este comprovante não substitui a Nota Fiscal.</strong> É um resumo interno da venda, gerado para conferência do cliente.
  </div>

  <footer>
    Documento gerado automaticamente pelo Gestão no Foco.
  </footer>
</body>
</html>`;
}

export { renderPdfBuffer };
