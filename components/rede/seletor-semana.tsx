"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { somarDias } from "@/lib/rede/calculo";
import { dataValida } from "@/lib/rede/filtros";
import { segundaDaSemana } from "@/lib/rede/financeiro";

const ddmmaa = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;

/** Semana de contagem (segunda a domingo) e loja, na URL. Qualquer data escolhida vira a segunda da semana. */
export function SeletorSemana({ basePath, semana, hoje, loja, lojas }: { basePath: string; semana: string; hoje: string; loja: string | null; lojas: { slug: string; nome: string }[] }) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const ir = (s: string, l: string | null) => {
    const p = new URLSearchParams({ semana: s });
    if (l) p.set("loja", l);
    iniciar(() => router.push(`${basePath}?${p.toString()}`));
  };
  const segundaAtual = segundaDaSemana(hoje);
  return (
    <form className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-card p-3" aria-busy={pendente} onSubmit={(e) => e.preventDefault()}>
      <div className="space-y-1">
        <Label htmlFor="sem-data">Semana (começa na segunda)</Label>
        <div className="flex items-center gap-1">
          <Button type="button" variant="outline" size="icon-sm" aria-label="Semana anterior" onClick={() => ir(somarDias(semana, -7), loja)}>
            <ChevronLeft aria-hidden />
          </Button>
          <Input id="sem-data" type="date" className="w-40" value={semana} max={hoje} onChange={(e) => dataValida(e.target.value) && ir(segundaDaSemana(e.target.value), loja)} />
          <Button type="button" variant="outline" size="icon-sm" aria-label="Próxima semana" disabled={semana >= segundaAtual} onClick={() => ir(somarDias(semana, 7), loja)}>
            <ChevronRight aria-hidden />
          </Button>
        </div>
      </div>
      <p className="pb-2 text-sm text-muted-foreground tabular-nums">
        {ddmmaa(semana)} a {ddmmaa(somarDias(semana, 6))}
      </p>
      <div className="min-w-40 space-y-1">
        <Label htmlFor="sem-loja">Loja</Label>
        <NativeSelect id="sem-loja" value={loja ?? ""} onChange={(e) => ir(semana, e.target.value || null)}>
          <option value="">Rede toda</option>
          {lojas.map((l) => (
            <option key={l.slug} value={l.slug}>
              {l.nome}
            </option>
          ))}
        </NativeSelect>
      </div>
      {pendente ? <span className="pb-2 text-xs text-muted-foreground">Atualizando…</span> : null}
    </form>
  );
}
