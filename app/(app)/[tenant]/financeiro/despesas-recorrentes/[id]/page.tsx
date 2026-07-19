import { notFound } from "next/navigation";

import { DespesaRecorrenteActions } from "@/components/financeiro/despesa-recorrente-actions";
import { ModuleHeader } from "@/components/layout/module-header";
import { ActionButton } from "@/components/ui/action-button";
import { FormGrid } from "@/components/ui/form-grid";
import { SectionCard } from "@/components/ui/section-card";
import { createDespesaRecorrenteService } from "@/lib/financeiro/despesa-recorrente-service";
import { formatCurrency, formatDateOnly } from "@/lib/financeiro/format";
import { requireTenant } from "@/lib/tenants";

export const metadata = { title: "Despesa recorrente" };

type PageProps = {
  params: Promise<{ tenant: string; id: string }>;
};

function Item({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="text-sm">{value}</p>
    </div>
  );
}

export default async function Page({ params }: PageProps) {
  const { tenant: tenantSlug, id } = await params;
  const tenant = await requireTenant(tenantSlug);
  const service = await createDespesaRecorrenteService(tenant.id);
  const item = await service.getById(id);
  if (!item) notFound();

  return (
    <div className="space-y-6">
      <ModuleHeader
        title={item.descricao}
        description="Série ≠ ocorrência. Edições afetam apenas futuras gerações."
        breadcrumbs={[
          { label: "Financeiro", href: `/${tenantSlug}/financeiro` },
          {
            label: "Despesas Recorrentes",
            href: `/${tenantSlug}/financeiro/despesas-recorrentes`,
          },
          { label: item.descricao },
        ]}
      >
        <ActionButton
          action="edit"
          href={`/${tenantSlug}/financeiro/despesas-recorrentes/${item.id}/editar`}
        />
      </ModuleHeader>

      <DespesaRecorrenteActions
        tenantSlug={tenantSlug}
        id={item.id}
        pausada={item.pausada}
        ativo={item.ativo}
      />

      <SectionCard title="Série">
        <FormGrid>
          <Item label="Valor" value={formatCurrency(Number(item.valor))} />
          <Item label="Dia vencimento" value={item.dia_vencimento} />
          <Item label="Inicia" value={formatDateOnly(item.inicia_em)} />
          <Item
            label="Termina"
            value={item.termina_em ? formatDateOnly(item.termina_em) : "—"}
          />
          <Item
            label="Próxima competência"
            value={
              item.proxima_competencia
                ? formatDateOnly(item.proxima_competencia)
                : "—"
            }
          />
          <Item label="Geradas" value={item.ocorrencias_geradas} />
          <Item
            label="Máx."
            value={item.max_ocorrencias ?? "Ilimitado"}
          />
          <Item
            label="Status"
            value={
              !item.ativo ? "Encerrada" : item.pausada ? "Pausada" : "Ativa"
            }
          />
        </FormGrid>
      </SectionCard>
    </div>
  );
}
