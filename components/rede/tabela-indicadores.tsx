import { StatusPill } from "@/components/rede/status";
import { SectionCard } from "@/components/ui/section-card";
import { formatarValor, textoMeta, type LojaNoPainel } from "@/lib/rede/calculo";
import { ACOMPANHAMENTOS_EXTRA, GRUPOS, INDICADORES } from "@/lib/rede/tipos";

/** Matriz indicador × loja com o semáforo de cada célula e a meta vigente. */
export function TabelaIndicadores({ porLoja, rotuloMes }: { porLoja: LojaNoPainel[]; rotuloMes: string }) {
  if (porLoja.length === 0) return null;
  return (
    <SectionCard title="Metas e indicadores por loja" description={`Mês de referência: ${rotuloMes}. Verde = na meta · amarelo = até 10% fora · vermelho = mais de 10% fora.`} contentClassName="overflow-x-auto">
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs text-muted-foreground">
            <th className="py-2 pr-3 font-medium">Indicador</th>
            <th className="py-2 pr-3 font-medium">Meta</th>
            {porLoja.map((p) => (
              <th key={p.loja.id} className="px-2 py-2 text-right font-medium">
                {p.loja.nome}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {GRUPOS.map((g) => {
            const defs = INDICADORES.filter((d) => d.grupo === g);
            const extras = ACOMPANHAMENTOS_EXTRA[g];
            if (defs.length === 0 && extras.length === 0) return null;
            return (
              <GrupoLinhas key={g} grupo={g} colunas={porLoja.length + 2}>
                {defs.map((d) => {
                  const ref = porLoja[0].avaliacoes.find((a) => a.k === d.k);
                  return (
                    <tr key={d.k} className="border-b border-border/60 last:border-0">
                      <td className="py-2 pr-3">
                        <span className="font-medium">{d.nome}</span>
                        <span className="ml-1.5 text-xs text-muted-foreground">{d.frequencia.toLowerCase()}</span>
                      </td>
                      <td className="py-2 pr-3 text-xs text-muted-foreground">{textoMeta(d.formato, ref?.meta ?? null, ref?.direcao ?? null)}</td>
                      {porLoja.map((p) => {
                        const a = p.avaliacoes.find((x) => x.k === d.k)!;
                        return (
                          <td key={p.loja.id} className="px-2 py-2 text-right">
                            <StatusPill status={a.status}>{formatarValor(d.formato, a.valor)}</StatusPill>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
                {extras.map(([nome, descricao]) => (
                  <tr key={nome} className="border-b border-border/60 last:border-0">
                    <td className="py-2 pr-3 font-medium">{nome}</td>
                    <td className="py-2 pr-3 text-xs text-muted-foreground" colSpan={porLoja.length + 1}>
                      {descricao} — acompanhamento sem meta numérica
                    </td>
                  </tr>
                ))}
              </GrupoLinhas>
            );
          })}
        </tbody>
      </table>
    </SectionCard>
  );
}

function GrupoLinhas({ grupo, colunas, children }: { grupo: string; colunas: number; children: React.ReactNode }) {
  return (
    <>
      <tr>
        <th colSpan={colunas} className="pt-4 pb-1 text-left text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          {grupo}
        </th>
      </tr>
      {children}
    </>
  );
}
