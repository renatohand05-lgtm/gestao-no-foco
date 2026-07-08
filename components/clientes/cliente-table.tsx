import Link from "next/link";

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

export function ClienteTable({ tenantSlug, clientes }: ClienteTableProps) {
  return (
    <DataTable>
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
  );
}
