import { notFound } from "next/navigation";

import { BaixarFolhaPdfButton } from "@/components/estoque/contagem/baixar-folha-pdf-button";
import { ContagemItensTable } from "@/components/estoque/contagem/contagem-itens-table";
import { FecharContagemButton } from "@/components/estoque/contagem/fechar-contagem-button";
import { ModuleHeader } from "@/components/layout/module-header";
import { FeedbackMessage } from "@/components/ui/feedback-message";
import { SectionCard } from "@/components/ui/section-card";
import { createEstoqueContagemService } from "@/lib/estoque/estoque-contagem-service";
import { formatCurrency, formatDateOnly } from "@/lib/format";
import { requireTenant } from "@/lib/tenants";
import { CONTAGEM_PERIODICIDADE_LABELS } from "@/types/estoque-contagem";

export const metadata = { title: "Contagem de estoque" };

type PageProps = {
  params: Promise<{ tenant: string; id: string }>;
};

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "success" | "danger" | "default";
}) {
  return (
    <div className="rounded-xl border border-border/50 px-3 py-2.5">
      <dt className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">
        {label}
      </dt>
      <dd
        className={
          "mt-0.5 text-lg font-semibold tabular-nums " +
          (tone === "success"
            ? "text-success"
            : tone === "danger"
              ? "text-danger"
              : "")
        }
      >
        {value}
      </dd>
    </div>
  );
}

export default async function ContagemDetalhePage({ params }: PageProps) {
  const { tenant: tenantSlug, id } = await params;
  const tenant = await requireTenant(tenantSlug);
  const service = await createEstoqueContagemService(tenant.id);
  const contagem = await service.getById(id);

  if (!contagem) notFound();

  const editavel = contagem.status === "aberta";
  const itensSemContagem = contagem.itens.filter(
    (i) => i.quantidade_contada == null,
  ).length;

  return (
    <div className="space-y-6">
      <ModuleHeader
        title={`Contagem ${CONTAGEM_PERIODICIDADE_LABELS[contagem.periodicidade]}`}
        description={`Iniciada em ${formatDateOnly(contagem.data_inicio)}${
          contagem.data_fim ? ` · fechada em ${formatDateOnly(contagem.data_fim)}` : ""
        }`}
        breadcrumbs={[
          { label: "Estoque", href: `/${tenantSlug}/estoque` },
          { label: "Contagem", href: `/${tenantSlug}/estoque/contagem` },
          { label: CONTAGEM_PERIODICIDADE_LABELS[contagem.periodicidade] },
        ]}
      >
        <BaixarFolhaPdfButton tenantSlug={tenantSlug} contagemId={contagem.id} />
        {editavel ? (
          <FecharContagemButton
            tenantSlug={tenantSlug}
            contagemId={contagem.id}
            itensSemContagem={itensSemContagem}
          />
        ) : null}
      </ModuleHeader>

      {contagem.status === "fechada" ? (
        <SectionCard
          title="Resultado da contagem"
          description="Estoque físico x sistema, e o CMV sugerido pro período."
        >
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <Stat
              label="Estoque inicial"
              value={formatCurrency(contagem.estoque_inicial_valor)}
            />
            <Stat
              label="Compras no período"
              value={formatCurrency(contagem.compras_periodo_valor)}
            />
            <Stat
              label="Estoque final"
              value={formatCurrency(contagem.estoque_final_valor)}
            />
            <Stat
              label="Perdas"
              value={formatCurrency(contagem.perdas_valor)}
              tone="danger"
            />
            <Stat
              label="Sobras"
              value={formatCurrency(contagem.sobras_valor)}
              tone="success"
            />
            <Stat
              label="CMV sugerido"
              value={formatCurrency(contagem.cmv_sugerido)}
            />
          </dl>
          <p className="mt-3 text-xs text-[var(--text-secondary)]">
            &quot;Compras no período&quot; é uma estimativa — valoriza as
            entradas de estoque registradas desde a abertura da contagem pelo
            custo atual de cada produto, já que o sistema não guarda o custo
            histórico de cada entrada.
          </p>
        </SectionCard>
      ) : (
        <FeedbackMessage variant="info">
          Contagem em aberto. Baixe a folha em PDF pra contar no papel, ou
          lance as quantidades direto na tabela abaixo. Quando terminar,
          clique em &quot;Fechar contagem&quot; — o estoque só é ajustado
          nesse momento.
        </FeedbackMessage>
      )}

      <SectionCard
        title="Itens"
        description={
          editavel
            ? "Lance a quantidade que você contou fisicamente de cada produto."
            : "Quantidades contadas e ajustes aplicados."
        }
      >
        {contagem.itens.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhum produto com controle de estoque nessa contagem.
          </p>
        ) : (
          <ContagemItensTable
            tenantSlug={tenantSlug}
            contagemId={contagem.id}
            itens={contagem.itens}
            editavel={editavel}
          />
        )}
      </SectionCard>
    </div>
  );
}
