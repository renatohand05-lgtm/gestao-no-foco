import Link from "next/link";

import { DescontoAprovacaoQueue } from "@/components/descontos/desconto-aprovacao-queue";
import { ModuleHeader } from "@/components/layout/module-header";
import { SectionCard } from "@/components/ui/section-card";
import { formatCurrency } from "@/lib/format";
import { DEFAULT_ROLE_PERMISSIONS } from "@/lib/permissoes/constants";
import { createPermissionService } from "@/lib/permissoes/permission-service";
import { createClient } from "@/lib/supabase/server";
import { requireTenant } from "@/lib/tenants";

export const metadata = { title: "Aprovação de descontos" };

export default async function DescontosAprovacoesPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant: tenantSlug } = await params;
  const tenant = await requireTenant(tenantSlug);

  let canApprove = DEFAULT_ROLE_PERMISSIONS[tenant.role]["desconto.aprovar"];
  try {
    const perms = await createPermissionService(tenant.id, tenant.role);
    canApprove = await perms.has("desconto.aprovar");
  } catch {
    /* ok */
  }

  const supabase = await createClient();
  const { data: pendentes } = await supabase
    .from("desconto_eventos")
    .select("*")
    .eq("tenant_id", tenant.id)
    .eq("status", "pendente")
    .order("created_at", { ascending: false })
    .limit(100);

  const { data: historico } = await supabase
    .from("desconto_eventos")
    .select("*")
    .eq("tenant_id", tenant.id)
    .in("status", ["aprovado", "rejeitado"])
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div className="space-y-6">
      <ModuleHeader
        title="Aprovação de descontos"
        description="Fila de solicitações acima da alçada"
        breadcrumbs={[
          { label: "Descontos", href: `/${tenantSlug}/descontos/dashboard` },
          { label: "Aprovações" },
        ]}
      />

      {!canApprove ? (
        <p className="text-sm text-amber-700 dark:text-amber-400">
          Seu perfil não pode aprovar descontos. Você pode visualizar a fila.
        </p>
      ) : null}

      <SectionCard title="Pendentes" description="Aguardando aprovação superior">
        <DescontoAprovacaoQueue
          tenantSlug={tenantSlug}
          eventos={pendentes ?? []}
          canApprove={canApprove}
        />
      </SectionCard>

      <SectionCard title="Histórico recente">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-muted-foreground">
              <tr>
                <th className="p-2">Data/hora</th>
                <th className="p-2">Status</th>
                <th className="p-2">Valor / %</th>
                <th className="p-2">Alçada</th>
                <th className="p-2">Margem</th>
                <th className="p-2">Motivo / obs.</th>
                <th className="p-2">Operação</th>
              </tr>
            </thead>
            <tbody>
              {(historico ?? []).map((e) => (
                <tr key={e.id} className="border-t">
                  <td className="p-2">
                    {new Date(e.created_at).toLocaleString("pt-BR")}
                  </td>
                  <td className="p-2">{e.status}</td>
                  <td className="p-2">
                    {formatCurrency(Number(e.valor_desconto))} ({e.percentual}%)
                  </td>
                  <td className="p-2">{e.cargo_autorizador ?? "—"}</td>
                  <td className="p-2 text-xs">
                    {e.margem_antes != null
                      ? formatCurrency(Number(e.margem_antes))
                      : "—"}{" "}
                    →{" "}
                    {e.margem_depois != null
                      ? formatCurrency(Number(e.margem_depois))
                      : "—"}
                  </td>
                  <td className="p-2">
                    <div>{e.motivo}</div>
                    {e.observacao ? (
                      <div className="text-xs text-muted-foreground">
                        {e.observacao}
                      </div>
                    ) : null}
                  </td>
                  <td className="p-2">
                    <Link
                      className="underline"
                      href={
                        e.entidade_tipo === "os"
                          ? `/${tenantSlug}/ordens/${e.entidade_id}`
                          : `/${tenantSlug}/vendas/${e.entidade_id}`
                      }
                    >
                      Abrir
                    </Link>
                  </td>
                </tr>
              ))}
              {(historico ?? []).length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-4 text-muted-foreground">
                    Sem histórico.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
}
