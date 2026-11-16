// Marcação estática do Painel Executivo (porte do HTML da Bem Vindo Car). Gerado — a marca vem do tenant.
const PRE = "<svg width=\"0\" height=\"0\" style=\"position:absolute\"><defs><g id=\"gearShape\"><path fill=\"none\" stroke=\"currentColor\" stroke-width=\"5\" d=\"M45 14h10l2 9a28 28 0 0 1 8 3.3l8-5 7 7-5 8a28 28 0 0 1 3.3 8l9 2v10l-9 2a28 28 0 0 1-3.3 8l5 8-7 7-8-5a28 28 0 0 1-8 3.3l-2 9H45l-2-9a28 28 0 0 1-8-3.3l-8 5-7-7 5-8a28 28 0 0 1-3.3-8l-9-2V45l9-2a28 28 0 0 1 3.3-8l-5-8 7-7 8 5a28 28 0 0 1 8-3.3z\"/><circle cx=\"50\" cy=\"50\" r=\"15\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"5\"/></g></defs></svg>\n<div class=\"aurora\" aria-hidden=\"true\">\n  <div class=\"layer\" id=\"par\"><div class=\"mesh\"></div><div class=\"orb o1\"></div><div class=\"orb o2\"></div><div class=\"orb o3\"></div><div class=\"orb o4\"></div><div class=\"orb o5\"></div></div>\n  <svg class=\"gear g1\" viewBox=\"0 0 100 100\" aria-hidden=\"true\"><use href=\"#gearShape\"/></svg><svg class=\"gear g2\" viewBox=\"0 0 100 100\" aria-hidden=\"true\"><use href=\"#gearShape\"/></svg>\n  <div class=\"road\" id=\"road\"></div>\n  <canvas id=\"stars\"></canvas><div class=\"grain\"></div><div class=\"veil\"></div>\n</div>\n<div class=\"spot\" id=\"spot\"></div>\n\n<div class=\"app\">\n  ";
const POST = "\n\n  <main>\n    <div class=\"top\">\n      <div style=\"display:flex;gap:14px;align-items:flex-end\">\n        <button class=\"menu-btn\" id=\"menuBtn\" aria-label=\"Menu\">☰</button>\n        <div><div class=\"eyebrow\"><span class=\"live\"></span><span id=\"eb\">Painel executivo</span></div><h1 id=\"title\">Visão Geral</h1><p class=\"lead\" id=\"lead\"></p></div>\n      </div>\n      <div class=\"controls\"><div class=\"seg\" id=\"mseg\"></div><span class=\"chip-date\" id=\"upd\"></span></div>\n    </div>\n    <div id=\"views\"></div>\n    <div class=\"footer\">{{NOME}} · Gestão no Foco · dados lançados no sistema</div>\n  </main>\n</div>\n\n";

export type PainelShellInput = {
  nome: string;
  logoUrl: string | null;
  voltarHref: string;
};

const esc = (s: string) =>
  s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] as string);

export function painelShellHtml({ nome, logoUrl, voltarHref }: PainelShellInput): string {
  const n = esc(nome);
  const ini = esc(
    nome
      .split(/\s+/)
      .map((w) => w[0] ?? "")
      .join("")
      .slice(0, 2)
      .toUpperCase() || "GF",
  );
  const brand = logoUrl
    ? `<div class="brand" style="padding:4px 4px 14px"><img src="${esc(logoUrl)}" alt="${n}" style="width:100%;max-width:210px;display:block;margin:0 auto;filter:drop-shadow(0 6px 18px rgba(248,194,8,.18))"></div>`
    : `<div class="brand"><div class="brand-ic"><svg viewBox="0 0 100 100" width="22" height="22"><use href="#gearShape"/></svg></div><div><b>${n}</b><small>Painel executivo</small></div></div>`;
  const aside = `<aside class="side" id="side">${brand}<a class="pe-back" href="${esc(voltarHref)}">← Voltar ao portal</a><div id="navs"></div><div class="side-foot"><div class="av">${ini}</div><div><b>${n}</b><small>Gestão no Foco</small></div></div></aside>`;
  return PRE + aside + POST.replace(/\{\{NOME\}\}/g, n);
}
