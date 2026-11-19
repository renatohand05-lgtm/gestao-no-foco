/**
 * Rede de lojas — tradução das linhas do banco (rupturas, estoque da cozinha central, delivery) para os tipos do app.
 * Puro (sem "server-only"): os testes importam direto, com dados sujos de propósito.
 */
import { MOTIVOS_RUPTURA, type MotivoRuptura, type PeriodoDelivery, type ProdutoCC, type RegistroDelivery, type RespostaRotina, type Ruptura } from "./tipos.ts";

type Linha = Record<string, unknown>;
const num = (v: unknown): number => {
  const n = typeof v === "number" ? v : Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
};
const numOuNull = (v: unknown): number | null => {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
const origem = (v: unknown): "manual" | "exemplo" => (v === "exemplo" ? "exemplo" : "manual");
const textoOuNull = (v: unknown): string | null => (typeof v === "string" && v.trim() !== "" ? v : null);

export function mapRuptura(r: Linha): Ruptura {
  const motivo = MOTIVOS_RUPTURA.find((m) => m === r.motivo) ?? (MOTIVOS_RUPTURA[0] as MotivoRuptura);
  return {
    id: String(r.id),
    lojaId: String(r.loja_id),
    data: String(r.data).slice(0, 10),
    item: String(r.item ?? ""),
    motivo,
    horas: num(r.horas),
    acao: textoOuNull(r.acao),
    origem: origem(r.origem),
  };
}

export function mapProduto(r: Linha): ProdutoCC {
  return {
    id: String(r.id),
    item: String(r.item ?? ""),
    unidade: String(r.unidade ?? "un"),
    atual: num(r.atual),
    minimo: num(r.minimo),
    consumoDia: num(r.consumo_dia),
    custo: num(r.custo_unitario),
    origem: origem(r.origem),
  };
}

const RESPOSTAS: readonly RespostaRotina[] = ["sim", "nao", "na"];

/** Lê a rotina gravada ({"0":"sim",...}); ignora itens fora de 0–6 e respostas desconhecidas. */
export function mapRotina(v: unknown): Record<number, RespostaRotina> {
  const out: Record<number, RespostaRotina> = {};
  if (v && typeof v === "object" && !Array.isArray(v)) {
    for (const [k, resp] of Object.entries(v as Record<string, unknown>)) {
      const i = Number(k);
      if (Number.isInteger(i) && i >= 0 && i <= 6 && RESPOSTAS.includes(resp as RespostaRotina)) out[i] = resp as RespostaRotina;
    }
  }
  return out;
}

export function mapRegistroDelivery(r: Linha): RegistroDelivery {
  return {
    id: String(r.id),
    lojaId: String(r.loja_id),
    data: String(r.data).slice(0, 10),
    periodo: (r.periodo === "semanal" ? "semanal" : "diario") as PeriodoDelivery,
    responsavel: textoOuNull(r.responsavel),
    preparo: numOuNull(r.preparo),
    cancelamentos: numOuNull(r.cancelamentos),
    notaIfood: numOuNull(r.nota_ifood),
    tempoOnline: numOuNull(r.tempo_online),
    rupturas: numOuNull(r.rupturas),
    pedidos: numOuNull(r.pedidos),
    ticketMedio: numOuNull(r.ticket_medio),
    conversao: numOuNull(r.conversao),
    atrasos: numOuNull(r.atrasos),
    comissoes: numOuNull(r.comissoes),
    freteSubsidiado: numOuNull(r.frete_subsidiado),
    promocoes: numOuNull(r.promocoes),
    custoPedido: numOuNull(r.custo_pedido),
    rotina: mapRotina(r.rotina),
    observacoes: textoOuNull(r.observacoes),
    origem: origem(r.origem),
  };
}
