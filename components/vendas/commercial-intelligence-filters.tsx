import Link from "next/link";

import { CommercialClienteTypeahead } from "@/components/vendas/commercial-cliente-typeahead";
import { ExecutiveButton, ExecutiveFilterField } from "@/components/executive";
import { NativeSelect } from "@/components/ui/native-select";
import { gofControl } from "@/lib/design-system";
import {
  ciClearHref,
  ciHref,
} from "@/lib/vendas/commercial-intelligence-compose";
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

/**
 * Filtros CI — controles Brand (Gate 19.1). Sem alterar lógica de URL.
 */
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
      <ExecutiveFilterField label="De" htmlFor="ci-de">
        <input
          id="ci-de"
          type="date"
          name="de"
          defaultValue={de}
          className={cn(gofControl, "w-full")}
        />
      </ExecutiveFilterField>
      <ExecutiveFilterField label="Até" htmlFor="ci-ate">
        <input
          id="ci-ate"
          type="date"
          name="ate"
          defaultValue={ate}
          className={cn(gofControl, "w-full")}
        />
      </ExecutiveFilterField>
      <ExecutiveFilterField label="Responsável comercial" htmlFor="ci-resp">
        <NativeSelect
          id="ci-resp"
          name="responsavel"
          defaultValue={responsavel ?? ""}
          className="min-w-[10rem]"
        >
          <option value="">Todos</option>
          {responsavelOptions.map((o) => (
            <option key={o.id} value={o.id}>
              {o.nome}
            </option>
          ))}
        </NativeSelect>
      </ExecutiveFilterField>
      <ExecutiveFilterField label="Origem" htmlFor="ci-origem">
        <NativeSelect
          id="ci-origem"
          name="origem"
          defaultValue={origem ?? ""}
          className="min-w-[10rem]"
        >
          <option value="">Todas</option>
          {origemOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </NativeSelect>
      </ExecutiveFilterField>
      <ExecutiveFilterField label="Status" htmlFor="ci-status">
        <NativeSelect
          id="ci-status"
          name="status"
          defaultValue={status ?? "all"}
          className="min-w-[10rem]"
        >
          <option value="all">Todos</option>
          {VENDA_STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </NativeSelect>
      </ExecutiveFilterField>
      <CommercialClienteTypeahead
        tenantSlug={tenantSlug}
        selectedId={cliente}
        selectedLabel={clienteLabel}
      />
      <div className="flex flex-wrap gap-2">
        <ExecutiveButton type="submit">Aplicar</ExecutiveButton>
        <ExecutiveButton
          variant="outline"
          render={<Link href={ciClearHref(tenantSlug)} />}
        >
          Limpar
        </ExecutiveButton>
        <ExecutiveButton
          variant="ghost"
          render={<Link href={ciHref(tenantSlug, { preset: "hoje" })} />}
        >
          Hoje
        </ExecutiveButton>
      </div>
    </form>
  );
}
