import Link from "next/link";

import { NovaContagemForm } from "@/components/estoque/contagem/nova-contagem-form";
import { ModuleHeader } from "@/components/layout/module-header";
import { SectionCard } from "@/components/ui/section-card";
import { createEstoqueContagemService } from "@/lib/estoque/estoque-contagem-service";
import { formatCurrency, formatDateOnly } from "@/lib/format";
import { requireTenant } from "@/lib/tenants";
import { CONTAGEM_PERIODICIDADE_LABELS } from "@/types/estoque-contagem";

export const metadata = { title: "Contagem de estoque" };

type PageProps = {
  params: Promise<{ tenant: string }>;
};

export default async function ContagemEstoquePage({ params }: PageProps) {
  const { tenant: tenantSlug } = await params;
  const tenant = await requireTenant(tenantSlug);
  const service = await createEstoqueContagemService(tenant.id);
  const contagens = await service.list();

  return (
    <div className="space-y-6">
      <ModuleHeader
        title="Contagem de estoque"
        description="Audite o estoque (semanal, quinzenal ou mensal) e compare com o sistema."
        breadcrumbs={[
          { label: "Estoque", href: `/${tenantSlug}/estoque` },
          { label: "Contagem" },
        ]}
      />

      <SectionCard
        title="Nova contagem"
        description="Tira uma foto do estoque atual pra você contar e comparar."
      >
        <NovaContagemForm tenantSlug={tenantSlug} />
      </SectionCard>

      <SectionCard
        title="Histórico"
        description="Contagens abertas e fechadas."
      >
        {contagens.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhuma contagem ainda. Abra a primeira acima.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border text-left text-[10px] font-medium uppercase tracking-wide text-[var(--text-muted)]">
                  <th className="pb-2 pr-3">Periodicidade</th>
                  <th className="pb-2 pr-3">Início</th>
                  <th className="pb-2 pr-3">Status</th>
                  <th className="pb-2 pr-3 text-right">Progresso</th>
                  <th className="pb-2 text-right">CMV sugerido</th>
                </tr>
              </thead>
              <tbody>
                {contagens.map((c) => (
                  <tr
                    key={c.id}
                    className="border-b border-border/50 last:border-0"
                  >
                    <td className="py-2.5 pr-3">
                      <Link
                        href={`/${tenantSlug}/estoque/contagem/${c.id}`}
                        className="text-sm font-medium text-[var(--brand-gold)] hover:underline"
                      >
                        {CONTAGEM_PERIODICIDADE_LABELS[c.periodicidade]}
                      </Link>
                    </td>
                    <td className="py-2.5 pr-3 text-sm">
                      {formatDateOnly(c.data_inicio)}
                    </td>
                    <td className="py-2.5 pr-3">
                      <span
                        className={
                          c.status === "fechada"
                            ? "inline-flex rounded-full bg-success/15 px-2 py-0.5 text-xs font-medium text-success"
                            : "inline-flex rounded-full bg-warning/15 px-2 py-0.5 text-xs font-medium text-warning"
                        }
                      >
                        {c.status === "fechada" ? "Fechada" : "Em aberto"}
                      </span>
                    </td>
                    <td className="py-2.5 pr-3 text-right text-sm tabular-nums text-[var(--text-muted)]">
                      {c.itens_contados}/{c.total_itens}
                    </td>
                    <td className="py-2.5 text-right text-sm font-medium tabular-nums">
                      {c.status === "fechada"
                        ? formatCurrency(c.cmv_sugerido)
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
