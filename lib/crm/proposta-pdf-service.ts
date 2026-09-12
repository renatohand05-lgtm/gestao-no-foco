import "server-only";

import { renderPdfBuffer } from "@/lib/ordens/inspecao-pdf-service";

export type PropostaPdfData = {
  empresa: { nome: string };
  proposta: {
    titulo: string;
    numero: string;
    dataEmissao: string;
    validadeDias: number;
    condicoesPagamento?: string | null;
    observacoes?: string | null;
  };
  cliente: {
    nome: string;
    documento?: string | null;
  };
  itens: Array<{
    descricao: string;
    quantidade: number;
    valorUnitario: number;
  }>;
  valorTotal: number;
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

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("pt-BR");
}

export function buildPropostaHtml(data: PropostaPdfData): string {
  const validadeAte = new Date(
    Date.parse(data.proposta.dataEmissao) +
      data.proposta.validadeDias * 24 * 60 * 60 * 1000,
  );

  const itensRows = data.itens
    .map(
      (item) => `
      <tr>
        <td>${escapeHtml(item.descricao)}</td>
        <td style="text-align:right;">${item.quantidade}</td>
        <td style="text-align:right;">${formatCurrency(item.valorUnitario)}</td>
        <td style="text-align:right;">${formatCurrency(item.quantidade * item.valorUnitario)}</td>
      </tr>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(data.proposta.titulo)}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: "Segoe UI", Arial, sans-serif;
      color: #0f172a;
      margin: 0;
      padding: 36px;
      font-size: 12px;
      line-height: 1.6;
    }
    header {
      border-bottom: 3px solid #1e40af;
      padding-bottom: 18px;
      margin-bottom: 28px;
    }
    h1 { margin: 0 0 4px; font-size: 24px; color: #1e3a8a; }
    .subtitle { color: #64748b; font-size: 12px; }
    h2 {
      font-size: 13px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #1e40af;
      margin: 24px 0 10px;
    }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 8px; }
    .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 14px; }
    table { width: 100%; border-collapse: collapse; margin-top: 6px; }
    th, td { border: 1px solid #e2e8f0; padding: 9px 11px; }
    th { background: #eff6ff; text-align: left; font-size: 11px; text-transform: uppercase; color: #334155; }
    .total-row td { font-weight: 700; font-size: 14px; background: #f8fafc; }
    .validade { margin-top: 18px; padding: 12px; background: #fef9c3; border: 1px solid #fde047; border-radius: 8px; font-size: 11px; }
    footer { margin-top: 32px; padding-top: 12px; border-top: 1px solid #e2e8f0; color: #94a3b8; font-size: 10px; text-align: center; }
  </style>
</head>
<body>
  <header>
    <h1>${escapeHtml(data.empresa.nome)}</h1>
    <p class="subtitle">Proposta comercial #${escapeHtml(data.proposta.numero)} — ${escapeHtml(data.proposta.titulo)}</p>
  </header>

  <div class="grid">
    <div class="card">
      <strong>Cliente</strong>
      <div>${escapeHtml(data.cliente.nome)}</div>
      ${data.cliente.documento ? `<div class="subtitle">${escapeHtml(data.cliente.documento)}</div>` : ""}
    </div>
    <div class="card">
      <strong>Emitida em</strong>
      <div>${formatDate(data.proposta.dataEmissao)}</div>
      ${data.proposta.condicoesPagamento ? `<div class="subtitle">Pagamento: ${escapeHtml(data.proposta.condicoesPagamento)}</div>` : ""}
    </div>
  </div>

  <h2>Itens propostos</h2>
  <table>
    <thead>
      <tr>
        <th>Descrição</th>
        <th style="text-align:right;">Qtd</th>
        <th style="text-align:right;">Unit.</th>
        <th style="text-align:right;">Total</th>
      </tr>
    </thead>
    <tbody>
      ${itensRows || `<tr><td colspan="4">Sem itens</td></tr>`}
      <tr class="total-row">
        <td colspan="3">Valor total</td>
        <td style="text-align:right;">${formatCurrency(data.valorTotal)}</td>
      </tr>
    </tbody>
  </table>

  ${
    data.proposta.observacoes
      ? `<h2>Observações</h2><p>${escapeHtml(data.proposta.observacoes)}</p>`
      : ""
  }

  <div class="validade">
    <strong>Proposta válida até ${formatDate(validadeAte.toISOString())}</strong> (${data.proposta.validadeDias} dias a partir da emissão).
  </div>

  <footer>Documento gerado automaticamente pelo Gestão no Foco.</footer>
</body>
</html>`;
}

export { renderPdfBuffer };
