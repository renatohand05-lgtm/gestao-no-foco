import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { escClearHref } from "@/lib/estoque/executive-stock-compose";
import { cn } from "@/lib/utils";

type Props = {
  tenantSlug: string;
  categoria?: string;
  fornecedor?: string;
  criticidade?: string;
  saldo?: string;
  movimentacao?: string;
  q?: string;
  categorias: string[];
  fornecedores: string[];
};

export function ExecutiveStockFilters({
  tenantSlug,
  categoria,
  fornecedor,
  criticidade,
  saldo,
  movimentacao,
  q,
  categorias,
  fornecedores,
}: Props) {
  return (
    <form
      method="get"
      className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end"
    >
      <label className="space-y-1 text-sm min-w-0 flex-1 sm:max-w-xs">
        <span className="text-muted-foreground">Pesquisa</span>
        <input
          type="search"
          name="q"
          defaultValue={q ?? ""}
          placeholder="Nome, SKU, categoria…"
          className="block w-full rounded-md border bg-background px-3 py-2"
        />
      </label>
      <label className="space-y-1 text-sm">
        <span className="text-muted-foreground">Categoria</span>
        <select
          name="categoria"
          defaultValue={categoria ?? "all"}
          className="block w-full min-w-[10rem] rounded-md border bg-background px-3 py-2"
        >
          <option value="all">Todas</option>
          {categorias.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </label>
      <label className="space-y-1 text-sm">
        <span className="text-muted-foreground">Fornecedor</span>
        <select
          name="fornecedor"
          defaultValue={fornecedor ?? "all"}
          className="block w-full min-w-[10rem] rounded-md border bg-background px-3 py-2"
        >
          <option value="all">Todos</option>
          {fornecedores.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>
      </label>
      <label className="space-y-1 text-sm">
        <span className="text-muted-foreground">Criticidade</span>
        <select
          name="criticidade"
          defaultValue={criticidade ?? "all"}
          className="block w-full min-w-[10rem] rounded-md border bg-background px-3 py-2"
        >
          <option value="all">Todas</option>
          <option value="critico">Críticos</option>
          <option value="abaixo_minimo">Abaixo do mínimo</option>
          <option value="zerado">Zerados</option>
          <option value="parado">Parados</option>
        </select>
      </label>
      <label className="space-y-1 text-sm">
        <span className="text-muted-foreground">Saldo</span>
        <select
          name="saldo"
          defaultValue={saldo ?? "all"}
          className="block w-full min-w-[8rem] rounded-md border bg-background px-3 py-2"
        >
          <option value="all">Todos</option>
          <option value="positivo">Positivo</option>
          <option value="zero">Zero</option>
          <option value="negativo">Negativo</option>
        </select>
      </label>
      <label className="space-y-1 text-sm">
        <span className="text-muted-foreground">Movimentação (90d)</span>
        <select
          name="movimentacao"
          defaultValue={movimentacao ?? "all"}
          className="block w-full min-w-[8rem] rounded-md border bg-background px-3 py-2"
        >
          <option value="all">Todas</option>
          <option value="com">Com movimento</option>
          <option value="sem">Sem movimento</option>
        </select>
      </label>
      <div className="flex gap-2">
        <button type="submit" className={cn(buttonVariants({ size: "sm" }))}>
          Aplicar
        </button>
        <Link
          href={escClearHref(tenantSlug)}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          Limpar filtros
        </Link>
      </div>
    </form>
  );
}
