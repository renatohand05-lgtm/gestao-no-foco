"use client";

import { useMemo, useState } from "react";

import { cn } from "@/lib/utils";
import type {
  EquipeSchemaProbe,
  Invitation,
  JobTitle,
  RolesMatrix,
  Team,
  TeamAuditEvent,
  TeamMember,
} from "@/lib/equipe";

import { AuditPanel } from "./audit-panel";
import { InviteForm } from "./invite-form";
import { JobTitlesPanel } from "./job-titles-panel";
import { MembersPanel } from "./members-panel";
import { RolesMatrixPanel } from "./roles-matrix-panel";
import { SchemaPendingBanner } from "./schema-pending-banner";
import { TeamsPanel } from "./teams-panel";

type EquipeTabId = "membros" | "convites" | "equipes" | "cargos" | "papeis" | "auditoria";

type EquipeHubProps = {
  tenantSlug: string;
  segment: string | null;
  isAdmin: boolean;
  currentUserId: string;
  members: TeamMember[];
  invitations: Invitation[];
  teams: Team[];
  jobTitles: JobTitle[];
  rolesMatrix: RolesMatrix;
  auditEvents: TeamAuditEvent[];
  schemaProbe: EquipeSchemaProbe;
  emailConfigured: boolean;
  membersDegraded: boolean;
  initialTab?: EquipeTabId;
};

export function EquipeHub({
  tenantSlug,
  segment,
  isAdmin,
  currentUserId,
  members,
  invitations,
  teams,
  jobTitles,
  rolesMatrix,
  auditEvents,
  schemaProbe,
  emailConfigured,
  membersDegraded,
  initialTab = "membros",
}: EquipeHubProps) {
  const [tab, setTab] = useState<EquipeTabId>(initialTab);

  const tabs = useMemo(() => {
    const base: { id: EquipeTabId; label: string }[] = [{ id: "membros", label: "Membros" }];
    if (isAdmin) {
      base.push(
        { id: "convites", label: "Convites" },
        { id: "equipes", label: "Equipes" },
        { id: "cargos", label: "Cargos" },
      );
    }
    base.push({ id: "papeis", label: "Papéis" }, { id: "auditoria", label: "Auditoria" });
    return base;
  }, [isAdmin]);

  const activeTab = tabs.some((t) => t.id === tab) ? tab : "membros";

  return (
    <div className="space-y-4">
      {!schemaProbe.ready ? (
        <SchemaPendingBanner message={schemaProbe.message} missing={schemaProbe.missing} />
      ) : null}

      <div
        className="flex flex-wrap gap-1 border-b border-border/60 pb-px"
        role="tablist"
        aria-label="Seções de Equipe"
      >
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={activeTab === item.id}
            onClick={() => setTab(item.id)}
            className={cn(
              "rounded-t-md px-3 py-2 text-sm transition-colors",
              activeTab === item.id
                ? "border border-b-0 border-border/60 bg-card font-medium text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div role="tabpanel">
        {activeTab === "membros" ? (
          <MembersPanel
            tenantSlug={tenantSlug}
            members={members}
            teams={teams}
            jobTitles={jobTitles}
            currentUserId={currentUserId}
            degraded={membersDegraded}
          />
        ) : null}

        {activeTab === "convites" && isAdmin ? (
          <InviteForm
            tenantSlug={tenantSlug}
            invitations={invitations}
            teams={teams}
            jobTitles={jobTitles}
            emailConfigured={emailConfigured}
            schemaReady={schemaProbe.hasInvitations}
          />
        ) : null}

        {activeTab === "equipes" && isAdmin ? (
          <TeamsPanel
            tenantSlug={tenantSlug}
            teams={teams}
            segment={segment}
            schemaReady={schemaProbe.hasTeams}
          />
        ) : null}

        {activeTab === "cargos" && isAdmin ? (
          <JobTitlesPanel
            tenantSlug={tenantSlug}
            jobTitles={jobTitles}
            teams={teams}
            schemaReady={schemaProbe.hasJobTitles}
          />
        ) : null}

        {activeTab === "papeis" ? <RolesMatrixPanel matrix={rolesMatrix} /> : null}

        {activeTab === "auditoria" ? <AuditPanel events={auditEvents} /> : null}
      </div>
    </div>
  );
}
