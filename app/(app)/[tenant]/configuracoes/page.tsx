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
              <span className="text-muted-foreground">Identificador:</span>{" "}
              {tenant.slug}
            </p>
            <p>
              <span className="text-muted-foreground">Segmento:</span>{" "}
              {tenant.segment ?? "Não definido"}
            </p>
            <p>
              <span className="text-muted-foreground">Seu perfil:</span>{" "}
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
              Seu perfil atual:{" "}
              <span className="font-medium capitalize text-foreground">
                {tenant.role}
              </span>
              . Gerencie membros, convites, equipes e cargos em um único lugar.
              As permissões de acesso são aplicadas no servidor.
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
              Plano comercial desta empresa. No piloto, cobrança online não
              está ativa.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              A assinatura pertence à empresa, não ao usuário. O proprietário
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

        <Card>
          <CardHeader>
            <CardTitle>Módulos e experiência</CardTitle>
            <CardDescription>
              Preset do tipo de negócio e personalizações desta empresa
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Esconda módulos que não fazem sentido ou ligue opcionais. Nada é
              apagado ao desativar.
            </p>
            <Button
              variant="outline"
              render={<Link href={`/${tenantSlug}/configuracoes/modulos`} />}
            >
              Personalizar experiência
            </Button>
          </CardContent>
        </Card>

        <Card data-phase35="comunicacoes-hub">
          <CardHeader>
            <CardTitle>Comunicações</CardTitle>
            <CardDescription>
              WhatsApp, e-mail, retornos e aviso de serviço pronto
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Provider real permanece desligado até homologação. Sem credenciais
              nesta tela.
            </p>
            <Button
              variant="outline"
              render={<Link href={`/${tenantSlug}/configuracoes/comunicacoes`} />}
            >
              Configurar comunicações
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
