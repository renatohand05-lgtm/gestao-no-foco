"use client";

import { useState, useTransition } from "react";
import { Briefcase, Plus, PowerOff, Power } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import {
  createJobTitleAction,
  setJobTitleStatusAction,
} from "@/lib/equipe/actions";
import {
  MEMBERSHIP_ROLE_OPTIONS,
  jobTitleStatusLabel,
  type JobTitle,
  type MembershipRole,
  type Team,
} from "@/lib/equipe";

type JobTitlesPanelProps = {
  tenantSlug: string;
  jobTitles: JobTitle[];
  teams: Team[];
  schemaReady: boolean;
};

export function JobTitlesPanel({ tenantSlug, jobTitles, teams, schemaReady }: JobTitlesPanelProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [teamId, setTeamId] = useState("");
  const [defaultRole, setDefaultRole] = useState<MembershipRole | "">("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createJobTitleAction(tenantSlug, {
        name,
        teamId: teamId || null,
        defaultMembershipRole: defaultRole || null,
      });
      if (!result.ok) {
        setError(result.error.message);
        return;
      }
      setOpen(false);
      setName("");
      setTeamId("");
      setDefaultRole("");
    });
  }

  function handleToggleStatus(jobTitle: JobTitle) {
    startTransition(async () => {
      await setJobTitleStatusAction(
        tenantSlug,
        jobTitle.id,
        jobTitle.status === "active" ? "inactive" : "active",
      );
    });
  }

  if (!schemaReady) {
    return (
      <EmptyState
        icon={Briefcase}
        title="Cargos indisponíveis"
        description="A migration de Equipe (tenant_job_titles) ainda não foi aplicada neste ambiente."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button />}>
            <Plus className="mr-2 size-4" />
            Novo cargo
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Novo cargo</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-3">
              <FormField label="Nome" htmlFor="job-title-name" required>
                <Input id="job-title-name" required value={name} onChange={(event) => setName(event.target.value)} />
              </FormField>
              <FormField label="Equipe (opcional)" htmlFor="job-title-team">
                <NativeSelect
                  id="job-title-team"
                  value={teamId}
                  onChange={(event) => setTeamId(event.target.value)}
                >
                  <option value="">Sem equipe</option>
                  {teams.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.name}
                    </option>
                  ))}
                </NativeSelect>
              </FormField>
              <FormField label="Papel sugerido (opcional)" htmlFor="job-title-role">
                <NativeSelect
                  id="job-title-role"
                  value={defaultRole}
                  onChange={(event) => setDefaultRole(event.target.value as MembershipRole | "")}
                >
                  <option value="">Nenhum</option>
                  {MEMBERSHIP_ROLE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </NativeSelect>
              </FormField>
              {error ? <p className="text-sm text-destructive">{error}</p> : null}
              <DialogFooter>
                <Button type="submit" disabled={isPending}>
                  {isPending ? "Salvando..." : "Criar cargo"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {jobTitles.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title="Nenhum cargo cadastrado"
          description="Cargos ajudam a padronizar papéis e permissões sugeridas para novos membros."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {jobTitles.map((jobTitle) => (
            <Card key={jobTitle.id}>
              <CardHeader className="flex-row items-start justify-between gap-2 space-y-0">
                <CardTitle className="text-sm">{jobTitle.name}</CardTitle>
                <Badge variant={jobTitle.status === "active" ? "success" : "secondary"}>
                  {jobTitleStatusLabel(jobTitle.status)}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  {jobTitle.memberCount} {jobTitle.memberCount === 1 ? "membro" : "membros"}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isPending}
                  onClick={() => handleToggleStatus(jobTitle)}
                >
                  {jobTitle.status === "active" ? (
                    <PowerOff className="mr-2 size-3.5" />
                  ) : (
                    <Power className="mr-2 size-3.5" />
                  )}
                  {jobTitle.status === "active" ? "Inativar" : "Ativar"}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
