import { SectionCard } from "@/components/ui/section-card";
import { brl, pct1 } from "@/lib/rede/calculo";
import { CHAVE_DRE, DRE_LINHAS, type DreCalc, type LinhaDre } from "@/lib/rede/financeiro";
import type { LinhaDreKey } from "@/lib/rede/tipos";
import { cn } from "@/lib/utils";

export type ColunaDre = { nome: string; d: DreCalc; estimadas: LinhaDreKey[] | null; /** true = soma das lojas */ rede?: boolean };

const CHAVE_POR_LINHA = new Map<LinhaDre, LinhaDreKey>(Object.entries(CHAVE_DRE).map(([k, v]) => [v, k as LinhaDreKey]));

/** DRE loja a loja e da rede. Valores em itálico são estimativas pela premissa (não são despesas lançadas). */
export function TabelaDre({ colunas, titulo, descricao }: { colunas: ColunaDre[]; titulo: string; descricao: string }) {
  return (
    <SectionCard title={titulo} description={descricao}>
      {colunas.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhuma loja com vendas no mês.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-border text-xs text-muted-foreground">
                <th className="py-2 pr-3 text-left font-medium">Linha</th>
                {colunas.map((c) => (
                  <th key={c.nome} className="px-2 py-2 text-right font-medium" colSpan={2}>
                    {c.nome}
                    {c.estimadas && c.estimadas.length > 0 ? <span className="block text-[10px] font-normal text-amber-700 dark:text-amber-400">{c.estimadas.length} linhas estimadas</span> : null}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {DRE_LINHAS.map((l) => {
                const chave = CHAVE_POR_LINHA.get(l.k);
                return (
                  <tr key={l.k} className={cn("border-b border-border/60 last:border-0", (l.tipo === "tot" || l.tipo === "res") && "font-semibold", l.tipo === "res" && "bg-muted/40")}>
                    <td className={cn("py-2 pr-3", l.tipo === "sub" && "pl-4 text-muted-foreground")}>{l.nome}</td>
                    {colunas.map((c) => {
                      const v = c.d[l.k];
                      const estimada = chave != null && c.estimadas?.includes(chave);
                      const neg = l.tipo === "res" && v < 0;
                      return (
                        <Celula key={c.nome} valor={v} fat={c.d.fat} estimada={!!estimada} negativo={neg} />
                      );
                    })}
                  </tr>
                );
              })}
              <tr className="border-t border-border text-muted-foreground">
                <td className="py-2 pr-3">Ponto de equilíbrio (faturamento)</td>
                {colunas.map((c) => (
                  <td key={c.nome} className="px-2 py-2 text-right tabular-nums" colSpan={2}>
                    {c.d.pe != null ? brl(c.d.pe) : "—"}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-3 text-xs text-muted-foreground">Em itálico: estimativa pela premissa (não é despesa efetivamente paga). Linhas sem itálico vêm de lançamento real, das contagens de CMV, de indicador ou de venda.</p>
    </SectionCard>
  );
}

function Celula({ valor, fat, estimada, negativo }: { valor: number; fat: number; estimada: boolean; negativo: boolean }) {
  return (
    <>
      <td className={cn("px-2 py-2 text-right tabular-nums", estimada && "italic text-muted-foreground", negativo && "text-red-600 dark:text-red-400")} title={estimada ? "Estimativa pela premissa — não é despesa efetivamente paga" : undefined}>
        {brl(valor)}
      </td>
      <td className="px-1 py-2 text-right text-xs tabular-nums text-muted-foreground">{fat > 0 ? pct1((valor / fat) * 100) : "—"}</td>
    </>
  );
}

