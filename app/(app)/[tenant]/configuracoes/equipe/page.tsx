import { redirect } from "next/navigation";

import { EquipeHub } from "@/components/equipe/equipe-hub";
import { ModuleHeader } from "@/components/layout/module-header";
import { Card, CardContent } from "@/components/ui/card";
import { FeedbackMessage } from "@/components/ui/feedback-message";
import { createClient } from "@/lib/supabase/server";
import {
  buildRolesMatrix,
  emailProviderConfigured,
  isMembersServiceDegraded,
  listInvitations,
  listJobTitles,
  listMembers,
  listTeamAuditEvents,
  listTeams,
  probeEquipeSchema,
  tryRequireEquipePageAuth,
} from "@/lib/equipe/server";

export const metadata = { title: "Equipe" };

type PageProps = {
  params: Promise<{ tenant: string }>;
  searchParams: Promise<{ tab?: string }>;
};

const VALID_TABS = ["membros", "convites", "equipes", "cargos", "papeis", "auditoria"] as const;

export default async function EquipePage({ params, searchParams }: PageProps) {
  const { tenant: tenantSlug } = await params;
  const { tab } = await searchParams;
  const initialTab = VALID_TABS.includes(tab as (typeof VALID_TABS)[number])
    ? (tab as (typeof VALID_TABS)[number])
    : "membros";

  const result = await tryRequireEquipePageAuth(tenantSlug);
  if (!result.ok) {
    if (result.error.code === "EQUIPE_SESSION_MISSING") {
      redirect("/login");
    }
    return (
      <div className="space-y-6">
        <ModuleHeader
          title="Equipe"
          description="Membros, convites, equipes e permissões"
          breadcrumbs={[
            { label: "Configurações", href: `/${tenantSlug}/configuracoes` },
            { label: "Equipe" },
          ]}
        />
        <FeedbackMessage variant="error">{result.error.message}</FeedbackMessage>
      </div>
    );
  }

  const { auth } = result;
  const { tenant, profile, isAdmin } = auth;

  const probeClient = await createClient();
  const schemaProbe = await probeEquipeSchema(probeClient);

  const [members, invitations, teams, jobTitles, auditEvents] = await Promise.all([
    listMembers(tenant.id).catch(() => []),
    schemaProbe.hasInvitations && isAdmin
      ? listInvitations(tenant.id).catch(() => [])
      : Promise.resolve([]),
    schemaProbe.hasTeams ? listTeams(tenant.id).catch(() => []) : Promise.resolve([]),
    schemaProbe.hasJobTitles ? listJobTitles(tenant.id).catch(() => []) : Promise.resolve([]),
    listTeamAuditEvents(tenant.id).catch(() => []),
  ]);

  const rolesMatrix = buildRolesMatrix();
  const activeMembers = members.filter((m) => m.status === "active").length;
  const pendingInvitations = invitations.filter((i) => i.status === "pending").length;
  const activeTeams = teams.filter((t) => t.status === "active").length;

  return (
    <div className="space-y-6">
      <ModuleHeader
        title="Equipe"
        description={`Membros, convites, equipes e permissões de ${tenant.name}`}
        breadcrumbs={[
          { label: "Configurações", href: `/${tenantSlug}/configuracoes` },
          { label: "Equipe" },
        ]}
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="space-y-1 pt-4">
            <p className="text-xs text-muted-foreground">Membros ativos</p>
            <p className="text-2xl font-semibold text-foreground">{activeMembers}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-1 pt-4">
            <p className="text-xs text-muted-foreground">Convites pendentes</p>
            <p className="text-2xl font-semibold text-foreground">{pendingInvitations}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-1 pt-4">
            <p className="text-xs text-muted-foreground">Equipes ativas</p>
            <p className="text-2xl font-semibold text-foreground">{activeTeams}</p>
          </CardContent>
        </Card>
      </div>

      <EquipeHub
        tenantSlug={tenantSlug}
        segment={tenant.segment}
        isAdmin={isAdmin}
        currentUserId={profile.id}
        members={members}
        invitations={invitations}
        teams={teams}
        jobTitles={jobTitles}
        rolesMatrix={rolesMatrix}
        auditEvents={auditEvents}
        schemaProbe={schemaProbe}
        emailConfigured={emailProviderConfigured()}
        membersDegraded={isMembersServiceDegraded()}
        initialTab={initialTab}
      />
    </div>
  );
}
