import type {
  MovimentacaoBancariaTipo,
  TransferenciaPapel,
} from "@/types/movimentacoes-bancarias";

export function calcNovoSaldoBancario(params: {
  tipo: MovimentacaoBancariaTipo;
  valor: number;
  saldoAnterior: number;
  transferenciaPapel?: TransferenciaPapel | null;
}): number {
  const { tipo, valor, saldoAnterior, transferenciaPapel } = params;

  switch (tipo) {
    case "entrada":
      return saldoAnterior + valor;
    case "saida":
      return saldoAnterior - valor;
    case "ajuste":
      return valor;
    case "transferencia":
      if (transferenciaPapel === "recebida") {
        return saldoAnterior + valor;
      }
      return saldoAnterior - valor;
    case "estorno":
      return saldoAnterior + valor;
    default:
      return saldoAnterior;
  }
}

export function calcDeltaSaldo(movimentacao: {
  saldo_anterior: number;
  saldo_novo: number;
}): number {
  return movimentacao.saldo_novo - movimentacao.saldo_anterior;
}

export function calcValorEstorno(movimentacao: {
  saldo_anterior: number;
  saldo_novo: number;
}): number {
  return Math.abs(calcDeltaSaldo(movimentacao));
}

export function isMovimentacaoEstornavel(movimentacao: {
  estornada_por_id: string | null;
  deleted_at: string | null;
  tipo: MovimentacaoBancariaTipo;
}): boolean {
  return (
    !movimentacao.estornada_por_id &&
    !movimentacao.deleted_at &&
    movimentacao.tipo !== "estorno"
  );
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}
