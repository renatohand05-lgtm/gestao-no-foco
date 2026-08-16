import { RETURN_STATUS_LABELS } from "@/lib/retention/returns";
import type { CustomerReturnRow } from "@/lib/retention/types";
import type { OutboxRow } from "@/lib/retention/types";

type Props = {
  returns: CustomerReturnRow[];
  messages: OutboxRow[];
};

export function ReturnHistoryList({ returns, messages }: Props) {
  if (returns.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Nenhum retorno previsto registrado para este cliente.
      </p>
    );
  }
  return (
    <ul className="space-y-3" data-phase35="return-history">
      {returns.map((row) => {
        const related = messages.filter((m) => m.entity_id === row.id);
        return (
          <li key={row.id} className="rounded-lg border p-3 text-sm">
            <div className="font-medium">
              {row.motivo ?? "Retorno"} · {row.due_at}
            </div>
            <div className="text-xs text-muted-foreground">
              Status:{" "}
              {RETURN_STATUS_LABELS[
                row.status as keyof typeof RETURN_STATUS_LABELS
              ] ?? row.status}{" "}
              · origem {row.regra_origem ?? "—"}
              {row.placa ? ` · ${row.placa}` : ""}
            </div>
            {related.length > 0 ? (
              <ul className="mt-2 space-y-1 text-xs">
                {related.map((m) => (
                  <li key={m.id}>
                    {m.channel} · {m.template_code} · {m.status}
                    {m.rendered_preview
                      ? ` — ${m.rendered_preview.slice(0, 80)}`
                      : ""}
                  </li>
                ))}
              </ul>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
