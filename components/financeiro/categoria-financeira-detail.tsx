import Link from "next/link";

import { CategoriaFinanceiraDeleteButton } from "@/components/financeiro/categoria-financeira-delete-button";
import { FinanceiroStatusBadge } from "@/components/financeiro/financeiro-status-badge";
import { ActionButton } from "@/components/ui/action-button";
import { FormGrid } from "@/components/ui/form-grid";
import {
  formatFinanceiroDate,
  getCategoriaFinanceiraTipoLabel,
} from "@/lib/financeiro/format";
import type { CategoriaFinanceira, PlanoContaResumo } from "@/types/financeiro";
import {
  ExecutiveHeader,
  ExecutivePage,
  ExecutiveSection,
} from "@/components/executive";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";

type Props = {
  tenantSlug: string;
  item: CategoriaFinanceira;
  planoConta?: PlanoContaResumo | null;
};

function DetailItem({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="text-sm">{value}</p>
    </div>
  );
}

export function CategoriaFinanceiraDetail({
  tenantSlug,
  item,
  planoConta,
}: Props) {
  return (
    <ExecutivePage width="wide" spacing="loose">
      <Breadcrumbs items={[
          { label: "Financeiro", href: `/${tenantSlug}/financeiro` },
          { label: "Categorias Financeiras", href: `/${tenantSlug}/financeiro/categorias` },
          { label: item.nome },
        ]} />
      <ExecutiveHeader title={item.nome} description="Detalhes do registro financeiro" actions={<>
<FinanceiroStatusBadge ativo={item.ativo} />
        <ActionButton
          action="edit"
          href={`/${tenantSlug}/financeiro/categorias/${item.id}/editar`}
        />
        <CategoriaFinanceiraDeleteButton
          tenantSlug={tenantSlug}
          id={item.id}
          nome={item.nome}
        />
</>} />

      <div className="grid gap-6 lg:grid-cols-2">

      <ExecutiveSection title="Classificação" panel>
        <FormGrid>
          <DetailItem label="Tipo" value={getCategoriaFinanceiraTipoLabel(item.tipo)} />
          <DetailItem
            label="Plano de contas"
            value={
              planoConta ? (
                <Link
                  href={`/${tenantSlug}/financeiro/plano-contas/${planoConta.id}`}
                  className="hover:underline"
                >
                  {planoConta.codigo} — {planoConta.nome}
                </Link>
              ) : (
                "—"
              )
            }
          />
          <DetailItem label="Cor" value={item.cor || "—"} />
        </FormGrid>
      </ExecutiveSection>
      <ExecutiveSection title="Observações" panel>
        <p className="text-sm whitespace-pre-wrap">{item.observacoes || "—"}</p>
      </ExecutiveSection>
      <ExecutiveSection title="Auditoria" panel>
        <FormGrid>
          <DetailItem label="Criado em" value={formatFinanceiroDate(item.created_at)} />
          <DetailItem label="Atualizado em" value={formatFinanceiroDate(item.updated_at)} />
        </FormGrid>
      </ExecutiveSection>
      </div>
    </ExecutivePage>
  );
}
