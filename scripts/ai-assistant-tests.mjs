#!/usr/bin/env node
/**
 * Testes da inteligência do assistente: formato das respostas, leitor de
 * Markdown, montagem do pedido, sinais calculados e contexto de dados.
 * Node com --experimental-strip-types.
 */
import {
  ERROR_MARKER,
  SUGGESTION_MARKER,
  splitErro,
  splitSugestoes,
  sugestoesIniciais,
  textoSemSugestoes,
} from "../lib/ai-assistant/ai-assistant-format.ts";
import {
  buildScreenMap,
  buildSystemPrompt,
  formatarContextoDados,
  segmentPlaybook,
} from "../lib/ai-assistant/ai-assistant-prompt.ts";
import {
  buildAnthropicBody,
  MAX_HISTORY_MESSAGES,
  prepararHistorico,
  SseParser,
  textoDoEvento,
} from "../lib/ai-assistant/ai-assistant-request.ts";
import { derivarSinais } from "../lib/ai-assistant/ai-assistant-signals.ts";
import { isSafeHref, parseInline, parseMarkdownLite } from "../lib/ai-assistant/markdown-lite.ts";

let pass = 0;
let fail = 0;

function assert(cond, msg) {
  if (cond) {
    pass++;
  } else {
    fail++;
    console.error("FALHOU:", msg);
  }
}

// ───────── sugestões e erro no texto ─────────
{
  const r = splitSugestoes(
    `## Resumo\nTudo certo.\n\n${SUGGESTION_MARKER} Monte o plano | Quais clientes chamar? | Onde cortar gastos?`,
  );
  assert(r.corpo === "## Resumo\nTudo certo.", "corpo sem o marcador");
  assert(r.sugestoes.length === 3 && r.sugestoes[1] === "Quais clientes chamar?", "3 sugestões separadas por |");

  assert(splitSugestoes("Resposta [[sug").corpo === "Resposta", "marcador pela metade some durante o streaming");
  assert(splitSugestoes("Resposta [[").corpo === "Resposta", "início do marcador some");
  assert(splitSugestoes("Resposta [[sugestoes]]").sugestoes.length === 0, "marcador sem perguntas");
  assert(splitSugestoes("Faturou R$ 10 [fev]").corpo === "Faturou R$ 10 [fev]", "colchete comum fica no texto");
  assert(
    splitSugestoes(`x\n${SUGGESTION_MARKER} Pergunta 1 | Pergunta 2 | Pergunta 3 | Pergunta 4 | Pergunta 5`).sugestoes.length === 3,
    "no máximo 3 sugestões",
  );
  assert(textoSemSugestoes(`oi\n${SUGGESTION_MARKER} a b c d`) === "oi", "histórico sem marcador");

  const e = splitErro(`Texto parcial\n\n${ERROR_MARKER} A conexão caiu`);
  assert(e.texto === "Texto parcial" && e.erro === "A conexão caiu", "separa o aviso de erro do fim do fluxo");
  assert(splitErro("Tudo bem").erro === null, "sem erro");

  assert(sugestoesIniciais("oficina").some((s) => s.includes("OS")), "oficina tem pergunta sobre OS");
  assert(!sugestoesIniciais("clinica_estetica").some((s) => /\bOS\b/.test(s)), "outros segmentos sem OS");
}

// ───────── Markdown ─────────
{
  const inl = parseInline("Faturou **R$ 1.234 (30%)** e *subiu* com `ok` e [OS](/bvc/ordens)");
  assert(inl.some((n) => n.t === "bold"), "negrito");
  assert(inl.some((n) => n.t === "em"), "itálico");
  assert(inl.some((n) => n.t === "code"), "código");
  assert(inl.some((n) => n.t === "link" && n.href === "/bvc/ordens"), "link interno");

  assert(isSafeHref("/bvc/ordens"), "caminho interno é seguro");
  assert(isSafeHref("https://exemplo.com/a"), "https é seguro");
  assert(!isSafeHref("javascript:alert(1)"), "javascript: bloqueado");
  assert(!isSafeHref("//evil.com"), "link de protocolo relativo bloqueado");
  assert(!isSafeHref("http://exemplo.com"), "http puro bloqueado");
  const ruim = parseInline("[clique](javascript:alert(1))");
  assert(!ruim.some((n) => n.t === "link"), "link perigoso vira texto");

  const md = [
    "## Resumo",
    "Meta em risco.",
    "",
    "## Plano de ação",
    "| # | Ação | Prazo |",
    "|---|------|------:|",
    "| 1 | **Ligar** para Paulo | hoje |",
    "| 2 | Faturar OS 251 | amanhã |",
    "",
    "- item um",
    "  - filho a",
    "- [x] feito",
    "- [ ] pendente",
    "",
    "1. primeiro",
    "2. segundo",
    "",
    "> citação",
    "",
    "---",
    "```",
    "<script>alert(1)</script>",
    "```",
  ].join("\n");
  const blocks = parseMarkdownLite(md);
  const tipos = blocks.map((b) => b.t);
  assert(tipos[0] === "heading" && blocks[0].level === 2, "título nível 2");
  assert(tipos.includes("table"), "tabela reconhecida");
  const tabela = blocks.find((b) => b.t === "table");
  assert(tabela && tabela.head.length === 3 && tabela.rows.length === 2, "tabela com 3 colunas e 2 linhas");
  assert(tabela && tabela.align[2] === "right", "alinhamento à direita");
  const lista = blocks.find((b) => b.t === "list" && !b.ordered);
  assert(lista && lista.items.length === 3 && lista.items[0].children.length === 1, "lista com sublista");
  assert(lista && lista.items[1].checked === true && lista.items[2].checked === false, "lista de tarefas");
  const ordenada = blocks.find((b) => b.t === "list" && b.ordered);
  assert(ordenada && ordenada.items.length === 2, "lista numerada");
  assert(tipos.includes("quote") && tipos.includes("hr"), "citação e linha");
  const codigo = blocks.find((b) => b.t === "code");
  assert(codigo && codigo.v.includes("<script>"), "bloco de código fica como texto (nunca HTML)");

  // texto incompleto (streaming) não quebra
  const parcial = parseMarkdownLite("## Plano\n| a | b |\n|---|---|\n| 1 |");
  assert(parcial.some((b) => b.t === "table"), "tabela parcial no meio do streaming");
  assert(parseMarkdownLite("**negrito aberto").length === 1, "negrito aberto vira texto");
  assert(parseMarkdownLite("").length === 0, "texto vazio");
  assert(parseMarkdownLite("Linha 1\nLinha 2")[0].c.some((n) => n.t === "br"), "quebra de linha dentro do parágrafo");
}

// ───────── histórico e pedido à API ─────────
{
  const h = prepararHistorico([
    { role: "assistant", content: "oi, sou a IA" },
    { role: "user", content: "como estou?" },
    { role: "assistant", content: `Bem.\n${SUGGESTION_MARKER} a | b` },
    { role: "user", content: "e o caixa?" },
    { role: "user", content: "e as contas?" },
    { role: "assistant", content: "   " },
  ]);
  assert(h[0].role === "user", "histórico começa pelo usuário");
  assert(h.every((m, i) => i === 0 || m.role !== h[i - 1].role), "papéis alternam");
  assert(!h.some((m) => m.content.includes(SUGGESTION_MARKER)), "marcador não volta para a IA");
  assert(h[h.length - 1].content.includes("e o caixa?") && h[h.length - 1].content.includes("e as contas?"), "mensagens seguidas do usuário são unidas");

  const longo = Array.from({ length: 60 }, (_, i) => ({ role: i % 2 === 0 ? "user" : "assistant", content: `m${i}` }));
  assert(prepararHistorico(longo).length <= MAX_HISTORY_MESSAGES, "histórico limitado");

  const ctx = { tenantSlug: "bvc", segment: "oficina", dataContext: "# DADOS\nx" };
  const body = buildAnthropicBody({ model: "claude-sonnet-5-5", history: [{ role: "user", content: "oi" }], context: ctx, stream: true });
  assert(body.model === "claude-sonnet-5-5" && body.stream === true, "modelo e streaming");
  assert(body.max_tokens >= 2500, "espaço para plano de ação completo");
  assert(Array.isArray(body.system) && body.system.length === 2, "instruções e dados em blocos separados");
  assert(body.system[1].cache_control?.type === "ephemeral", "cache no bloco de dados");
  assert(body.system[1].text === "# DADOS\nx", "dados no segundo bloco");
  assert(!body.system[0].text.includes("NÃO renderiza Markdown"), "formato padrão usa Markdown");
  const bodyTexto = buildAnthropicBody({ model: "m", history: [{ role: "user", content: "oi" }], context: { ...ctx, formato: "texto" }, stream: false });
  assert(bodyTexto.system[0].text.includes("NÃO renderiza Markdown"), "app mobile recebe pedido de texto simples");
  assert(bodyTexto.stream === false, "sem streaming quando pedido");

  // Leitor de SSE: evento cortado no meio entre dois pedaços
  const p = new SseParser();
  const ev1 = p.push('event: content_block_delta\ndata: {"type":"content_block_delta","delta":{"type":"text_delta","text":"Ol');
  assert(ev1.length === 0, "evento incompleto fica no buffer");
  const ev2 = p.push('á"}}\n\nevent: ping\ndata: {"type":"ping"}\n\ndata: {"type":"message_delta","delta":{"stop_reason":"end_turn"}}\n\n');
  assert(ev2.length === 3, "três eventos completos");
  assert(textoDoEvento(ev2[0]) === "Olá", "texto do delta");
  assert(textoDoEvento(ev2[1]) === null, "ping não tem texto");
  const ev3 = p.push('data: {"type":"error","error":{"type":"overloaded_error","message":"Overloaded"}}\r\n\r\n');
  assert(ev3[0].type === "error" && ev3[0].error.message === "Overloaded", "evento de erro com CRLF");
  assert(new SseParser().push("data: não é json\n\n").length === 0, "evento quebrado é ignorado");
}

// ───────── prompt do sistema ─────────
{
  const sp = buildSystemPrompt({ tenantSlug: "bem-vindo-car", segment: "oficina" });
  assert(sp.includes("(/bem-vindo-car/financeiro/contas-pagar)"), "links reais da empresa no mapa de telas");
  assert(sp.includes("(/bem-vindo-car/ordens)"), "oficina tem tela de OS");
  assert(sp.includes(SUGGESTION_MARKER), "ensina o marcador de sugestões");
  assert(sp.includes("Plano de ação") && sp.includes("Comece por"), "formato de plano de ação");
  assert(sp.includes("oficina mecânica"), "segmento no prompt");
  assert(sp.includes("OS faturadas"), "base de faturamento da oficina");
  assert(sp.includes("ate_o_mesmo_dia"), "orienta a não comparar mês parcial com mês fechado");
  const outro = buildSystemPrompt({ tenantSlug: "x", segment: "clinica_estetica" });
  assert(!outro.includes("(/x/ordens)"), "clínica não recebe telas de OS");
  assert(outro.includes("vendas faturadas"), "base de faturamento fora da oficina");
  assert(segmentPlaybook("oficina").includes("aguardando aprovação"), "playbook da oficina");
  assert(buildScreenMap("a", null).includes("(/a/painel-executivo)"), "mapa comum");
}

// ───────── sinais (a partir do retrato real da Bem Vindo Car, 17/11/2026) ─────────
const BVC = {
  hoje: "2026-11-17",
  dia_do_mes: 17,
  dias_no_mes: 30,
  empresa: { nome: "Bem vindo Car", segmento: "oficina", base_faturamento: "ordens_servico_faturadas" },
  faturamento: {
    historico_desde: "2026-05",
    serie_13_meses: [
      { mes: "2026-04", valor: 0, qtd: 0 },
      { mes: "2026-05", valor: 57368, qtd: 42 },
      { mes: "2026-10", valor: 105335.99, qtd: 62 },
      { mes: "2026-11", valor: 47855.37, qtd: 31 },
    ],
    mes_atual: { valor: 47855.37, qtd: 31, ticket_medio: 1543.72, projecao_linear_fim_do_mes: 84450.65 },
    mes_anterior: { valor: 105335.99, qtd: 62, ticket_medio: 1698.97, ate_o_mesmo_dia: 64792.64 },
  },
  metas: {
    tem_meta_no_mes: true,
    mes_atual: {
      meta: 152000,
      realizado: 47855.37,
      percentual_atingido: 31.5,
      falta_para_meta: 104144.63,
      dias_restantes_no_mes: 13,
      faturamento_diario_necessario: 8011.13,
      faturamento_diario_atual: 2815.02,
    },
    proximos_meses: [{ mes: "2026-12", meta: 162000 }],
  },
  os: {
    em_andamento_lista: [
      { numero: 250, status: "aguardando_peca", cliente: "LEILA", veiculo: "KA", placa: "AZN-4F81", mecanico: null, valor: 1055, dias_desde_abertura: 51, dias_sem_movimento: 48, previsao_entrega: null, atrasada: false },
      { numero: 248, status: "aguardando_aprovacao", cliente: "WENDELL", veiculo: "CELTA", placa: "APT-9F17", mecanico: null, valor: 830, dias_desde_abertura: 49, dias_sem_movimento: 48, previsao_entrega: null, atrasada: false },
      { numero: 251, status: "pronto_para_entrega", cliente: "GABRIEL", veiculo: "CORSA", placa: "DGX-8337", mecanico: null, valor: 370, dias_desde_abertura: 53, dias_sem_movimento: 48, previsao_entrega: null, atrasada: false },
      { numero: 247, status: "em_execucao", cliente: "DALVAN", veiculo: "UNO", placa: "AHB-0395", mecanico: null, valor: 335, dias_desde_abertura: 50, dias_sem_movimento: 48, previsao_entrega: null, atrasada: false },
    ],
    ultimos_90_dias: {
      faturadas_qtd: 181,
      faturadas_valor: 274480.9,
      ticket_medio: 1516.47,
      canceladas_qtd: 0,
      canceladas_valor: 0,
      retornos_retrabalho_qtd: 0,
      descontos_concedidos: 0,
      descontos_percentual_do_bruto: 0,
      faturadas_sem_mecanico_percentual: 100,
      faturadas_sem_veiculo_percentual: 20,
    },
  },
  itens: { receita_em_itens_genericos_percentual: 59 },
  clientes: {
    faturamento_sem_cliente_identificado_12m: { qtd: 102, valor: 182228.49, percentual_do_faturamento: 30 },
    sem_comprar_ha_mais_de_90_dias: 47,
    concentracao_top5_percentual_12m: 17.4,
    para_reativar: [
      { nome: "PAULO", ultima_compra: "2026-08-15", dias_sem_comprar: 94, total_gasto: 10778.01, compras: 1, ticket_medio: 10778.01 },
      { nome: "ANDRÉA", ultima_compra: "2026-07-13", dias_sem_comprar: 127, total_gasto: 9300, compras: 1, ticket_medio: 9300 },
      { nome: "ALAN", ultima_compra: "2026-07-14", dias_sem_comprar: 126, total_gasto: 6200, compras: 1, ticket_medio: 6200 },
    ],
  },
  financeiro: {
    contas_a_pagar: {
      em_aberto: { qtd: 3, valor: 14192.64 },
      vencidas: { qtd: 1, valor: 7758.6 },
      vencem_em_7_dias: { qtd: 1, valor: 4424.11 },
      vencem_em_30_dias: { qtd: 1, valor: 4424.11 },
      proximas: [
        { fornecedor: "Sem fornecedor", descricao: "Impostos sobre a venda — Setembro/2026", valor: 7758.6, vencimento: "2026-10-20", dias_para_vencer: -28 },
      ],
    },
    contas_a_receber: {
      em_aberto: { qtd: 0, valor: 0 },
      vencidas: { qtd: 0, valor: 0 },
      vencem_em_7_dias: { qtd: 0, valor: 0 },
      vencem_em_30_dias: { qtd: 0, valor: 0 },
      maiores_vencidas: [],
    },
    saldo_em_contas: 109644.62,
  },
  despesas: {
    total_mes_atual: 68409.75,
    total_mes_anterior: 71214.68,
    por_categoria: [
      { categoria: "Salários", mes_atual: 28277, mes_anterior: 25250 },
      { categoria: "Material de consumo", mes_atual: 28541.82, mes_anterior: 27794.57 },
    ],
  },
};

{
  const sinais = derivarSinais(BVC);
  const por = (id) => sinais.find((s) => s.id === id);

  const ritmo = por("meta-ritmo");
  assert(ritmo && ritmo.severidade === "alta", "meta em risco (projeção 56% da meta) é alta");
  assert(ritmo && ritmo.detalhe.includes("R$ 104.144,63") && ritmo.detalhe.includes("13 dias restantes"), "traz o que falta e os dias");
  assert(ritmo && ritmo.detalhe.includes("é estimativa"), "avisa que a projeção é estimativa");

  const mesPassado = por("ritmo-abaixo-mes-anterior");
  assert(mesPassado && mesPassado.severidade === "media", "26% abaixo do mesmo ponto do mês passado = média");
  assert(mesPassado && mesPassado.titulo.includes("26%"), "percentual correto");

  const paradas = por("os-paradas");
  assert(paradas && paradas.severidade === "alta" && paradas.titulo.startsWith("4 OS"), "4 OS paradas há 48 dias = alta");
  assert(por("os-a-faturar") && por("os-a-faturar").severidade === "media", "OS pronta para entrega sem faturar");
  assert(por("os-aguardando-aprovacao"), "orçamento aguardando aprovação");

  assert(por("clientes-sem-identificacao")?.severidade === "alta", "30% do faturamento sem cliente = alta");
  assert(por("clientes-reativar")?.detalhe.includes("PAULO (94 dias"), "reativação cita o maior cliente sumido");
  assert(por("pagar-vencidas")?.severidade === "alta", "conta vencida = alta");
  assert(por("pagar-7-dias"), "contas dos próximos 7 dias");
  assert(por("dados-sem-mecanico") && por("dados-itens-genericos"), "avisos de qualidade de dados");
  assert(por("caixa-cobertura"), "cobertura de caixa");
  assert(!por("contas-em-dia"), "com conta vencida não há 'contas em dia'");
  assert(!por("despesas-subindo"), "salários +12% não dispara alerta");
  assert(!por("clientes-concentracao"), "concentração de 17% é saudável");

  const ordem = sinais.map((s) => s.severidade);
  const rank = { alta: 0, media: 1, info: 2, positivo: 3 };
  assert(ordem.every((s, i) => i === 0 || rank[s] >= rank[ordem[i - 1]]), "ordenado da maior para a menor gravidade");

  // casos de borda
  assert(derivarSinais({}).length === 0, "retrato vazio não gera sinais nem erro");
  const batida = derivarSinais({
    ...BVC,
    metas: { tem_meta_no_mes: true, mes_atual: { ...BVC.metas.mes_atual, percentual_atingido: 104, realizado: 158000 } },
  });
  assert(batida.find((s) => s.id === "meta-batida")?.severidade === "positivo", "meta batida é positivo");
  const semMeta = derivarSinais({ ...BVC, metas: { tem_meta_no_mes: false } });
  assert(semMeta.find((s) => s.id === "meta-ausente"), "sem meta cadastrada vira orientação");
  const caixaNegativo = derivarSinais({
    ...BVC,
    financeiro: { ...BVC.financeiro, saldo_em_contas: 1000 },
  });
  assert(caixaNegativo.find((s) => s.id === "caixa-negativo-30d")?.severidade === "alta", "caixa projetado negativo = alta");
  const entregue = derivarSinais({
    ...BVC,
    os: { ...BVC.os, em_andamento_lista: [{ ...BVC.os.em_andamento_lista[0], status: "entregue" }] },
  });
  assert(entregue.find((s) => s.id === "os-a-faturar")?.severidade === "alta", "OS entregue e não faturada = alta");
  const emDia = derivarSinais({
    ...BVC,
    financeiro: {
      ...BVC.financeiro,
      contas_a_pagar: { ...BVC.financeiro.contas_a_pagar, vencidas: { qtd: 0, valor: 0 } },
    },
  });
  assert(emDia.find((s) => s.id === "contas-em-dia")?.severidade === "positivo", "tudo em dia é positivo");
}

// ───────── contexto de dados ─────────
{
  const sinais = derivarSinais(BVC);
  const ctx = formatarContextoDados({
    tenant: { name: "Bem vindo Car", slug: "bem-vindo-car", segment: "oficina" },
    snapshot: BVC,
    sinais,
    extras: ["## DRE OFICIAL DO MÊS\n- Receita líquida: R$ 1,00"],
  });
  assert(ctx.includes("Empresa: Bem vindo Car · Segmento: oficina"), "cabeçalho com empresa e segmento");
  assert(/terça-feira, 17 de novembro de 2026/.test(ctx), "data de hoje por extenso");
  assert(ctx.includes("dia 17 de 30"), "dia do mês");
  assert(ctx.includes("SINAIS JÁ CALCULADOS") && ctx.includes("[ALTA] Meta do mês em risco"), "sinais no contexto");
  assert(ctx.includes("(tela: /bem-vindo-car/painel-executivo)"), "sinal aponta a tela da empresa");
  assert(ctx.includes("DRE OFICIAL"), "extras entram no contexto");
  assert(ctx.includes('"serie_13_meses"') && !ctx.includes('"mes":"2026-04"'), "meses zerados antes do histórico saem do JSON");
  assert(ctx.includes('"mes":"2026-05"'), "histórico real fica no JSON");
  const json = ctx.slice(ctx.indexOf("{", ctx.indexOf("RETRATO COMPLETO")));
  let ok = true;
  try {
    JSON.parse(json);
  } catch {
    ok = false;
  }
  assert(ok, "o retrato é JSON válido");

  const semDados = formatarContextoDados({
    tenant: { name: "Nova", slug: "nova", segment: null },
    snapshot: null,
    sinais: [],
  });
  assert(semDados.includes("Não foi possível carregar o retrato"), "sem retrato: avisa em vez de inventar");
}

console.log(`\nai-assistant-tests: ${pass} ok, ${fail} falhas`);
process.exit(fail === 0 ? 0 : 1);
