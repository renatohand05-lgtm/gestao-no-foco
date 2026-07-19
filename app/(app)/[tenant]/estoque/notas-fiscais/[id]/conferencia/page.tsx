import { notFound } from "next/navigation";

import { ModuleHeader } from "@/components/layout/module-header";
import { NfeConferenciaClient } from "@/components/nfe/nfe-conferencia-client";
import { createClient } from "@/lib/supabase/server";
import { createNfeEntradaService } from "@/lib/nfe/nfe-entrada-service";
import { requireTenant } from "@/lib/tenants";

export const metadata = { title: "Conferência NF-e" };

type Props = { params: Promise<{ tenant: string; id: string }> };

export default async function NfeConferenciaPage({ params }: Props) {
  const { tenant: tenantSlug, id } = await params;
  const tenant = await requireTenant(tenantSlug);
  const service = await createNfeEntradaService(tenant.id);
  const nota = await service.getById(id);
  if (!nota) notFound();

  const supabase = await createClient();

  const [
    { data: fornecedores },
    { data: produtos },
    { data: ordens },
    { data: categorias },
    { data: planos },
    { data: centros },
  ] = await Promise.all([
    supabase
      .from("fornecedores")
      .select("id, nome, documento")
      .eq("tenant_id", tenant.id)
      .is("deleted_at", null)
      .order("nome")
      .limit(200),
    supabase
      .from("produtos")
      .select("id, nome, sku")
      .eq("tenant_id", tenant.id)
      .is("deleted_at", null)
      .eq("ativo", true)
      .order("nome")
      .limit(300),
    supabase
      .from("ordens_servico")
      .select("id, numero, status")
      .eq("tenant_id", tenant.id)
      .is("deleted_at", null)
      .not("status", "in", "(faturado,cancelado,cancelada)")
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("categorias_financeiras")
      .select("id, nome")
      .eq("tenant_id", tenant.id)
      .is("deleted_at", null)
      .order("nome")
      .limit(100),
    supabase
      .from("plano_contas")
      .select("id, nome, codigo")
      .eq("tenant_id", tenant.id)
      .is("deleted_at", null)
      .order("codigo")
      .limit(100),
    supabase
      .from("centros_custo")
      .select("id, nome")
      .eq("tenant_id", tenant.id)
      .is("deleted_at", null)
      .order("nome")
      .limit(100),
  ]);

  return (
    <div className="space-y-6">
      <ModuleHeader
        title="Conferência da NF-e"
        description="Valide fornecedor, produtos, destinos e Conta a Pagar antes de importar."
      />
      <NfeConferenciaClient
        tenantSlug={tenantSlug}
        nota={nota}
        fornecedores={(fornecedores ?? []).map((f) => ({
          id: f.id,
          label: `${f.nome}${f.documento ? ` (${f.documento})` : ""}`,
        }))}
        produtos={(produtos ?? []).map((p) => ({
          id: p.id,
          label: p.sku ? `${p.nome} [${p.sku}]` : p.nome,
        }))}
        ordens={(ordens ?? []).map((o) => ({
          id: o.id,
          label: `#${o.numero} (${o.status})`,
        }))}
        categorias={(categorias ?? []).map((c) => ({
          id: c.id,
          label: c.nome,
        }))}
        planos={(planos ?? []).map((p) => ({
          id: p.id,
          label: p.codigo ? `${p.codigo} — ${p.nome}` : p.nome,
        }))}
        centros={(centros ?? []).map((c) => ({
          id: c.id,
          label: c.nome,
        }))}
      />
    </div>
  );
}
