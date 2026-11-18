/**
 * Acha a base de clientes dentro de uma aba — qualquer ordem de colunas, cabeçalho em qualquer
 * linha, várias tabelas na mesma aba (ex.: "ATIVOS" em cima e "CHURN" embaixo) e textos soltos
 * em volta (títulos, totais, observações).
 */
import {
  celulaTexto,
  dataIso,
  letraDaColuna,
  numeroDe,
  sem,
} from "./texto.ts";
import type { Aba, CampoCliente, ClientePlanilha, TabelaClientes } from "./tipos.ts";

const SINONIMOS: Record<CampoCliente, string[]> = {
  nome: [
    "cliente",
    "clientes",
    "nome",
    "nome do cliente",
    "paciente",
    "pacientes",
    "nome do paciente",
    "empresa",
    "razao social",
    "contratante",
    "nome fantasia",
  ],
  nicho: [
    "nicho",
    "segmento",
    "especialidade",
    "ramo",
    "area de atuacao",
    "area",
    "tipo de cliente",
    "categoria",
  ],
  status: ["status", "situacao", "status do cliente", "situacao do cliente"],
  entrada: [
    "data de entrada",
    "data entrada",
    "entrada",
    "data de inicio",
    "data inicio",
    "inicio",
    "data de cadastro",
    "cadastro",
    "data de adesao",
    "adesao",
    "data de ativacao",
    "inicio do contrato",
    "data do contrato",
    "data de fechamento",
    "data da venda",
    "desde",
  ],
  saida: [
    "data de saida",
    "data saida",
    "saida",
    "data de cancelamento",
    "cancelamento",
    "data do cancelamento",
    "data de encerramento",
    "encerramento",
    "data de termino",
    "termino",
    "data fim",
    "data do churn",
    "churn",
    "fim",
  ],
  mrr: [
    "mrr",
    "mrr r",
    "valor mensal",
    "mensalidade",
    "valor da mensalidade",
    "ticket mensal",
    "ticket",
    "fee mensal",
    "fee",
    "honorarios",
    "honorario",
    "recorrencia",
    "receita mensal",
    "valor do contrato",
    "valor",
    "contrato",
  ],
  meses: ["meses ativos", "meses", "tempo de casa", "permanencia", "meses de contrato"],
  faturamento: [
    "faturamento gerado",
    "faturamento",
    "receita gerada",
    "total faturado",
    "total pago",
    "ltv",
  ],
  motivo: [
    "motivo da saida",
    "motivo de saida",
    "motivo do churn",
    "motivo do cancelamento",
    "motivo da perda",
    "motivo perda",
    "razao da saida",
    "motivo",
  ],
  gestor: [
    "gestor",
    "gestores",
    "gestor responsavel",
    "responsavel",
    "consultor",
    "vendedor",
    "account",
    "atendente",
    "profissional",
    "gerente",
    "closer",
  ],
};

const CAMPOS = Object.keys(SINONIMOS) as CampoCliente[];

function pontuacao(cabecalho: string, campo: CampoCliente): number {
  if (!cabecalho) return 0;
  const lista = SINONIMOS[campo];
  const exato = lista.indexOf(cabecalho);
  if (exato >= 0) return 100 - exato;
  const tokens = new Set(cabecalho.split(" "));
  for (let i = 0; i < lista.length; i++) {
    const partes = lista[i].split(" ");
    if (partes.every((p) => tokens.has(p))) return 60 - i;
  }
  return 0;
}

type MapaColunas = Partial<Record<CampoCliente, number>>;

/** Decide qual coluna alimenta cada campo. `null` quando a linha não parece cabeçalho. */
export function reconhecerCabecalho(linha: unknown[]): MapaColunas | null {
  const textos = linha.map((c) => (typeof c === "string" ? sem(c) : ""));
  const preenchidas = linha.filter((c) => c != null && c !== "").length;
  const emTexto = textos.filter(Boolean).length;
  if (preenchidas < 3 || preenchidas > 40 || emTexto < preenchidas * 0.6) return null;

  const trincas: Array<{ col: number; campo: CampoCliente; nota: number }> = [];
  textos.forEach((t, col) => {
    if (!t) return;
    for (const campo of CAMPOS) {
      const nota = pontuacao(t, campo);
      if (nota > 0) trincas.push({ col, campo, nota });
    }
  });
  trincas.sort((a, b) => b.nota - a.nota);

  const mapa: MapaColunas = {};
  const colunasUsadas = new Set<number>();
  for (const { col, campo, nota } of trincas) {
    if (mapa[campo] !== undefined || colunasUsadas.has(col)) continue;
    // Nota baixa só vale para campos "fortes" (evita "valor" virar MRR por engano).
    if (nota < 45) continue;
    mapa[campo] = col;
    colunasUsadas.add(col);
  }

  if (mapa.nome === undefined) return null;
  const sinais = (["entrada", "status", "mrr", "saida", "nicho", "motivo", "meses"] as const).filter(
    (c) => mapa[c] !== undefined,
  );
  return sinais.length >= 2 ? mapa : null;
}

const RE_INATIVO = /\b(churn|cancelad|perdid|inativ|encerrad|saiu|saida|desativad|ex cliente|rescindid)/;
const RE_ATIVO = /\b(ativ|vigente|em andamento|em contrato|ok|regular)/;

function ativoPelaSituacao(status: string, saida: string | null): boolean {
  if (status) {
    if (RE_INATIVO.test(status)) return false;
    if (RE_ATIVO.test(status)) return true;
  }
  return !saida;
}

/** Cabeçalhos de contas a receber / cobrança: tabela de pendências, não carteira de clientes. */
const RE_CABECALHO_DE_COBRANCA =
  /\b(vencimento|vence|boleto|parcela|nota fiscal|nf|em aberto|a receber|inadimpl|atraso|cobranca)\b/;

function pareceTabelaDeCobranca(linha: unknown[]): boolean {
  return linha.some((c) => typeof c === "string" && RE_CABECALHO_DE_COBRANCA.test(sem(c)));
}

const RE_LINHA_DE_TOTAL = /^(total|subtotal|soma|media|resumo)\b/;

function lerLinha(
  linha: unknown[],
  mapa: MapaColunas,
  aba: Aba,
  indice: number,
): { cliente: ClientePlanilha } | { ignorar: true } {
  const get = (c: CampoCliente) => (mapa[c] === undefined ? undefined : linha[mapa[c] as number]);

  const nomeBruto = celulaTexto(get("nome"));
  const nomeNorm = sem(nomeBruto);
  if (nomeNorm && RE_LINHA_DE_TOTAL.test(nomeNorm)) return { ignorar: true };

  const entrada = mapa.entrada !== undefined ? dataIso(get("entrada")) : null;
  let saida = mapa.saida !== undefined ? dataIso(get("saida")) : null;
  const statusTxt = mapa.status !== undefined ? sem(get("status")) : "";
  const mrrBruto = mapa.mrr !== undefined ? numeroDe(get("mrr")) : null;
  const mrr = mrrBruto != null && mrrBruto >= 0 ? mrrBruto : null;

  // Linha de dados precisa ter ao menos um sinal além do nome (descarta títulos e observações).
  if (!entrada && !statusTxt && !(mrr && mrr > 0)) return { ignorar: true };
  if (!nomeNorm && !entrada && !(mrr && mrr > 0)) return { ignorar: true };

  const avisos: string[] = [];
  const linhaNaPlanilha = aba.linhaInicial + indice;

  const ativo = ativoPelaSituacao(statusTxt, saida);
  if (ativo && saida) {
    avisos.push("Está como ativo, mas tem data de saída — a data de saída foi ignorada.");
    saida = null;
  }
  if (!ativo && !saida) {
    avisos.push("Cliente que saiu, mas sem data de saída na planilha.");
  }
  if (entrada && saida && saida < entrada) {
    avisos.push("A data de saída é anterior à de entrada.");
  }
  if (mapa.entrada !== undefined && !entrada) {
    avisos.push("Sem data de entrada válida.");
  }

  const nome = nomeBruto || `(sem nome na planilha - linha ${linhaNaPlanilha})`;
  if (!nomeBruto) avisos.push("Sem nome na planilha.");

  const meses = mapa.meses !== undefined ? numeroDe(get("meses")) : null;
  const faturamento = mapa.faturamento !== undefined ? numeroDe(get("faturamento")) : null;
  const motivo = mapa.motivo !== undefined ? celulaTexto(get("motivo")) : "";
  const gestor = mapa.gestor !== undefined ? celulaTexto(get("gestor")) : "";
  const nicho = mapa.nicho !== undefined ? celulaTexto(get("nicho")) : "";

  return {
    cliente: {
      chave: `${sem(nome)}|${entrada ?? ""}`,
      nome,
      nicho: nicho || null,
      ativo,
      entrada,
      saida: ativo ? null : saida,
      mrr,
      meses: meses != null && meses >= 0 ? meses : null,
      faturamento: faturamento != null && faturamento >= 0 ? faturamento : null,
      motivo: !ativo && motivo ? motivo : null,
      gestor: gestor || null,
      aba: aba.nome,
      linha: linhaNaPlanilha,
      avisos,
    },
  };
}

/** Procura tabelas de clientes na aba. Devolve `null` se não achar nenhuma que faça sentido. */
export function lerClientesDaAba(aba: Aba): TabelaClientes | null {
  const { linhas } = aba;
  const clientes: ClientePlanilha[] = [];
  const vistos = new Set<string>();
  let ignoradas = 0;
  let primeiroCabecalho: { linha: number; mapa: MapaColunas } | null = null;

  let i = 0;
  while (i < linhas.length) {
    const mapa = reconhecerCabecalho(linhas[i] ?? []);
    if (!mapa) {
      i++;
      continue;
    }

    // Lê a tabela que começa abaixo deste cabeçalho.
    const candidatos: ClientePlanilha[] = [];
    let semDados = 0;
    let j = i + 1;
    for (; j < linhas.length; j++) {
      const outro = reconhecerCabecalho(linhas[j] ?? []);
      if (outro) break;
      const lida = lerLinha(linhas[j] ?? [], mapa, aba, j);
      if ("ignorar" in lida) {
        semDados++;
        if (candidatos.length && semDados >= 6) break;
        continue;
      }
      semDados = 0;
      candidatos.push(lida.cliente);
    }

    // Tabela só vale se, quando há coluna de entrada, a maioria das linhas tem uma data de verdade
    // (descarta tabelas parecidas, como "pendências de pagamento", em que "entrada" é um valor).
    // Sem coluna de entrada, só vale se o cabeçalho não for de cobrança (vencimento, boleto, parcela…).
    const exigeData = mapa.entrada !== undefined;
    const comData = candidatos.filter((c) => c.entrada).length;
    const valida =
      candidatos.length >= 2 &&
      (exigeData
        ? comData >= candidatos.length * 0.6
        : (mapa.status !== undefined || mapa.mrr !== undefined) && !pareceTabelaDeCobranca(linhas[i] ?? []));

    if (valida) {
      if (!primeiroCabecalho) primeiroCabecalho = { linha: aba.linhaInicial + i, mapa };
      for (const c of candidatos) {
        if (vistos.has(c.chave)) {
          ignoradas++;
          continue;
        }
        vistos.add(c.chave);
        clientes.push(c);
      }
    }
    i = Math.max(j, i + 1);
  }

  if (!primeiroCabecalho || clientes.length === 0) return null;

  const colunas: Partial<Record<CampoCliente, string>> = {};
  for (const campo of CAMPOS) {
    const idx = primeiroCabecalho.mapa[campo];
    if (idx !== undefined) colunas[campo] = letraDaColuna(aba.colunaInicial + idx);
  }
  return {
    aba: aba.nome,
    linhaCabecalho: primeiroCabecalho.linha,
    colunas,
    clientes,
    ignoradas,
  };
}

/** Pontua a aba como "a base de clientes" para escolher a melhor quando há várias. */
export function pontuarTabelaClientes(t: TabelaClientes, oculta: boolean): number {
  let nota = t.clientes.length;
  const nome = sem(t.aba);
  if (/(cliente|paciente|base|carteira)/.test(nome)) nota += 25;
  if (oculta) nota -= 30;
  const status = new Set(t.clientes.map((c) => c.ativo));
  if (status.size === 2) nota += 10;
  return nota;
}
