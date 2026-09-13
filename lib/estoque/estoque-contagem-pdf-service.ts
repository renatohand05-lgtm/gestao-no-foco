import "server-only";

import type { ContagemPeriodicidade, ContagemStatus } from "@/types/estoque-contagem";
import { CONTAGEM_PERIODICIDADE_LABELS } from "@/types/estoque-contagem";

export type ContagemPdfData = {
  empresaNome: string;
  periodicidade: ContagemPeriodicidade;
  dataInicio: string;
  status: ContagemStatus;
  itens: Array<{
    nome: string;
    sku: string | null;
    unidade: string;
    /** Só aparece se `mostrarSistema` for true — em geral a folha é cega, pra não induzir a contagem. */
    quantidadeSistema: number;
  }>;
  /** Mostrar a quantidade do sistema na folha (padrão: não — contagem cega evita viés). */
  mostrarSistema?: boolean;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatDate(value: string): string {
  const [y, m, d] = value.split("-").map(Number);
  if (!y || !m || !d) return value;
  return `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${y}`;
}

export function buildContagemHtml(data: ContagemPdfData): string {
  const geradoEm = new Date().toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
  });
  const mostrarSistema = data.mostrarSistema ?? false;

  const itensOrdenados = [...data.itens].sort((a, b) =>
    a.nome.localeCompare(b.nome, "pt-BR"),
  );

  const rows = itensOrdenados
    .map(
      (item, index) => `
      <tr>
        <td class="num">${index + 1}</td>
        <td>${escapeHtml(item.nome)}</td>
        <td>${escapeHtml(item.sku ?? "—")}</td>
        <td class="center">${escapeHtml(item.unidade)}</td>
        ${
          mostrarSistema
            ? `<td class="center">${item.quantidadeSistema}</td>`
            : ""
        }
        <td class="contagem-cell"></td>
        <td class="contagem-cell"></td>
      </tr>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>Folha de contagem de estoque</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: "Segoe UI", Arial, sans-serif;
      color: #0f172a;
      margin: 0;
      padding: 32px;
      font-size: 11px;
      line-height: 1.4;
    }
    header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #1e40af;
      padding-bottom: 16px;
      margin-bottom: 20px;
    }
    h1 { margin: 0 0 4px; font-size: 20px; color: #1e3a8a; }
    .meta { color: #64748b; font-size: 11px; }
    .badge {
      display: inline-block;
      padding: 3px 10px;
      border-radius: 999px;
      background: #eff6ff;
      color: #1e40af;
      font-size: 10px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 12px;
    }
    th, td {
      border: 1px solid #e2e8f0;
      padding: 6px 8px;
      vertical-align: middle;
    }
    th {
      background: #eff6ff;
      text-align: left;
      font-size: 10px;
      text-transform: uppercase;
      color: #334155;
    }
    td.num { color: #94a3b8; width: 24px; text-align: center; }
    td.center, th.center { text-align: center; }
    td.contagem-cell { min-width: 70px; height: 22px; }
    .assinaturas {
      margin-top: 40px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 40px;
    }
    .assinatura-linha {
      border-top: 1px solid #0f172a;
      padding-top: 6px;
      font-size: 10px;
      color: #64748b;
      text-align: center;
    }
    footer {
      margin-top: 24px;
      padding-top: 10px;
      border-top: 1px solid #e2e8f0;
      color: #94a3b8;
      font-size: 9px;
      text-align: center;
    }
  </style>
</head>
<body>
  <header>
    <div>
      <h1>${escapeHtml(data.empresaNome)}</h1>
      <div class="meta">Folha de contagem de estoque · Gerado em ${escapeHtml(geradoEm)}</div>
    </div>
    <div style="text-align:right;">
      <span class="badge">${CONTAGEM_PERIODICIDADE_LABELS[data.periodicidade]}</span>
      <div class="meta" style="margin-top:6px;">Início: ${formatDate(data.dataInicio)}</div>
    </div>
  </header>

  <table>
    <thead>
      <tr>
        <th class="center">#</th>
        <th>Produto</th>
        <th>SKU</th>
        <th class="center">Unid.</th>
        ${mostrarSistema ? `<th class="center">Sistema</th>` : ""}
        <th class="center">1ª contagem</th>
        <th class="center">2ª contagem</th>
      </tr>
    </thead>
    <tbody>
      ${rows || `<tr><td colspan="7">Nenhum produto com controle de estoque.</td></tr>`}
    </tbody>
  </table>

  <div class="assinaturas">
    <div class="assinatura-linha">Quem contou</div>
    <div class="assinatura-linha">Quem conferiu</div>
  </div>

  <footer>
    Depois de contar, digite as quantidades no portal pra fechar a contagem e ajustar o estoque.
  </footer>
</body>
</html>`;
}
