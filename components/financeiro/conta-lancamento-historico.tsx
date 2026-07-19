import { SectionCard } from "@/components/ui/section-card";
import { formatFinanceiroDate } from "@/lib/financeiro/format";
import type { FinanceiroLancamentoEvent } from "@/lib/financeiro/financeiro-eventos";

const ACTION_LABEL: Record<string, string> = {
  criacao: "Criação",
  edicao: "Edição",
  cancelamento: "Cancelamento",
  soft_delete: "Exclusão lógica",
  restauracao: "Restauração",
  pagamento: "Pagamento",
  recebimento: "Recebimento",
  estorno: "Estorno",
  alteracao_valor: "Alteração de valor",
  alteracao_competencia: "Alteração de competência",
  alteracao_categoria: "Alteração de categoria",
  alteracao_centro: "Alteração de centro",
  alteracao_rateio: "Alteração de rateio",
  duplicacao: "Duplicação",
};

type Props = {
  events: FinanceiroLancamentoEvent[];
};

export function ContaLancamentoHistorico({ events }: Props) {
  return (
    <SectionCard
      title="Histórico"
      description="Trilha de auditoria do lançamento (criação, baixa, estorno, cancelamento)."
    >
      <div id="historico" />
      {events.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nenhum evento registrado ainda. Execute a migration de eventos e
          utilize as ações da conta para começar a trilha.
        </p>
      ) : (
        <ol className="space-y-3">
          {events.map((event) => (
            <li
              key={event.id}
              className="rounded-lg border border-border/60 px-3 py-2 text-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium">
                  {ACTION_LABEL[event.action] ?? event.action}
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatFinanceiroDate(event.created_at)}
                </span>
              </div>
              {event.motivo ? (
                <p className="mt-1 text-muted-foreground">Motivo: {event.motivo}</p>
              ) : null}
            </li>
          ))}
        </ol>
      )}
    </SectionCard>
  );
}
