"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { cn } from "@/lib/utils";

export type AbaRhNav = { chave: string; rotulo: string };

/** Subabas de RH (quadro, turnover e absenteísmo, ocorrências) e o filtro de loja, guardados na URL. */
export function RhNav({ basePath, abas, aba, loja, lojas }: { basePath: string; abas: AbaRhNav[]; aba: string; loja: string | null; lojas: { slug: string; nome: string }[] }) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const href = (chave: string) => {
    const p = new URLSearchParams({ aba: chave });
    if (loja) p.set("loja", loja);
    return `${basePath}?${p.toString()}`;
  };
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 rounded-xl border border-border bg-card p-3 print:hidden" aria-busy={pendente}>
      <nav aria-label="Seções de RH" className="flex flex-wrap gap-1">
        {abas.map((a) => (
          <Link
            key={a.chave}
            href={href(a.chave)}
            aria-current={a.chave === aba ? "page" : undefined}
            className={cn("rounded-lg px-3 py-1.5 text-sm font-medium transition-colors", a.chave === aba ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground")}
          >
            {a.rotulo}
          </Link>
        ))}
      </nav>
      <div className="min-w-44 space-y-1">
        <Label htmlFor="rh-loja">Loja</Label>
        <NativeSelect
          id="rh-loja"
          value={loja ?? ""}
          onChange={(e) => {
            const p = new URLSearchParams({ aba });
            if (e.target.value) p.set("loja", e.target.value);
            iniciar(() => router.push(`${basePath}?${p.toString()}`));
          }}
        >
          <option value="">Todas as lojas</option>
          {lojas.map((l) => (
            <option key={l.slug} value={l.slug}>
              {l.nome}
            </option>
          ))}
        </NativeSelect>
      </div>
    </div>
  );
}
