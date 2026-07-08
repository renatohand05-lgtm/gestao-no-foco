import Link from "next/link";

import { ClienteDeleteButton } from "@/components/clientes/cliente-delete-button";
import { ClienteStatusBadge } from "@/components/clientes/cliente-status-badge";
import { ModuleHeader } from "@/components/layout/module-header";
import { ActionButton } from "@/components/ui/action-button";
import { FormGrid } from "@/components/ui/form-grid";
import { SectionCard } from "@/components/ui/section-card";
import {
  formatClienteDate,
  formatCep,
  formatDataReferencia,
  formatDocumento,
  formatEndereco,
  formatTelefone,
  getDataReferenciaLabel,
  getNomeLabel,
} from "@/lib/clientes/format";
import type { Cliente } from "@/types/clientes";

type ClienteDetailProps = {
  tenantSlug: string;
  cliente: Cliente;
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

export function ClienteDetail({ tenantSlug, cliente }: ClienteDetailProps) {
  return (
    <div className="space-y-6">
      <ModuleHeader
        title={cliente.nome}
        description="Detalhes do cliente"
        breadcrumbs={[
          { label: "Clientes", href: `/${tenantSlug}/clientes` },
          { label: cliente.nome },
        ]}
      >
        <ClienteStatusBadge ativo={cliente.ativo} />
        <ActionButton
          action="edit"
          href={`/${tenantSlug}/clientes/${cliente.id}/editar`}
        />
        <ClienteDeleteButton
          tenantSlug={tenantSlug}
          clienteId={cliente.id}
          clienteNome={cliente.nome}
        />
      </ModuleHeader>

      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard title="Identificação">
          <FormGrid>
            <DetailItem
              label="Tipo"
              value={cliente.tipo_pessoa === "pf" ? "Pessoa física" : "Pessoa jurídica"}
            />
            <DetailItem
              label={getNomeLabel(cliente.tipo_pessoa)}
              value={cliente.nome}
            />
            <DetailItem
              label={cliente.tipo_pessoa === "pf" ? "CPF" : "CNPJ"}
              value={formatDocumento(cliente.documento, cliente.tipo_pessoa)}
            />
            <DetailItem
              label={getDataReferenciaLabel(cliente.tipo_pessoa)}
              value={formatDataReferencia(cliente.data_referencia)}
            />
          </FormGrid>
        </SectionCard>

        <SectionCard title="Contato">
          <FormGrid>
            <DetailItem label="Telefone" value={formatTelefone(cliente.telefone)} />
            <DetailItem label="WhatsApp" value={formatTelefone(cliente.whatsapp)} />
            <div className="md:col-span-2">
              <DetailItem
                label="E-mail"
                value={cliente.email ? (
                  <Link href={`mailto:${cliente.email}`} className="text-primary hover:underline">
                    {cliente.email}
                  </Link>
                ) : (
                  "—"
                )}
              />
            </div>
          </FormGrid>
        </SectionCard>

        <SectionCard title="Endereço" className="lg:col-span-2">
          <FormGrid columns={4}>
            <DetailItem label="CEP" value={formatCep(cliente.cep)} />
            <DetailItem label="Rua" value={cliente.rua ?? "—"} />
            <DetailItem label="Número" value={cliente.numero ?? "—"} />
            <DetailItem label="Complemento" value={cliente.complemento ?? "—"} />
            <DetailItem label="Bairro" value={cliente.bairro ?? "—"} />
            <DetailItem label="Cidade" value={cliente.cidade ?? "—"} />
            <DetailItem label="Estado" value={cliente.estado ?? "—"} />
            <DetailItem label="Endereço completo" value={formatEndereco(cliente)} />
          </FormGrid>
        </SectionCard>

        <SectionCard title="Observações" className="lg:col-span-2">
          <p className="text-sm text-muted-foreground">
            {cliente.observacoes || "Nenhuma observação registrada."}
          </p>
          <FormGrid className="mt-4 border-t pt-4">
            <DetailItem
              label="Cadastrado em"
              value={formatClienteDate(cliente.created_at)}
            />
            <DetailItem
              label="Atualizado em"
              value={formatClienteDate(cliente.updated_at)}
            />
          </FormGrid>
        </SectionCard>
      </div>
    </div>
  );
}
