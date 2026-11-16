import Link from "next/link";
import { MessageCircle, Phone } from "lucide-react";

import { gofCardSurface } from "@/lib/design-system/primitives";
import { cn } from "@/lib/utils";
import { ClienteRowActions } from "@/components/clientes/cliente-row-actions";
import { ClienteStatusBadge } from "@/components/clientes/cliente-status-badge";
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
  formatClienteDate,
  formatDocumento,
  formatTelefone,
} from "@/lib/clientes/format";
import type { ClienteListItem } from "@/types/clientes";

type ClienteTableProps = {
  tenantSlug: string;
  clientes: ClienteListItem[];
};

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return (
    ((parts[0]?.[0] ?? "") + (parts.length > 1 ? (parts.at(-1)?.[0] ?? "") : ""))
      .toUpperCase() || "?"
  );
}

/** Número para o WhatsApp (Brasil): só dígitos, com DDI 55 quando faltar. */
function whatsappHref(cliente: ClienteListItem) {
  const digits = (cliente.whatsapp ?? cliente.telefone ?? "").replace(/\D/g, "");
  if (digits.length < 10) return null;
  return `https://wa.me/${digits.length <= 11 ? `55${digits}` : digits}`;
}

function telHref(cliente: ClienteListItem) {
  const digits = (cliente.telefone ?? cliente.whatsapp ?? "").replace(/\D/g, "");
  return digits.length >= 8 ? `tel:+${digits.length <= 11 ? `55${digits}` : digits}` : null;
}

export function ClienteTable({ tenantSlug, clientes }: ClienteTableProps) {
  return (
    <>
      <ul className="space-y-3 md:hidden" aria-label="Lista de clientes">
        {clientes.map((cliente) => {
          const wa = whatsappHref(cliente);
          const tel = telHref(cliente);
          const place = cliente.cidade
            ? `${cliente.cidade}${cliente.estado ? `/${cliente.estado}` : ""}`
            : null;
          return (
            <li key={cliente.id} className={cn(gofCardSurface, "relative p-0")}>
              <Link
                href={`/${tenantSlug}/clientes/${cliente.id}`}
                className="flex items-center gap-3 rounded-t-[inherit] p-4 active:bg-white/[0.04]"
              >
                <span
                  aria-hidden
                  className="flex size-12 shrink-0 items-center justify-center rounded-full text-base font-extrabold text-[#0a1428]"
                  style={{ background: "linear-gradient(135deg,#ffe066,#f8c208)" }}
                >
                  {initials(cliente.nome)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-base font-semibold">
                    {cliente.nome}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {cliente.tipo_pessoa === "pf" ? "Pessoa física" : "Pessoa jurídica"}
                    {place ? ` · ${place}` : ""}
                  </span>
                  <span className="block truncate text-sm">
                    {formatTelefone(cliente.telefone ?? cliente.whatsapp)}
                  </span>
                </span>
                {!cliente.ativo ? <ClienteStatusBadge ativo={cliente.ativo} /> : null}
              </Link>
              <div className="flex items-center gap-2 border-t border-border/50 px-3 py-1.5">
                {tel ? (
                  <a
                    href={tel}
                    className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg border border-border/70 text-sm font-semibold"
                  >
                    <Phone className="size-4" aria-hidden />
                    Ligar
                  </a>
                ) : null}
                {wa ? (
                  <a
                    href={wa}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg border border-[#34d27a]/40 text-sm font-semibold text-[#34d27a]"
                  >
                    <MessageCircle className="size-4" aria-hidden />
                    WhatsApp
                  </a>
                ) : null}
                <div className="ml-auto">
                  <ClienteRowActions
                    tenantSlug={tenantSlug}
                    cliente={cliente}
                    triggerClassName="size-11"
                  />
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <DataTable className="max-md:hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Cliente</TableHead>
            <TableHead className="hidden md:table-cell">Documento</TableHead>
            <TableHead className="hidden lg:table-cell">Contato</TableHead>
            <TableHead className="hidden sm:table-cell">Cidade</TableHead>
            <TableHead className="hidden sm:table-cell">Status</TableHead>
            <TableHead className="hidden xl:table-cell">Cadastro</TableHead>
            <TableHead className="w-12" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {clientes.map((cliente) => (
            <TableRow key={cliente.id}>
              <TableCell>
                <Link
                  href={`/${tenantSlug}/clientes/${cliente.id}`}
                  className="block hover:underline"
                >
                  <p className="font-medium">{cliente.nome}</p>
                  <p className="text-xs text-muted-foreground">
                    {cliente.tipo_pessoa === "pf" ? "Pessoa física" : "Pessoa jurídica"}
                  </p>
                </Link>
              </TableCell>
              <TableCell className="hidden md:table-cell">
                {formatDocumento(cliente.documento, cliente.tipo_pessoa)}
              </TableCell>
              <TableCell className="hidden lg:table-cell">
                <div className="space-y-1 text-sm">
                  <p>{formatTelefone(cliente.telefone)}</p>
                  {cliente.email ? (
                    <p className="text-xs text-muted-foreground">{cliente.email}</p>
                  ) : null}
                </div>
              </TableCell>
              <TableCell className="hidden sm:table-cell">
                {cliente.cidade
                  ? `${cliente.cidade}${cliente.estado ? `/${cliente.estado}` : ""}`
                  : "—"}
              </TableCell>
              <TableCell className="hidden sm:table-cell">
                <ClienteStatusBadge ativo={cliente.ativo} />
              </TableCell>
              <TableCell className="hidden xl:table-cell text-muted-foreground">
                {formatClienteDate(cliente.created_at)}
              </TableCell>
              <TableCell>
                <ClienteRowActions tenantSlug={tenantSlug} cliente={cliente} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </DataTable>
    </>
  );
}
