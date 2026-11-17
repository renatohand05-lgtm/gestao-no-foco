/**
 * "Sinais" = leituras prontas do retrato dos dados: o que está em risco, o
 * que está parado, onde há dinheiro na mesa. São calculados aqui (código, não
 * IA) para o assistente nunca deixar passar o óbvio nem errar a conta — ele
 * só prioriza, explica e transforma em plano de ação.
 */

import type { AiSnapshot } from "./ai-assistant-snapshot.ts";

export type SinalSeveridade = "alta" | "media" | "info" | "positivo";

export type Sinal = {
  id: string;
  severidade: SinalSeveridade;
  titulo: string;
  detalhe: string;
  /** Caminho da tela relacionada, sem o slug da empresa (ex.: /financeiro/contas-pagar). */
  tela?: string;
};

const brlFmt = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export function brl(value: number): string {
  // o Intl usa espaço "inquebrável" entre R$ e o número; espaço comum é mais limpo para a IA
  return brlFmt.format(value).replace(/\u00a0/g, " ");
}

function pct(value: number, digits = 0): string {
  return `${value.toFixed(digits).replace(".", ",")}%`;
}

function statusLegivel(status: string): string {
  return status.replace(/_/g, " ");
}

const ORDEM: Record<SinalSeveridade, number> = {
  alta: 0,
  media: 1,
  info: 2,
  positivo: 3,
};

export function derivarSinais(snap: AiSnapshot): Sinal[] {
  const sinais: Sinal[] = [];
  const push = (s: Sinal) => sinais.push(s);

  const fat = snap.faturamento;
  const metas = snap.metas;

  // ───────── meta do mês ─────────
  if (metas?.tem_meta_no_mes === false) {
    push({
      id: "meta-ausente",
      severidade: "info",
      titulo: "Sem meta cadastrada para este mês",
      detalhe:
        "Sem meta não dá para medir ritmo nem montar plano de atingimento. Cadastrar a meta mensal habilita o acompanhamento.",
      tela: "/configuracoes/metas",
    });
  }
  const meta = metas?.mes_atual;
  if (meta && fat?.mes_atual) {
    const proj = fat.mes_atual.projecao_linear_fim_do_mes;
    if (meta.percentual_atingido >= 100) {
      push({
        id: "meta-batida",
        severidade: "positivo",
        titulo: "Meta do mês já batida",
        detalhe: `Realizado ${brl(meta.realizado)} para uma meta de ${brl(meta.meta)} (${pct(meta.percentual_atingido, 1)}).`,
        tela: "/painel-executivo",
      });
    } else if (meta.dias_restantes_no_mes <= 0) {
      push({
        id: "meta-fechada-abaixo",
        severidade: "alta",
        titulo: "Mês fechou abaixo da meta",
        detalhe: `Realizado ${brl(meta.realizado)} de ${brl(meta.meta)} (${pct(meta.percentual_atingido, 1)}); faltaram ${brl(meta.falta_para_meta)}.`,
        tela: "/painel-executivo",
      });
    } else if (proj !== null && proj > 0) {
      const ratio = proj / meta.meta;
      const severidade: SinalSeveridade =
        ratio < 0.85 ? "alta" : ratio < 1 ? "media" : "positivo";
      push({
        id: "meta-ritmo",
        severidade,
        titulo:
          ratio < 1 ? "Meta do mês em risco no ritmo atual" : "Meta do mês no ritmo certo",
        detalhe:
          `Realizado ${brl(meta.realizado)} de ${brl(meta.meta)} (${pct(meta.percentual_atingido, 1)}). ` +
          `No ritmo médio atual (${brl(meta.faturamento_diario_atual ?? 0)}/dia) o mês fecha em ~${brl(proj)} (${pct(ratio * 100)} da meta; projeção linear, é estimativa). ` +
          `Faltam ${brl(meta.falta_para_meta)}: é preciso faturar ${brl(meta.faturamento_diario_necessario ?? 0)}/dia nos ${meta.dias_restantes_no_mes} dias restantes.`,
        tela: "/painel-executivo",
      });
    }
  }

  // ───────── ritmo contra o mesmo ponto do mês passado ─────────
  if (fat?.mes_atual && fat.mes_anterior && fat.mes_anterior.ate_o_mesmo_dia > 0) {
    const variacao = fat.mes_atual.valor / fat.mes_anterior.ate_o_mesmo_dia - 1;
    if (variacao <= -0.15) {
      push({
        id: "ritmo-abaixo-mes-anterior",
        severidade: variacao <= -0.3 ? "alta" : "media",
        titulo: `Faturamento ${pct(Math.abs(variacao) * 100)} abaixo do mesmo ponto do mês passado`,
        detalhe: `Até hoje: ${brl(fat.mes_atual.valor)} (${fat.mes_atual.qtd} lançamentos). No mesmo dia do mês anterior: ${brl(fat.mes_anterior.ate_o_mesmo_dia)}.`,
        tela: "/dashboard",
      });
    } else if (variacao >= 0.15) {
      push({
        id: "ritmo-acima-mes-anterior",
        severidade: "positivo",
        titulo: `Faturamento ${pct(variacao * 100)} acima do mesmo ponto do mês passado`,
        detalhe: `Até hoje: ${brl(fat.mes_atual.valor)} contra ${brl(fat.mes_anterior.ate_o_mesmo_dia)} no mesmo dia do mês anterior.`,
        tela: "/dashboard",
      });
    }

    const tAtual = fat.mes_atual.ticket_medio;
    const tAnt = fat.mes_anterior.ticket_medio;
    if (tAtual && tAnt && tAnt > 0) {
      const v = tAtual / tAnt - 1;
      if (Math.abs(v) >= 0.1) {
        push({
          id: "ticket-variacao",
          severidade: v < 0 ? "info" : "positivo",
          titulo: `Ticket médio ${v < 0 ? "caiu" : "subiu"} ${pct(Math.abs(v) * 100)}`,
          detalhe: `${brl(tAtual)} neste mês contra ${brl(tAnt)} no mês passado.`,
        });
      }
    }
  }

  // ───────── ordens de serviço ─────────
  const lista = snap.os?.em_andamento_lista ?? [];
  const paradas = lista.filter((o) => o.dias_sem_movimento >= 7);
  if (paradas.length > 0) {
    const total = paradas.reduce((s, o) => s + o.valor, 0);
    const piores = [...paradas]
      .sort((a, b) => b.dias_sem_movimento - a.dias_sem_movimento || b.valor - a.valor)
      .slice(0, 4)
      .map(
        (o) =>
          `#${o.numero} ${o.cliente ?? "sem cliente"} (${statusLegivel(o.status)}, ${o.dias_sem_movimento} dias sem movimento, ${brl(o.valor)})`,
      )
      .join("; ");
    push({
      id: "os-paradas",
      severidade:
        paradas.length >= 3 || paradas.some((o) => o.dias_sem_movimento >= 30)
          ? "alta"
          : "media",
      titulo: `${paradas.length} OS sem movimento há 7+ dias (${brl(total)} parados)`,
      detalhe: `${piores}.`,
      tela: "/ordens",
    });
  }

  const aFaturar = lista.filter(
    (o) => o.status === "pronto_para_entrega" || o.status === "entregue",
  );
  if (aFaturar.length > 0) {
    const total = aFaturar.reduce((s, o) => s + o.valor, 0);
    const entregues = aFaturar.filter((o) => o.status === "entregue");
    push({
      id: "os-a-faturar",
      severidade: entregues.length > 0 ? "alta" : "media",
      titulo: `${aFaturar.length} OS prontas/entregues ainda não faturadas (${brl(total)})`,
      detalhe:
        entregues.length > 0
          ? `${entregues.length} já foram entregues ao cliente e seguem sem faturar — dinheiro na mesa.`
          : "Estão prontas para entrega; faturar e receber assim que o cliente retirar.",
      tela: "/ordens",
    });
  }

  const emAprovacao = lista.filter(
    (o) => o.status === "aguardando_aprovacao" || o.status === "parcialmente_aprovado",
  );
  if (emAprovacao.length > 0) {
    const total = emAprovacao.reduce((s, o) => s + o.valor, 0);
    push({
      id: "os-aguardando-aprovacao",
      severidade: "media",
      titulo: `${emAprovacao.length} orçamento(s) aguardando aprovação do cliente (${brl(total)})`,
      detalhe: emAprovacao
        .slice(0, 3)
        .map((o) => `#${o.numero} ${o.cliente ?? "sem cliente"} (${brl(o.valor)}, há ${o.dias_desde_abertura} dias)`)
        .join("; "),
      tela: "/ordens",
    });
  }

  const atrasadas = lista.filter((o) => o.atrasada);
  if (atrasadas.length > 0) {
    push({
      id: "os-atrasadas",
      severidade: "media",
      titulo: `${atrasadas.length} OS com previsão de entrega vencida`,
      detalhe: atrasadas
        .slice(0, 3)
        .map((o) => `#${o.numero} ${o.cliente ?? "sem cliente"} (previsão ${o.previsao_entrega})`)
        .join("; "),
      tela: "/ordens",
    });
  }

  const os90 = snap.os?.ultimos_90_dias;
  if (os90) {
    if (
      os90.descontos_percentual_do_bruto !== null &&
      os90.descontos_percentual_do_bruto >= 8
    ) {
      push({
        id: "descontos-altos",
        severidade: "media",
        titulo: `Descontos somam ${pct(os90.descontos_percentual_do_bruto, 1)} do faturamento bruto`,
        detalhe: `${brl(os90.descontos_concedidos)} em descontos nos últimos 90 dias.`,
        tela: "/descontos/dashboard",
      });
    }
    if (os90.faturadas_qtd > 0 && os90.retornos_retrabalho_qtd / os90.faturadas_qtd >= 0.05) {
      push({
        id: "retrabalho",
        severidade: "media",
        titulo: `Retrabalho em ${pct((os90.retornos_retrabalho_qtd / os90.faturadas_qtd) * 100, 1)} das OS`,
        detalhe: `${os90.retornos_retrabalho_qtd} OS de retorno em ${os90.faturadas_qtd} faturadas nos últimos 90 dias.`,
        tela: "/ordens/qualidade-operacional",
      });
    }
    const totalOs = os90.faturadas_qtd + os90.canceladas_qtd;
    if (totalOs > 0 && os90.canceladas_qtd / totalOs >= 0.1) {
      push({
        id: "cancelamentos",
        severidade: "media",
        titulo: `${os90.canceladas_qtd} OS canceladas (${brl(os90.canceladas_valor)}) nos últimos 90 dias`,
        detalhe: `Representam ${pct((os90.canceladas_qtd / totalOs) * 100)} das OS fechadas — vale entender o motivo.`,
        tela: "/ordens",
      });
    }
    if (
      os90.faturadas_sem_mecanico_percentual !== null &&
      os90.faturadas_sem_mecanico_percentual >= 50
    ) {
      push({
        id: "dados-sem-mecanico",
        severidade: "info",
        titulo: `${pct(os90.faturadas_sem_mecanico_percentual)} das OS faturadas não têm mecânico vinculado`,
        detalhe:
          "Sem o mecânico na OS não é possível medir produtividade, faturamento por profissional nem comissão com segurança.",
        tela: "/ordens",
      });
    }
  }

  const genericos = snap.itens?.receita_em_itens_genericos_percentual;
  if (typeof genericos === "number" && genericos >= 40) {
    push({
      id: "dados-itens-genericos",
      severidade: "info",
      titulo: `${pct(genericos)} da receita está em itens genéricos`,
      detalhe:
        'Linhas como "Peças", "Serviço personalizado" ou "Mão de obra" não permitem saber quais serviços e peças mais vendem nem a margem de cada um. Lançar os itens detalhados melhora todas as análises.',
      tela: "/produtos/gerenciar-servicos",
    });
  }

  // ───────── clientes ─────────
  const cli = snap.clientes;
  const semId = cli?.faturamento_sem_cliente_identificado_12m;
  if (semId && semId.percentual_do_faturamento !== null && semId.percentual_do_faturamento >= 15) {
    push({
      id: "clientes-sem-identificacao",
      severidade: semId.percentual_do_faturamento >= 30 ? "alta" : "media",
      titulo: `${pct(semId.percentual_do_faturamento)} do faturamento (12 meses) sem cliente identificado`,
      detalhe: `${semId.qtd} lançamentos somando ${brl(semId.valor)} não têm cliente real — não há como fazer pós-venda, lembrete de revisão nem reativação para eles.`,
      tela: "/clientes",
    });
  }
  const reativar = cli?.para_reativar ?? [];
  if (reativar.length >= 3) {
    push({
      id: "clientes-reativar",
      severidade: "media",
      titulo: `${cli?.sem_comprar_ha_mais_de_90_dias ?? reativar.length} clientes que já compraram estão sumidos há 90+ dias`,
      detalhe:
        "Maiores para chamar: " +
        reativar
          .slice(0, 5)
          .map((c) => `${c.nome} (${c.dias_sem_comprar} dias, ${brl(c.total_gasto)} no total)`)
          .join("; ") +
        ".",
      tela: "/crm/retornos",
    });
  }
  if (
    typeof cli?.concentracao_top5_percentual_12m === "number" &&
    cli.concentracao_top5_percentual_12m >= 40
  ) {
    push({
      id: "clientes-concentracao",
      severidade: "media",
      titulo: `Os 5 maiores clientes concentram ${pct(cli.concentracao_top5_percentual_12m)} da receita`,
      detalhe: "Dependência alta: perder um deles pesa no caixa. Vale proteger a relação e diversificar.",
      tela: "/clientes",
    });
  }

  // ───────── financeiro ─────────
  const fin = snap.financeiro;
  const pagar = fin?.contas_a_pagar;
  const receber = fin?.contas_a_receber;

  if (pagar && pagar.vencidas.qtd > 0) {
    const vencidas = pagar.proximas
      .filter((p) => p.dias_para_vencer < 0)
      .slice(0, 3)
      .map((p) => `${p.descricao ?? p.fornecedor} (${brl(p.valor)}, ${Math.abs(p.dias_para_vencer)} dias de atraso)`)
      .join("; ");
    push({
      id: "pagar-vencidas",
      severidade: "alta",
      titulo: `${pagar.vencidas.qtd} conta(s) a pagar vencida(s): ${brl(pagar.vencidas.valor)}`,
      detalhe: vencidas ? `${vencidas}. Atraso gera multa, juros e risco fiscal.` : "Atraso gera multa e juros.",
      tela: "/financeiro/contas-pagar",
    });
  }
  if (pagar && pagar.vencem_em_7_dias.qtd > 0) {
    push({
      id: "pagar-7-dias",
      severidade: "info",
      titulo: `${pagar.vencem_em_7_dias.qtd} conta(s) a pagar vencem em 7 dias: ${brl(pagar.vencem_em_7_dias.valor)}`,
      detalhe: "Garantir saldo e agendar o pagamento antes do vencimento.",
      tela: "/financeiro/contas-pagar",
    });
  }
  if (receber && receber.vencidas.qtd > 0) {
    const maiores = receber.maiores_vencidas
      .slice(0, 3)
      .map((r) => `${r.cliente ?? "sem cliente"} (${brl(r.valor)}, ${r.dias_em_atraso} dias)`)
      .join("; ");
    push({
      id: "receber-vencidas",
      severidade: "alta",
      titulo: `${receber.vencidas.qtd} recebimento(s) em atraso: ${brl(receber.vencidas.valor)}`,
      detalhe: `${maiores}. Cobrar hoje: cada dia parado encarece o caixa.`,
      tela: "/financeiro/contas-receber",
    });
  }

  if (typeof fin?.saldo_em_contas === "number" && pagar && receber) {
    const saldo = fin.saldo_em_contas;
    const projecao =
      saldo - pagar.vencidas.valor - pagar.vencem_em_30_dias.valor + receber.vencem_em_30_dias.valor;
    const despesaBase = snap.despesas?.total_mes_anterior ?? 0;
    if (projecao < 0) {
      push({
        id: "caixa-negativo-30d",
        severidade: "alta",
        titulo: "Caixa projetado negativo em 30 dias",
        detalhe: `Saldo ${brl(saldo)} − vencidas ${brl(pagar.vencidas.valor)} − a pagar em 30 dias ${brl(pagar.vencem_em_30_dias.valor)} + a receber em 30 dias ${brl(receber.vencem_em_30_dias.valor)} = ${brl(projecao)} (considera só contas já lançadas).`,
        tela: "/financeiro/fluxo-caixa",
      });
    } else if (despesaBase > 0) {
      const meses = saldo / despesaBase;
      push({
        id: "caixa-cobertura",
        severidade: meses < 0.5 ? "media" : "info",
        titulo: `Saldo em contas ${brl(saldo)} cobre ~${meses.toFixed(1).replace(".", ",")} mês de despesas`,
        detalhe: `Base: despesas lançadas do mês anterior (${brl(despesaBase)}). Projeção de caixa em 30 dias com contas já lançadas: ${brl(projecao)}.`,
        tela: "/financeiro/fluxo-caixa",
      });
    }
  }

  // ───────── despesas ─────────
  const cats = snap.despesas?.por_categoria ?? [];
  const subiram = cats
    .filter((c) => c.mes_anterior > 0 && c.mes_atual > c.mes_anterior * 1.3 && c.mes_atual - c.mes_anterior >= 1500)
    .sort((a, b) => b.mes_atual - b.mes_anterior - (a.mes_atual - a.mes_anterior))
    .slice(0, 3);
  if (subiram.length > 0) {
    push({
      id: "despesas-subindo",
      severidade: "media",
      titulo: "Categorias de despesa que subiram forte contra o mês passado",
      detalhe:
        subiram
          .map((c) => `${c.categoria}: ${brl(c.mes_anterior)} → ${brl(c.mes_atual)} (+${pct((c.mes_atual / c.mes_anterior - 1) * 100)})`)
          .join("; ") + ".",
      tela: "/financeiro/contas-pagar",
    });
  }

  // ───────── estoque ─────────
  const est = snap.estoque;
  if (est && (est.abaixo_do_minimo_qtd ?? 0) > 0) {
    push({
      id: "estoque-baixo",
      severidade: "media",
      titulo: `${est.abaixo_do_minimo_qtd} produto(s) abaixo do estoque mínimo`,
      detalhe: (est.itens_para_repor ?? [])
        .slice(0, 4)
        .map((p) => `${p.nome} (${p.atual} de mín. ${p.minimo})`)
        .join("; "),
      tela: "/estoque/reposicao",
    });
  }

  // ───────── contas em dia ─────────
  if (
    pagar && receber &&
    pagar.vencidas.qtd === 0 && receber.vencidas.qtd === 0 &&
    pagar.em_aberto.qtd + receber.em_aberto.qtd > 0
  ) {
    push({
      id: "contas-em-dia",
      severidade: "positivo",
      titulo: "Contas em dia",
      detalhe: "Nenhuma conta a pagar vencida e nenhum recebimento em atraso.",
      tela: "/financeiro/contas-pagar",
    });
  }

  return sinais
    .map((s, i) => ({ s, i }))
    .sort((a, b) => ORDEM[a.s.severidade] - ORDEM[b.s.severidade] || a.i - b.i)
    .map(({ s }) => s);
}
