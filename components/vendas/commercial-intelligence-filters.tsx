import Link from "next/link";

import { CommercialClienteTypeahead } from "@/components/vendas/commercial-cliente-typeahead";
import { buttonVariants } from "@/components/ui/button";
import { ciClearHref, ciHref } from "@/lib/vendas/commercial-intelligence-compose";
import { VENDA_STATUS_OPTIONS } from "@/lib/vendas/constants";
import { cn } from "@/lib/utils";

type Props = {
  tenantSlug: string;
  de: string;
  ate: string;
  responsavel?: string;
  origem?: string;
  status?: string;
  cliente?: string;
  clienteLabel?: string | null;
  responsavelOptions: Array<{ id: string; nome: string }>;
  origemOptions: Array<{ value: string; label: string }>;
};

export function CommercialIntelligenceFilters({
  tenantSlug,
  de,
  ate,
  responsavel,
  origem,
  status,
  cliente,
  clienteLabel,
  responsavelOptions,
  origemOptions,
}: Props) {
  return (
    <form
      method="get"
      className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end"
    >
      <label className="space-y-1 text-sm">
        <span className="text-muted-foreground">De</span>
        <input
          type="date"
          name="de"
          defaultValue={de}
          className="block w-full rounded-md border bg-background px-3 py-2"
        />
      </label>
      <label className="space-y-1 text-sm">
        <span className="text-muted-foreground">Até</span>
        <input
          type="date"
          name="ate"
          defaultValue={ate}
          className="block w-full rounded-md border bg-background px-3 py-2"
        />
      </label>
      <label className="space-y-1 text-sm">
        <span className="text-muted-foreground">Responsável comercial</span>
        <select
          name="responsavel"
          defaultValue={responsavel ?? ""}
          className="block w-full min-w-[10rem] rounded-md border bg-background px-3 py-2"
        >
          <option value="">Todos</option>
          {responsavelOptions.map((o) => (
            <option key={o.id} value={o.id}>
              {o.nome}
            </option>
          ))}
        </select>
      </label>
      <label className="space-y-1 text-sm">
        <span className="text-muted-foreground">Origem</span>
        <select
          name="origem"
          defaultValue={origem ?? ""}
          className="block w-full min-w-[10rem] rounded-md border bg-background px-3 py-2"
        >
          <option value="">Todas</option>
          {origemOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
      <label className="space-y-1 text-sm">
        <span className="text-muted-foreground">Status</span>
        <select
          name="status"
          defaultValue={status ?? "all"}
          className="block w-full min-w-[10rem] rounded-md border bg-background px-3 py-2"
        >
          <option value="all">Todos</option>
          {VENDA_STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
      <CommercialClienteTypeahead
        tenantSlug={tenantSlug}
        selectedId={cliente}
        selectedLabel={clienteLabel}
      />
      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          className={cn(buttonVariants({ variant: "default" }), "text-sm")}
        >
          Aplicar
        </button>
        <Link
          href={ciClearHref(tenantSlug)}
          className={cn(buttonVariants({ variant: "outline" }), "text-sm")}
        >
          Limpar
        </Link>
        <Link
          href={ciHref(tenantSlug, { preset: "hoje" })}
          className={cn(buttonVariants({ variant: "ghost" }), "text-sm")}
        >
          Hoje
        </Link>
      </div>
    </form>
  );
}
