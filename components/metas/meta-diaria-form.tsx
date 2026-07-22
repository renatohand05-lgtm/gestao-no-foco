"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { upsertMetaDiariaAction } from "@/lib/metas/meta-diaria-actions";

type Props = {
  tenantSlug: string;
  defaultDate: string;
};

export function MetaDiariaForm({ tenantSlug, defaultDate }: Props) {
  const [data, setData] = useState(defaultDate);
  const [valor, setValor] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="grid gap-3 rounded-lg border p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
      onSubmit={(e) => {
        e.preventDefault();
        setMessage(null);
        startTransition(async () => {
          const result = await upsertMetaDiariaAction(tenantSlug, {
            data,
            valor_meta: Number(valor.replace(",", ".")),
          });
          if (result.success) {
            setMessage("Meta diária salva (histórico preservado).");
            setValor("");
          } else {
            setMessage(result.error ?? "Falha ao salvar.");
          }
        });
      }}
    >
      <div className="space-y-1.5">
        <Label htmlFor="meta-dia-data">Meta diária — data</Label>
        <Input
          id="meta-dia-data"
          type="date"
          value={data}
          onChange={(e) => setData(e.target.value)}
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="meta-dia-valor">Valor (R$)</Label>
        <Input
          id="meta-dia-valor"
          inputMode="decimal"
          placeholder="Ex.: 3500"
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          required
        />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Salvando…" : "Salvar meta do dia"}
      </Button>
      {message ? (
        <p className="sm:col-span-3 text-xs text-muted-foreground">{message}</p>
      ) : (
        <p className="sm:col-span-3 text-xs text-muted-foreground">
          Sem meta diária manual, o dashboard rateia a meta mensal pelos dias
          úteis. Edição por data não apaga o histórico (soft-delete).
        </p>
      )}
    </form>
  );
}
