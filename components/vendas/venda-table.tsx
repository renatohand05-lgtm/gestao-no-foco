import Link from "next/link";

import { gofCardSurface } from "@/lib/design-system/primitives";
import { cn } from "@/lib/utils";
import { VendaRowActions } from "@/components/vendas/venda-row-actions";
import { VendaStatusBadge } from "@/components/vendas/venda-status-badge";
import {
  DataTable,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/data-table";
import {
  formatCurrency,
  formatVendaDate,
  formatVendaDateTime,
  formatVendaNumero,
} from "@/lib/vendas/format";
import type { VendaListItem } from "@/types/vendas";

type VendaTableProps = {
  tenantSlug: string;
  vendas: VendaListItem[];
};

export function VendaTable({ tenantSlug, vendas }: VendaTableProps) {
  return (
    <>
      <ul className="space-y-3 md:hidden" aria-label="Lista de vendas">
        {vendas.map((venda) => (
          <li key={venda.id} className={cn(gofCardSurface, "relative p-0")}>
            <Link
              href={`/${tenantSlug}/vendas/${venda.id}`}
              className="block rounded-t-[inherit] p-4 pb-3 active:bg-white/[0.04]"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xl font-extrabold leading-none tracking-tight text-[var(--brand-gold)]">
                  {formatVendaNumero(venda.numero)}
                </span>
                <VendaStatusBadge status={venda.status} />
              </div>
              <p className="mt-2.5 truncate text-base font-semibold">
                {venda.cliente.nome}
              </p>
              {venda.cliente.documento ? (
                <p className="text-xs text-muted-foreground">
                  {venda.cliente.documento}
                </p>
              ) : null}
              <dl className="mt-3 flex items-end justify-between gap-3 border-t border-border/50 pt-3">
                <div>
                  <dt className="text-xs text-muted-foreground">Total</dt>
                  <dd className="text-lg font-bold tabular-nums">
                    {formatCurrency(venda.total)}
                  </dd>
                </div>
                <div className="text-right">
                  <dt className="text-xs text-muted-foreground">Data</dt>
                  <dd className="text-base font-semibold tabular-nums">
                    {formatVendaDate(venda.data_venda)}
                  </dd>
                </div>
              </dl>
            </Link>
            <div className="flex items-center justify-between gap-2 border-t border-border/50 py-1 pl-4 pr-2">
              <p className="text-xs text-muted-foreground">
                Cadastro {formatVendaDateTime(venda.created_at)}
              </p>
              <VendaRowActions
                tenantSlug={tenantSlug}
                venda={venda}
                triggerClassName="size-11"
              />
            </div>
          </li>
        ))}
      </ul>

      <DataTable className="max-md:hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Número</TableHead>
            <TableHead>Cliente</TableHead>
            <TableHead className="hidden sm:table-cell">Data</TableHead>
            <TableHead className="hidden md:table-cell">Total</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="hidden xl:table-cell">Cadastro</TableHead>
            <TableHead className="w-12" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {vendas.map((venda) => (
            <TableRow key={venda.id}>
              <TableCell>
                <Link
                  href={`/${tenantSlug}/vendas/${venda.id}`}
                  className="font-medium hover:underline"
                >
                  {formatVendaNumero(venda.numero)}
                </Link>
              </TableCell>
              <TableCell>
                <Link
                  href={`/${tenantSlug}/vendas/${venda.id}`}
                  className="block hover:underline"
                >
                  <p className="font-medium">{venda.cliente.nome}</p>
                  {venda.cliente.documento ? (
                    <p className="text-xs text-muted-foreground">
                      {venda.cliente.documento}
                    </p>
                  ) : null}
                </Link>
              </TableCell>
              <TableCell className="hidden sm:table-cell">
                {formatVendaDate(venda.data_venda)}
              </TableCell>
              <TableCell className="hidden md:table-cell">
                {formatCurrency(venda.total)}
              </TableCell>
              <TableCell>
                <VendaStatusBadge status={venda.status} />
              </TableCell>
              <TableCell className="hidden xl:table-cell text-muted-foreground">
                {formatVendaDateTime(venda.created_at)}
              </TableCell>
              <TableCell>
                <VendaRowActions tenantSlug={tenantSlug} venda={venda} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </DataTable>
    </>
  );
}
