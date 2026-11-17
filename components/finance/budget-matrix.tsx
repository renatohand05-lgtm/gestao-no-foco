import { cn } from "@/lib/utils";

const MESES = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
];

const SECOES: { natureza: string; titulo: string }[] = [
  { natureza: "receita", titulo: "Receitas" },
  { natureza: "custo", titulo: "Custos" },
  { natureza: "despesa", titulo: "Despesas" },
  { natureza: "investimento", titulo: "Investimentos" },
  { natureza: "divida", titulo: "Dívidas" },
  { natureza: "caixa", titulo: "Caixa" },
];

const reais = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});

function moeda(v: number) {
  return v === 0 ? "—" : reais.format(v);
}

export type BudgetMatrixLinha = {
  mes: number;
  natureza: string;
  valor: number;
  justificativa: string | null;
};

type Props = {
  linhas: BudgetMatrixLinha[];
  /** Faturamento realizado por mês (1–12) das OS faturadas — compara com a receita orçada. */
  realizadoReceita?: Record<number, number> | null;
};

/**
 * Orçamento em matriz: cada conta numa linha, meses nas colunas, com subtotal
 * por natureza e o resultado orçado (receitas − custos − despesas).
 */
export function BudgetMatrix({ linhas, realizadoReceita }: Props) {
  const meses = [...new Set(linhas.map((l) => l.mes))].sort((a, b) => a - b);
  if (meses.length === 0) {
    return <p className="text-sm text-muted-foreground">Sem linhas.</p>;
  }

  const porNatureza = new Map<string, Map<string, Map<number, number>>>();
  for (const l of linhas) {
    const contas = porNatureza.get(l.natureza) ?? new Map();
    const rotulo = l.justificativa?.trim() || l.natureza;
    const valores = contas.get(rotulo) ?? new Map<number, number>();
    valores.set(l.mes, (valores.get(l.mes) ?? 0) + l.valor);
    contas.set(rotulo, valores);
    porNatureza.set(l.natureza, contas);
  }

  const totalNatureza = (natureza: string, mes: number) => {
    let t = 0;
    for (const valores of porNatureza.get(natureza)?.values() ?? []) {
      t += valores.get(mes) ?? 0;
    }
    return t;
  };
  const somaMeses = (fn: (mes: number) => number) =>
    meses.reduce((s, m) => s + fn(m), 0);

  const resultado = (mes: number) =>
    totalNatureza("receita", mes) -
    totalNatureza("custo", mes) -
    totalNatureza("despesa", mes);

  const temReceita = porNatureza.has("receita");
  const colunasTotais = meses.length + 2;

  return (
    <div className="overflow-x-auto rounded-xl border">
      <table
        className="w-full text-sm"
        style={{ minWidth: 190 + meses.length * 92 + 100 }}
        data-testid="budget-matrix"
      >
        <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
          <tr>
            <th className="sticky left-0 z-10 min-w-[190px] bg-muted px-3 py-2 text-left">Conta</th>
            {meses.map((m) => (
              <th key={m} className="px-3 py-2 text-right">
                {MESES[m - 1]}
              </th>
            ))}
            <th className="px-3 py-2 text-right">Total</th>
          </tr>
        </thead>
        <tbody>
          {SECOES.filter((s) => porNatureza.has(s.natureza)).map((secao) => {
            const contas = [...(porNatureza.get(secao.natureza)?.entries() ?? [])];
            return (
              <SecaoLinhas
                key={secao.natureza}
                titulo={secao.titulo}
                colunas={colunasTotais}
                contas={contas}
                meses={meses}
                totalPorMes={(m) => totalNatureza(secao.natureza, m)}
                totalGeral={somaMeses((m) => totalNatureza(secao.natureza, m))}
                realizado={
                  secao.natureza === "receita" && realizadoReceita
                    ? realizadoReceita
                    : null
                }
              />
            );
          })}
        </tbody>
        {temReceita ? (
          <tfoot>
            <tr className="border-t-2 bg-muted/40 font-semibold">
              <td className="sticky left-0 z-10 bg-muted px-3 py-2">
                Resultado orçado
                <span className="block text-[11px] font-normal text-muted-foreground">
                  receitas − custos − despesas
                </span>
              </td>
              {meses.map((m) => (
                <td key={m} className="px-3 py-2 text-right tabular-nums">
                  {moeda(resultado(m))}
                </td>
              ))}
              <td className="px-3 py-2 text-right tabular-nums">
                {moeda(somaMeses(resultado))}
              </td>
            </tr>
          </tfoot>
        ) : null}
      </table>
    </div>
  );
}

function SecaoLinhas({
  titulo,
  colunas,
  contas,
  meses,
  totalPorMes,
  totalGeral,
  realizado,
}: {
  titulo: string;
  colunas: number;
  contas: [string, Map<number, number>][];
  meses: number[];
  totalPorMes: (mes: number) => number;
  totalGeral: number;
  realizado: Record<number, number> | null;
}) {
  return (
    <>
      <tr className="border-t bg-muted/30">
        <td
          colSpan={colunas}
          className="sticky left-0 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground"
        >
          {titulo}
        </td>
      </tr>
      {contas.map(([rotulo, valores]) => (
        <tr key={rotulo} className="border-t">
          <td className="sticky left-0 z-10 bg-background px-3 py-1.5">{rotulo}</td>
          {meses.map((m) => (
            <td key={m} className="px-3 py-1.5 text-right tabular-nums">
              {moeda(valores.get(m) ?? 0)}
            </td>
          ))}
          <td className="px-3 py-1.5 text-right font-medium tabular-nums">
            {moeda([...valores.values()].reduce((s, v) => s + v, 0))}
          </td>
        </tr>
      ))}
      {contas.length > 1 ? (
        <tr className="border-t font-semibold">
          <td className="sticky left-0 z-10 bg-background px-3 py-1.5">
            Total {titulo.toLowerCase()}
          </td>
          {meses.map((m) => (
            <td key={m} className="px-3 py-1.5 text-right tabular-nums">
              {moeda(totalPorMes(m))}
            </td>
          ))}
          <td className="px-3 py-1.5 text-right tabular-nums">{moeda(totalGeral)}</td>
        </tr>
      ) : null}
      {realizado ? (
        <>
          <tr className="border-t text-emerald-700 dark:text-emerald-400">
            <td className="sticky left-0 z-10 bg-background px-3 py-1.5 font-medium">
              Faturamento realizado
              <span className="block text-[11px] font-normal text-muted-foreground">
                OS faturadas · atualiza a cada lançamento
              </span>
            </td>
            {meses.map((m) => (
              <td key={m} className="px-3 py-1.5 text-right tabular-nums">
                {moeda(realizado[m] ?? 0)}
              </td>
            ))}
            <td className="px-3 py-1.5 text-right font-medium tabular-nums">
              {moeda(meses.reduce((s, m) => s + (realizado[m] ?? 0), 0))}
            </td>
          </tr>
          <tr className={cn("border-t text-xs text-muted-foreground")}>
            <td className="sticky left-0 z-10 bg-background px-3 py-1.5">% da receita orçada</td>
            {meses.map((m) => {
              const orcado = totalPorMes(m);
              const real = realizado[m] ?? 0;
              return (
                <td key={m} className="px-3 py-1.5 text-right tabular-nums">
                  {orcado > 0 && real > 0 ? `${Math.round((real / orcado) * 100)}%` : "—"}
                </td>
              );
            })}
            <td className="px-3 py-1.5 text-right tabular-nums">
              {(() => {
                const orcado = meses.reduce((s, m) => s + totalPorMes(m), 0);
                const real = meses.reduce((s, m) => s + (realizado[m] ?? 0), 0);
                return orcado > 0 && real > 0 ? `${Math.round((real / orcado) * 100)}%` : "—";
              })()}
            </td>
          </tr>
        </>
      ) : null}
    </>
  );
}
