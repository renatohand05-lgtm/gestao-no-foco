"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { cn } from "@/lib/utils";

export type AbaCozinhaNav = { chave: string; rotulo: string };

/** Subabas da cozinha central (Rupturas | Estoque da cozinha central) e o filtro de loja, na URL. */
export function CozinhaNav({ basePath, abas, aba, loja, lojas }: { basePath: string; abas: AbaCozinhaNav[]; aba: string; loja: string | null; lojas: { slug: string; nome: string }[] }) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const comLoja = aba === "rupturas";
  const href = (chave: string) => {
    const p = new URLSearchParams({ aba: chave });
    if (loja && chave === "rupturas") p.set("loja", loja);
    return `${basePath}?${p.toString()}`;
  };
  return (
    <div className="flex flex-wrap items-end justify-between gap-3 rounded-xl border border-border bg-card p-3" aria-busy={pendente}>
      <nav aria-label="Seções da cozinha central" className="flex gap-1">
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
      {comLoja ? (
        <div className="min-w-40 space-y-1">
          <Label htmlFor="coz-loja">Loja</Label>
          <NativeSelect
            id="coz-loja"
            value={loja ?? ""}
            onChange={(e) => {
              const p = new URLSearchParams({ aba });
              if (e.target.value) p.set("loja", e.target.value);
              iniciar(() => router.push(`${basePath}?${p.toString()}`));
            }}
          >
            <option value="">Rede toda</option>
            {lojas.map((l) => (
              <option key={l.slug} value={l.slug}>
                {l.nome}
              </option>
            ))}
          </NativeSelect>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">O estoque é da cozinha central (único para a rede toda).</p>
      )}
    </div>
  );
}

/** Filtro de loja simples (usado na tela do checklist de delivery). */
export function FiltroLoja({ basePath, loja, lojas }: { basePath: string; loja: string | null; lojas: { slug: string; nome: string }[] }) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  return (
    <div className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-card p-3" aria-busy={pendente}>
      <div className="min-w-48 space-y-1">
        <Label htmlFor="flt-loja">Histórico da loja</Label>
        <NativeSelect id="flt-loja" value={loja ?? ""} onChange={(e) => iniciar(() => router.push(e.target.value ? `${basePath}?loja=${encodeURIComponent(e.target.value)}` : basePath))}>
          <option value="">Rede toda</option>
          {lojas.map((l) => (
            <option key={l.slug} value={l.slug}>
              {l.nome}
            </option>
          ))}
        </NativeSelect>
      </div>
      {pendente ? <span className="pb-2 text-xs text-muted-foreground">Atualizando…</span> : null}
    </div>
  );
}
