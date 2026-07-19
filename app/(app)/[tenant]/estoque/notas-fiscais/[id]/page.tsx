import Link from "next/link";
import { notFound } from "next/navigation";

import { ModuleHeader } from "@/components/layout/module-header";
import { buttonVariants } from "@/components/ui/button";
import { SectionCard } from "@/components/ui/section-card";
import { createNfeEntradaService } from "@/lib/nfe/nfe-entrada-service";
import { requireTenant } from "@/lib/tenants";
import { cn } from "@/lib/utils";

export const metadata = { title: "NF-e" };

type Props = { params: Promise<{ tenant: string; id: string }> };

export default async function NfeDetailPage({ params }: Props) {
  const { tenant: tenantSlug, id } = await params;
  const tenant = await requireTenant(tenantSlug);
  const service = await createNfeEntradaService(tenant.id);
  const nota = await service.getById(id);
  if (!nota) notFound();

  return (
    <div className="space-y-6">
      <ModuleHeader
        title={`NF-e ${nota.numero ?? nota.chave_acesso.slice(0, 8)}`}
        description={`${nota.emitente_razao_social ?? ""} · ${nota.status}`}
      >
        <Link
          href={`/${tenantSlug}/estoque/notas-fiscais/${nota.id}/conferencia`}
          className={cn(buttonVariants())}
        >
          Conferência
        </Link>
      </ModuleHeader>

      <SectionCard title="Resumo" contentClassName="pt-0 text-sm space-y-2">
        <p>Chave: {nota.chave_acesso}</p>
        <p>
          Total:{" "}
          {nota.valor_total.toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL",
          })}
        </p>
        {nota.conta_pagar_id ? (
          <p>
            Conta a Pagar:{" "}
            <Link
              href={`/${tenantSlug}/financeiro/contas-pagar/${nota.conta_pagar_id}`}
              className="text-primary hover:underline"
            >
              abrir título
            </Link>
          </p>
        ) : null}
        {nota.erro_mensagem ? (
          <p className="text-destructive">Erro: {nota.erro_mensagem}</p>
        ) : null}
      </SectionCard>

      <SectionCard title="Itens e rastros" contentClassName="pt-0">
        <ul className="space-y-2 text-sm">
          {nota.itens.map((item) => (
            <li key={item.id} className="rounded-lg border px-3 py-2">
              <p className="font-medium">
                #{item.numero_item} {item.descricao_original}
              </p>
              <p className="text-xs text-muted-foreground">
                destino {item.destino} · produto {item.produto_nome ?? "—"}
                {item.estoque_movimentacao_id
                  ? ` · mov ${item.estoque_movimentacao_id.slice(0, 8)}`
                  : ""}
                {item.ordem_servico_id
                  ? ` · OS ${item.ordem_servico_id.slice(0, 8)}`
                  : ""}
              </p>
            </li>
          ))}
        </ul>
      </SectionCard>

      <SectionCard title="Histórico" contentClassName="pt-0">
        <ul className="space-y-2 text-sm">
          {nota.eventos.length === 0 ? (
            <li className="text-muted-foreground">Sem eventos.</li>
          ) : (
            nota.eventos.map((ev) => (
              <li key={ev.id} className="border-b py-2">
                <p className="font-medium">
                  {ev.tipo} · {ev.descricao}
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(ev.created_at).toLocaleString("pt-BR")}
                  {ev.resultado ? ` · ${ev.resultado}` : ""}
                  {ev.referencia_tipo
                    ? ` · ${ev.referencia_tipo}:${ev.referencia_id?.slice(0, 8)}`
                    : ""}
                </p>
              </li>
            ))
          )}
        </ul>
      </SectionCard>
    </div>
  );
}
