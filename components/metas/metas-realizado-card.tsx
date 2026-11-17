import Link from "next/link";

import { SectionCard } from "@/components/ui/section-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatPercent } from "@/lib/format";
import {
  resumirMetas,
  statusDaMeta,
  type MetaRealizadoMes,
  type MetaStatus,
} from "@/lib/metas/metas-realizado";

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

const STATUS_VISUAL: Record<
  MetaStatus,
  {
    label: string;
    /** Versão curta para o celular. */
    curto: string;
    variant: "success" | "warning" | "danger" | "default" | "secondary";
  }
> = {
  batida: { label: "Meta batida", curto: "Batida", variant: "success" },
  atencao: { label: "Atenção", curto: "Atenção", variant: "warning" },
  abaixo: { label: "Abaixo da meta", curto: "Abaixo", variant: "danger" },
  em_andamento: { label: "Em andamento", curto: "Andamento", variant: "default" },
  a_comecar: { label: "A começar", curto: "A começar", variant: "secondary" },
  sem_meta: { label: "Sem meta", curto: "Sem meta", variant: "secondary" },
};

const reaisInteiros = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});

/** Valores cheios (sem centavos) para caber no celular. */
function formatCurrency(value: number | null) {
  return value === null ? "—" : reaisInteiros.format(value);
}

function rotuloMes(competencia: string) {
  const mes = Number(competencia.slice(5, 7));
  return `${MESES[mes - 1]}/${competencia.slice(2, 4)}`;
}

function trimestreDe(competencia: string) {
  return Math.ceil(Number(competencia.slice(5, 7)) / 3);
}

type Grupo = { ano: string; linhas: MetaRealizadoMes[] };

function agruparPorAno(linhas: MetaRealizadoMes[]): Grupo[] {
  const mapa = new Map<string, MetaRealizadoMes[]>();
  for (const l of linhas) {
    if (l.meta === null) continue;
    const ano = l.competencia.slice(0, 4);
    mapa.set(ano, [...(mapa.get(ano) ?? []), l]);
  }
  return [...mapa.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([ano, ls]) => ({ ano, linhas: ls }));
}

type Props = {
  tenantSlug: string;
  linhas: MetaRealizadoMes[];
  /** Data civil de hoje (YYYY-MM-DD) no fuso da empresa. */
  hoje: string;
};

/**
 * Metas mensais de faturamento × realizado (OS faturadas). A meta é a do módulo
 * Metas de Vendas; o realizado é o mesmo do Painel Executivo.
 */
export function MetasRealizadoCard({ tenantSlug, linhas, hoje }: Props) {
  const grupos = agruparPorAno(linhas);

  return (
    <SectionCard
      title="Metas de faturamento × realizado"
      description="Meta de cada mês (módulo Metas de Vendas) contra o faturamento das OS faturadas. Atualiza sozinho a cada OS lançada e é o mesmo número do Painel Executivo."
    >
      <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
        <Link
          href={`/${tenantSlug}/configuracoes/metas`}
          className="text-primary underline-offset-4 hover:underline"
        >
          Ver ou editar metas
        </Link>
        <Link
          href={`/${tenantSlug}/painel-executivo`}
          className="text-primary underline-offset-4 hover:underline"
        >
          Abrir Painel Executivo
        </Link>
      </div>

      {grupos.length === 0 ? (
        <p className="text-sm text-muted-foreground" data-testid="metas-realizado-vazio">
          Nenhuma meta mensal cadastrada ainda. Cadastre em Configurações → Metas
          de Vendas e o acompanhamento aparece aqui.
        </p>
      ) : (
        <div className="space-y-5">
          {grupos.map((g) => {
            const linhasTabela: React.ReactNode[] = [];
            g.linhas.forEach((l, i) => {
              const status = statusDaMeta(l, hoje);
              const visual = STATUS_VISUAL[status];
              const atingido = l.meta ? (l.realizado / l.meta) * 100 : null;
              linhasTabela.push(
                <tr key={l.competencia} className="border-t">
                  <td className="px-2 py-2 font-medium sm:px-3">
                    {rotuloMes(l.competencia)}
                    <span className="mt-1 block sm:hidden">
                      <StatusBadge
                        label={visual.curto}
                        variant={visual.variant}
                        className="px-1.5 py-0 text-[10px]"
                      />
                    </span>
                  </td>
                  <td className="px-2 py-2 text-right tabular-nums sm:px-3">
                    {formatCurrency(l.meta)}
                  </td>
                  <td className="px-2 py-2 text-right tabular-nums sm:px-3">
                    {l.realizado > 0 ? formatCurrency(l.realizado) : "—"}
                  </td>
                  <td className="px-2 py-2 text-right tabular-nums sm:px-3">
                    {l.realizado > 0 ? formatPercent(atingido, 0) : "—"}
                  </td>
                  <td className="hidden px-3 py-2 text-right tabular-nums sm:table-cell">
                    {l.carros > 0 ? l.carros : "—"}
                  </td>
                  <td className="hidden px-3 py-2 sm:table-cell">
                    <StatusBadge label={visual.label} variant={visual.variant} />
                  </td>
                </tr>,
              );

              const proxima = g.linhas[i + 1];
              const fechaTrimestre =
                !proxima || trimestreDe(proxima.competencia) !== trimestreDe(l.competencia);
              if (fechaTrimestre) {
                const tri = g.linhas.filter(
                  (x) => trimestreDe(x.competencia) === trimestreDe(l.competencia),
                );
                if (tri.length > 1) {
                  const r = resumirMetas(tri);
                  linhasTabela.push(
                    <tr
                      key={`tri-${trimestreDe(l.competencia)}`}
                      className="border-t bg-muted/40 text-xs font-semibold"
                    >
                      <td className="px-2 py-2 sm:px-3">
                        {trimestreDe(l.competencia)}º tri {g.ano}
                      </td>
                      <td className="px-2 py-2 text-right tabular-nums sm:px-3">
                        {formatCurrency(r.meta)}
                      </td>
                      <td className="px-2 py-2 text-right tabular-nums sm:px-3">
                        {r.realizado > 0 ? formatCurrency(r.realizado) : "—"}
                      </td>
                      <td className="px-2 py-2 text-right tabular-nums sm:px-3">
                        {r.atingido !== null && r.realizado > 0
                          ? formatPercent(r.atingido * 100, 0)
                          : "—"}
                      </td>
                      <td className="hidden px-3 py-2 text-right tabular-nums sm:table-cell">
                        {r.carros > 0 ? r.carros : "—"}
                      </td>
                      <td className="hidden px-3 py-2 text-muted-foreground sm:table-cell">
                        {r.realizado > 0 ? `Falta ${formatCurrency(r.falta)}` : ""}
                      </td>
                    </tr>,
                  );
                }
              }
            });

            const total = resumirMetas(g.linhas);
            return (
              <div key={g.ano} className="overflow-x-auto rounded-xl border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="px-2 py-2 sm:px-3">{g.ano}</th>
                      <th className="px-2 py-2 text-right sm:px-3">Meta</th>
                      <th className="px-2 py-2 text-right sm:px-3">Realizado</th>
                      <th className="px-2 py-2 text-right sm:px-3">%</th>
                      <th className="hidden px-3 py-2 text-right sm:table-cell">Carros</th>
                      <th className="hidden px-3 py-2 sm:table-cell">Situação</th>
                    </tr>
                  </thead>
                  <tbody>{linhasTabela}</tbody>
                  <tfoot>
                    <tr className="border-t-2 bg-muted/40 font-semibold">
                      <td className="px-2 py-2 sm:px-3">Total {g.ano}</td>
                      <td className="px-2 py-2 text-right tabular-nums sm:px-3">
                        {formatCurrency(total.meta)}
                      </td>
                      <td className="px-2 py-2 text-right tabular-nums sm:px-3">
                        {total.realizado > 0 ? formatCurrency(total.realizado) : "—"}
                      </td>
                      <td className="px-2 py-2 text-right tabular-nums sm:px-3">
                        {total.atingido !== null && total.realizado > 0
                          ? formatPercent(total.atingido * 100, 0)
                          : "—"}
                      </td>
                      <td className="hidden px-3 py-2 text-right tabular-nums sm:table-cell">
                        {total.carros > 0 ? total.carros : "—"}
                      </td>
                      <td className="hidden px-3 py-2 sm:table-cell" />
                    </tr>
                  </tfoot>
                </table>
              </div>
            );
          })}
        </div>
      )}
    </SectionCard>
  );
}
