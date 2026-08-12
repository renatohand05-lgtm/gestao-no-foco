import Link from "next/link";

import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireTenant } from "@/lib/tenants";

export const metadata = { title: "Configurações" };

export default async function ConfiguracoesPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant: tenantSlug } = await params;
  const tenant = await requireTenant(tenantSlug);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Configurações"
        description="Empresa, equipe e preferências"
      />

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Dados da empresa</CardTitle>
            <CardDescription>Informações básicas do negócio</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <span className="text-muted-foreground">Nome:</span> {tenant.name}
            </p>
            <p>
              <span className="text-muted-foreground">Slug:</span> {tenant.slug}
            </p>
            <p>
              <span className="text-muted-foreground">Segmento:</span>{" "}
              {tenant.segment ?? "Não definido"}
            </p>
            <p>
              <span className="text-muted-foreground">Seu papel:</span>{" "}
              <span className="capitalize">{tenant.role}</span>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Comercial</CardTitle>
            <CardDescription>Metas mensais e projeção de vendas</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Defina a meta de faturamento do mês e acompanhe o ritmo no
              Dashboard Executivo.
            </p>
            <Button variant="outline" render={<Link href={`/${tenantSlug}/configuracoes/metas`} />}>
              Gerenciar metas
            </Button>
          </CardContent>
        </Card>

        <Card data-team-permissions-ready="">
          <CardHeader>
            <CardTitle>Equipe e permissões</CardTitle>
            <CardDescription>Membros, convites, equipes e cargos</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Seu papel atual:{" "}
              <span className="font-medium capitalize text-foreground">
                {tenant.role}
              </span>
              . Gerencie membros, convites, equipes, cargos e a matriz de papéis
              em um único lugar. Permissões de acesso são aplicadas no servidor
              (RBAC).
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                render={<Link href={`/${tenantSlug}/configuracoes/equipe`} />}
              >
                Gerenciar equipe
              </Button>
              <Button
                variant="outline"
                render={<Link href={`/${tenantSlug}/configuracoes/equipe?tab=convites`} />}
              >
                Convidar membro
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Assinatura</CardTitle>
            <CardDescription>
              Plano, trial e status comercial desta empresa
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              A assinatura pertence à empresa (tenant), não ao usuário. OWNER
              gerencia; membros comuns não alteram cobrança.
            </p>
            {tenant.role === "owner" || tenant.role === "admin" ? (
              <Button
                variant="outline"
                render={
                  <Link href={`/${tenantSlug}/configuracoes/assinatura`} />
                }
              >
                Ver assinatura
              </Button>
            ) : (
              <p className="text-sm text-muted-foreground">
                Sem acesso à gestão de assinatura neste papel.
              </p>
            )}
          </CardContent>
        </Card>

        {tenant.role === "owner" || tenant.role === "admin" ? (
          <Card>
            <CardHeader>
              <CardTitle>Design System</CardTitle>
              <CardDescription>
                Biblioteca oficial — acesso técnico interno
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Showcase de tokens e componentes. Sem dados de negócio.
              </p>
              <Button
                variant="outline"
                render={<Link href={`/${tenantSlug}/design-system`} />}
              >
                Abrir Design System
              </Button>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
