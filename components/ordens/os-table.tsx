"use client";

import Link from "next/link";
import { useState } from "react";

import { OsLifecycleMenu } from "@/components/ordens/os-lifecycle-menu";
import { buttonVariants } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatCurrency } from "@/lib/format";
import { OS_STATUS_LABELS, type OsStatus } from "@/lib/ordens/os-status";
import type { OrdemServicoListItem } from "@/lib/ordens/ordem-servico-service";
import { cn } from "@/lib/utils";

type Props = {
  tenantSlug: string;
  items: OrdemServicoListItem[];
  canCancel?: boolean;
  canArquivar?: boolean;
  canExcluirRascunho?: boolean;
  canRestaurar?: boolean;
};

export function OsTable({
  tenantSlug,
  items,
  canCancel = false,
  canArquivar = false,
  canExcluirRascunho = false,
  canRestaurar = false,
}: Props) {
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Nenhuma ordem encontrada com os filtros atuais.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[960px] text-left text-sm">
        <thead className="text-xs text-muted-foreground">
          <tr className="border-b border-border/70">
            <th className="py-2 pr-3 font-medium">Nº</th>
            <th className="py-2 pr-3 font-medium">Cliente</th>
            <th className="py-2 pr-3 font-medium">Veículo</th>
            <th className="py-2 pr-3 font-medium">Status</th>
            <th className="py-2 pr-3 font-medium">Entrada</th>
            <th className="py-2 pr-3 font-medium">Previsão</th>
            <th className="py-2 pr-3 font-medium text-right">Total</th>
            <th className="py-2 pr-3 font-medium">Fat.</th>
            <th className="py-2 font-medium">Ações</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="border-b border-border/40 align-top">
              <td className="py-2.5 pr-3">
                <Link
                  href={`/${tenantSlug}/ordens/${item.id}`}
                  className="font-medium underline-offset-2 hover:underline"
                >
                  #{item.numero}
                </Link>
              </td>
              <td className="py-2.5 pr-3">{item.cliente_nome ?? "—"}</td>
              <td className="py-2.5 pr-3">
                <div>{item.placa ?? "—"}</div>
                <div className="text-xs text-muted-foreground">
                  {item.modelo ?? ""}
                </div>
              </td>
              <td className="py-2.5 pr-3">
                <StatusBadge
                  label={
                    OS_STATUS_LABELS[item.status as OsStatus] ?? item.status
                  }
                />
                {item.arquivado_em ? (
                  <span className="mt-1 block text-[10px] text-muted-foreground">
                    Arquivada
                  </span>
                ) : null}
              </td>
              <td className="py-2.5 pr-3 tabular-nums text-xs">
                {item.data_abertura}
              </td>
              <td className="py-2.5 pr-3 tabular-nums text-xs">
                {item.previsao_entrega
                  ? item.previsao_entrega.slice(0, 16).replace("T", " ")
                  : "—"}
              </td>
              <td className="py-2.5 pr-3 text-right tabular-nums font-medium">
                {formatCurrency(item.valor_total)}
              </td>
              <td className="py-2.5 pr-3 text-xs">
                {item.venda_id ? "Sim" : "Não"}
              </td>
              <td className="py-2.5">
                <div className="relative">
                  <button
                    type="button"
                    className={cn(
                      buttonVariants({ variant: "outline", size: "sm" }),
                    )}
                    aria-label={`Ações da OS #${item.numero}`}
                    onClick={() =>
                      setOpenMenuId(openMenuId === item.id ? null : item.id)
                    }
                  >
                    ⋯
                  </button>
                  {openMenuId === item.id ? (
                    <div className="absolute right-0 z-10 mt-1 min-w-[200px] rounded-md border bg-background p-2 shadow-md">
                      <Link
                        href={`/${tenantSlug}/ordens/${item.id}`}
                        className="mb-2 block text-sm underline"
                      >
                        Abrir detalhe
                      </Link>
                      <OsLifecycleMenu
                        tenantSlug={tenantSlug}
                        osId={item.id}
                        numero={item.numero}
                        clienteNome={item.cliente_nome}
                        placa={item.placa}
                        modelo={item.modelo}
                        status={item.status}
                        vendaId={item.venda_id}
                        arquivadoEm={item.arquivado_em}
                        canCancel={canCancel}
                        canArquivar={canArquivar}
                        canExcluirRascunho={canExcluirRascunho}
                        canRestaurar={canRestaurar}
                        compact
                      />
                    </div>
                  ) : null}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
