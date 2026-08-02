"use client";

import { useMemo, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  deactivateSelectedServicesAction,
  softDeleteSelectedServicesAction,
} from "@/lib/produtos/service-bulk-actions";
import type { ServiceManagementRow } from "@/lib/produtos/service-bulk-service";
import { formatCurrency } from "@/lib/format";

type Props = {
  tenantSlug: string;
  services: ServiceManagementRow[];
  arquivavelIds: string[];
};

export function ServiceBulkPanel({
  tenantSlug,
  services,
  arquivavelIds,
}: Props) {
  const used = useMemo(() => new Set(arquivavelIds), [arquivavelIds]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const ids = [...selected];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={pending || ids.length === 0}
          onClick={() =>
            startTransition(async () => {
              const r = await softDeleteSelectedServicesAction({
                tenantSlug,
                ids,
              });
              setMsg(`${r.count} serviço(s) excluídos logicamente (sem uso).`);
              setSelected(new Set());
            })
          }
        >
          Excluir selecionados (sem uso)
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={pending || ids.length === 0}
          onClick={() =>
            startTransition(async () => {
              const r = await deactivateSelectedServicesAction({
                tenantSlug,
                ids,
              });
              setMsg(`${r.count} serviço(s) desativados.`);
              setSelected(new Set());
            })
          }
        >
          Desativar selecionados
        </Button>
      </div>
      {msg ? <p className="text-sm text-muted-foreground">{msg}</p> : null}
      <div className="overflow-x-auto rounded-lg border border-border/60">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-2 py-2" />
              <th className="px-2 py-2">Serviço</th>
              <th className="px-2 py-2">Origem</th>
              <th className="px-2 py-2">Custo</th>
              <th className="px-2 py-2">Preço</th>
              <th className="px-2 py-2">Status</th>
              <th className="px-2 py-2">Uso</th>
            </tr>
          </thead>
          <tbody>
            {services.map((s) => (
              <tr key={s.id} className="border-t border-border/40">
                <td className="px-2 py-2">
                  <input
                    type="checkbox"
                    checked={selected.has(s.id)}
                    onChange={() => toggle(s.id)}
                    aria-label={`Selecionar ${s.nome}`}
                  />
                </td>
                <td className="px-2 py-2">
                  <div className="font-medium">{s.nome}</div>
                  <div className="text-xs text-muted-foreground">
                    {s.codigo_interno ?? s.sku ?? "—"}
                  </div>
                </td>
                <td className="px-2 py-2 text-xs uppercase">
                  {s.origem}
                  {s.importRunId ? ` · ${s.importRunId.slice(0, 8)}` : ""}
                </td>
                <td className="px-2 py-2 tabular-nums">
                  {s.custo == null ? "—" : formatCurrency(s.custo)}
                </td>
                <td className="px-2 py-2 tabular-nums">
                  {s.preco_venda == null ? "—" : formatCurrency(s.preco_venda)}
                </td>
                <td className="px-2 py-2">{s.ativo ? "Ativo" : "Inativo"}</td>
                <td className="px-2 py-2">
                  {used.has(s.id) ? "Com dependência" : "Livre"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
