import Link from "next/link";

import { ModuleHeader } from "@/components/layout/module-header";
import { ActionButton } from "@/components/ui/action-button";
import { SectionCard } from "@/components/ui/section-card";
import { createNfeEntradaService } from "@/lib/nfe/nfe-entrada-service";
import { requireTenant } from "@/lib/tenants";

export const metadata = { title: "Notas fiscais de entrada" };

type Props = { params: Promise<{ tenant: string }> };

export default async function NfeListPage({ params }: Props) {
  const { tenant: tenantSlug } = await params;
  const tenant = await requireTenant(tenantSlug);
  const service = await createNfeEntradaService(tenant.id);
  const notas = await service.list();

  return (
    <div className="space-y-6">
      <ModuleHeader
        title="Importação de NF-e"
        description="XML de fornecedores → estoque, OS ou misto, com Conta a Pagar opcional."
      >
        <ActionButton
          action="create"
          label="Nova importação"
          href={`/${tenantSlug}/estoque/notas-fiscais/nova`}
        />
      </ModuleHeader>
      <SectionCard title="Notas" contentClassName="pt-0">
        {notas.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhuma NF-e importada ainda. Envie um XML para começar.
          </p>
        ) : (
          <ul className="divide-y">
            {notas.map((n) => (
              <li key={n.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                <div>
                  <Link
                    href={`/${tenantSlug}/estoque/notas-fiscais/${n.id}`}
                    className="font-medium hover:underline"
                  >
                    NF {n.numero ?? "—"} · {n.emitente_razao_social ?? "Sem emitente"}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {n.status} · {n.data_emissao ?? "sem emissão"} ·{" "}
                    {n.valor_total.toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })}
                  </p>
                </div>
                <Link
                  href={`/${tenantSlug}/estoque/notas-fiscais/${n.id}/conferencia`}
                  className="text-sm text-primary hover:underline"
                >
                  Conferência
                </Link>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}
