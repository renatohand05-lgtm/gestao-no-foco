"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";

/** Ano (metas de faturamento) e mês (indicadores) na mesma barra, preservando um ao mudar o outro. */
export function SeletorAnoMes({ basePath, ano, mes }: { basePath: string; ano: string; mes: string }) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const ir = (a: string, m: string) => iniciar(() => router.push(`${basePath}?ano=${a}&mes=${m}`));
  const base = Number(ano);
  const anos = Array.from({ length: 6 }, (_, i) => String(base - 3 + i));
  return (
    <form className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-card p-3" aria-busy={pendente} onSubmit={(e) => e.preventDefault()}>
      <div className="min-w-28 space-y-1">
        <Label htmlFor="s-ano">Ano das metas de faturamento</Label>
        <NativeSelect id="s-ano" value={ano} onChange={(e) => ir(e.target.value, mes)}>
          {anos.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </NativeSelect>
      </div>
      <div className="space-y-1">
        <Label htmlFor="s-mes">Mês dos indicadores</Label>
        <Input id="s-mes" type="month" className="w-40" value={mes} onChange={(e) => /^\d{4}-\d{2}$/.test(e.target.value) && ir(ano, e.target.value)} />
      </div>
      {pendente ? <span className="pb-2 text-xs text-muted-foreground">Atualizando…</span> : null}
    </form>
  );
}
