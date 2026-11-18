"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Input } from "@/components/ui/input";
import { dataValida, paraQuery, type FiltrosRede, type ModoPeriodo } from "@/lib/rede/filtros";

type Props = {
  basePath: string;
  filtros: FiltrosRede;
  lojas: { slug: string; nome: string }[];
  /** Mostra o seletor de loja (telas que filtram por loja). */
  comLoja?: boolean;
  /** Modos de período aceitos pela tela. */
  modos?: ModoPeriodo[];
};

export function FiltrosRedeBarra({ basePath, filtros, lojas, comLoja = true, modos = ["mes", "ano", "intervalo"] }: Props) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();

  const ir = (mudanca: Partial<FiltrosRede>) => {
    const proximo = { ...filtros, ...mudanca };
    iniciar(() => router.push(`${basePath}${paraQuery(proximo)}`));
  };

  const anoAtual = Number(filtros.ano);
  const anos = Array.from({ length: 6 }, (_, i) => String(anoAtual - 3 + i));

  return (
    <form
      className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-card p-3"
      aria-busy={pendente}
      onSubmit={(e) => e.preventDefault()}
    >
      {comLoja ? (
        <div className="min-w-40 space-y-1">
          <Label htmlFor="f-loja">Loja</Label>
          <NativeSelect id="f-loja" value={filtros.loja ?? ""} onChange={(e) => ir({ loja: e.target.value || null })}>
            <option value="">Rede toda</option>
            {lojas.map((l) => (
              <option key={l.slug} value={l.slug}>
                {l.nome}
              </option>
            ))}
          </NativeSelect>
        </div>
      ) : null}

      {modos.length > 1 ? (
        <div className="min-w-32 space-y-1">
          <Label htmlFor="f-periodo">Período</Label>
          <NativeSelect id="f-periodo" value={filtros.modo} onChange={(e) => ir({ modo: e.target.value as ModoPeriodo })}>
            {modos.includes("mes") ? <option value="mes">Mês</option> : null}
            {modos.includes("ano") ? <option value="ano">Ano</option> : null}
            {modos.includes("intervalo") ? <option value="intervalo">Datas</option> : null}
          </NativeSelect>
        </div>
      ) : null}

      {filtros.modo === "mes" ? (
        <div className="space-y-1">
          <Label htmlFor="f-mes">Mês</Label>
          <Input id="f-mes" type="month" value={filtros.mes} onChange={(e) => /^\d{4}-\d{2}$/.test(e.target.value) && ir({ mes: e.target.value })} className="w-40" />
        </div>
      ) : null}

      {filtros.modo === "ano" ? (
        <div className="min-w-24 space-y-1">
          <Label htmlFor="f-ano">Ano</Label>
          <NativeSelect id="f-ano" value={filtros.ano} onChange={(e) => ir({ ano: e.target.value })}>
            {anos.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </NativeSelect>
        </div>
      ) : null}

      {filtros.modo === "intervalo" ? (
        <>
          <div className="space-y-1">
            <Label htmlFor="f-de">De</Label>
            <Input id="f-de" type="date" value={filtros.de} onChange={(e) => dataValida(e.target.value) && ir({ de: e.target.value })} className="w-40" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="f-ate">Até</Label>
            <Input id="f-ate" type="date" value={filtros.ate} onChange={(e) => dataValida(e.target.value) && ir({ ate: e.target.value })} className="w-40" />
          </div>
        </>
      ) : null}

      {pendente ? <span className="pb-2 text-xs text-muted-foreground">Atualizando…</span> : null}
    </form>
  );
}
