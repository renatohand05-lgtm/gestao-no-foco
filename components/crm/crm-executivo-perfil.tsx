import {
  segmentTone,
  type CrmExecPerfil,
} from "@/lib/crm/crm-executivo-compose";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

type Props = {
  perfil: CrmExecPerfil;
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-");
  if (!y || !m || !d) return "—";
  return `${d}/${m}/${y}`;
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-lg border bg-card p-3">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 break-words text-base font-semibold tabular-nums sm:text-lg">
        {value}
      </p>
    </div>
  );
}

export function CrmExecutivoPerfil({ perfil }: Props) {
  const maxEvolucao = Math.max(
    1,
    ...perfil.evolucaoMensal.map((m) => m.value),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-semibold">Resumo Executivo</h2>
        <span
          className={cn(
            "rounded px-2 py-0.5 text-xs font-medium",
            segmentTone(perfil.segmento),
          )}
        >
          {perfil.segmento}
        </span>
        {perfil.recorrente ? (
          <span className="rounded bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-900">
            Recorrente
          </span>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          label="Faturamento total"
          value={formatCurrency(perfil.faturamentoTotal)}
        />
        <Metric label="Quantidade de OS" value={String(perfil.quantidadeOs)} />
        <Metric label="Ticket médio" value={formatCurrency(perfil.ticketMedio)} />
        <Metric label="Veículos" value={String(perfil.veiculos)} />
        <Metric label="Última OS/venda (proxy)" value={formatDate(perfil.ultimaVisita)} />
        <Metric label="Primeira OS/venda (proxy)" value={formatDate(perfil.primeiraVisita)} />
        <Metric
          label="Dias sem retorno"
          value={perfil.diasSemRetorno != null ? String(perfil.diasSemRetorno) : "—"}
        />
        <Metric
          label="Próx. tarefa/agenda (proxy)"
          value={formatDate(perfil.proximaRevisao)}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <section className="rounded-lg border p-4">
          <h3 className="text-sm font-semibold">Serviços mais frequentes</h3>
          {perfil.servicosMaisFrequentes.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">Sem dados.</p>
          ) : (
            <ul className="mt-2 space-y-1.5 text-sm">
              {perfil.servicosMaisFrequentes.map((s) => (
                <li key={s.descricao} className="flex justify-between gap-2">
                  <span className="min-w-0 truncate">{s.descricao}</span>
                  <span className="shrink-0 tabular-nums text-muted-foreground">
                    {s.quantidade}×
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-lg border p-4">
          <h3 className="text-sm font-semibold">Peças mais compradas</h3>
          {perfil.pecasMaisCompradas.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">Sem dados.</p>
          ) : (
            <ul className="mt-2 space-y-1.5 text-sm">
              {perfil.pecasMaisCompradas.map((s) => (
                <li key={s.descricao} className="flex justify-between gap-2">
                  <span className="min-w-0 truncate">{s.descricao}</span>
                  <span className="shrink-0 tabular-nums text-muted-foreground">
                    {s.quantidade}×
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="rounded-lg border p-4">
        <h3 className="text-sm font-semibold">Evolução mensal</h3>
        {perfil.evolucaoMensal.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">Sem faturamento registrado.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {perfil.evolucaoMensal.map((m) => (
              <li key={m.data} className="grid grid-cols-[4rem_1fr_6rem] items-center gap-2 text-sm">
                <span className="text-muted-foreground">{m.label}</span>
                <div className="h-2 overflow-hidden rounded bg-muted">
                  <div
                    className="h-full rounded bg-primary/80"
                    style={{ width: `${Math.max(4, (m.value / maxEvolucao) * 100)}%` }}
                  />
                </div>
                <span className="text-right tabular-nums">
                  {formatCurrency(m.value)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-lg border p-4">
        <h3 className="text-sm font-semibold">Histórico financeiro</h3>
        {perfil.historicoFinanceiro.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">Sem contas vinculadas.</p>
        ) : (
          <ul className="mt-2 divide-y">
            {perfil.historicoFinanceiro.slice(0, 12).map((f) => (
              <li
                key={f.id}
                className="flex min-w-0 flex-col gap-1 py-2 text-sm sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{f.descricao}</p>
                  <p className="text-xs text-muted-foreground">
                    Venc. {formatDate(f.data_vencimento)} · {f.status}
                  </p>
                </div>
                <p className="shrink-0 tabular-nums">{formatCurrency(f.valor)}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-lg border p-4">
        <h3 className="text-sm font-semibold">Ações recomendadas</h3>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
          {perfil.acoesRecomendadas.map((acao) => (
            <li key={acao}>{acao}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}
