"use client";

import { useMemo, useState, useTransition } from "react";
import { UserCheck2, UserX2, Users } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { NativeSelect } from "@/components/ui/native-select";
import { SearchInput } from "@/components/ui/search-input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  removeMemberAccessAction,
  setMemberStatusAction,
  updateMemberRoleAction,
} from "@/lib/equipe/actions";
import {
  MEMBERSHIP_ROLE_OPTIONS,
  memberStatusLabel,
  type JobTitle,
  type MemberStatus,
  type MembershipRole,
  type Team,
  type TeamMember,
} from "@/lib/equipe";

type MembersPanelProps = {
  tenantSlug: string;
  members: TeamMember[];
  teams: Team[];
  jobTitles: JobTitle[];
  currentUserId: string;
  degraded: boolean;
};

function initials(name: string | null, email: string | null): string {
  const source = name?.trim() || email?.trim() || "?";
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

export function MembersPanel({
  tenantSlug,
  members,
  teams,
  jobTitles,
  currentUserId,
  degraded,
}: MembersPanelProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | MemberStatus>("all");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [removeTarget, setRemoveTarget] = useState<TeamMember | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return members.filter((member) => {
      if (statusFilter !== "all" && member.status !== statusFilter) return false;
      if (!term) return true;
      const haystack = `${member.profile.fullName ?? ""} ${member.profile.email ?? ""}`.toLowerCase();
      return haystack.includes(term);
    });
  }, [members, search, statusFilter]);

  function teamName(teamId: string | null): string {
    if (!teamId) return "—";
    return teams.find((t) => t.id === teamId)?.name ?? "—";
  }

  function jobTitleName(jobTitleId: string | null): string {
    if (!jobTitleId) return "—";
    return jobTitles.find((j) => j.id === jobTitleId)?.name ?? "—";
  }

  function handleRoleChange(member: TeamMember, role: MembershipRole) {
    if (role === member.role) return;
    setError(null);
    setPendingId(member.id);
    startTransition(async () => {
      const result = await updateMemberRoleAction(tenantSlug, member.id, role);
      setPendingId(null);
      if (!result.ok) setError(result.error.message);
    });
  }

  function handleToggleStatus(member: TeamMember) {
    setError(null);
    setPendingId(member.id);
    const nextStatus: MemberStatus = member.status === "active" ? "inactive" : "active";
    startTransition(async () => {
      const result = await setMemberStatusAction(tenantSlug, member.id, nextStatus);
      setPendingId(null);
      if (!result.ok) setError(result.error.message);
    });
  }

  function handleRemove() {
    if (!removeTarget) return;
    setError(null);
    setPendingId(removeTarget.id);
    startTransition(async () => {
      const result = await removeMemberAccessAction(tenantSlug, removeTarget.id);
      setPendingId(null);
      setRemoveTarget(null);
      if (!result.ok) setError(result.error.message);
    });
  }

  return (
    <div className="space-y-4">
      {degraded ? (
        <p className="text-xs text-muted-foreground">
          Service role não configurada neste ambiente — listagem usa a sessão atual e pode
          ficar restrita conforme as políticas de acesso aplicadas.
        </p>
      ) : null}

      {error ? (
        <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Buscar por nome ou e-mail"
          showSubmit={false}
          onClear={() => setSearch("")}
        />
        <NativeSelect
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value as "all" | MemberStatus)}
          className="w-auto"
        >
          <option value="all">Todos os status</option>
          <option value="active">Ativos</option>
          <option value="inactive">Inativos</option>
        </NativeSelect>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Nenhum membro encontrado"
          description="Ajuste a busca/filtro ou convide um novo membro na aba Convites."
        />
      ) : (
        <>
          <Card className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Membro</TableHead>
                  <TableHead>Papel</TableHead>
                  <TableHead>Equipe</TableHead>
                  <TableHead>Cargo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((member) => {
                  const busy = isPending && pendingId === member.id;
                  const isSelf = member.userId === currentUserId;
                  return (
                    <TableRow key={member.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar size="sm">
                            <AvatarImage src={member.profile.avatarUrl ?? undefined} />
                            <AvatarFallback>
                              {initials(member.profile.fullName, member.profile.email)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-foreground">
                              {member.profile.fullName ?? "Sem nome"}
                              {isSelf ? (
                                <span className="ml-1 text-xs text-muted-foreground">(você)</span>
                              ) : null}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {member.profile.email ?? "—"}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <NativeSelect
                          value={member.role}
                          disabled={busy}
                          onChange={(event) =>
                            handleRoleChange(member, event.target.value as MembershipRole)
                          }
                          className="h-8 w-auto text-xs"
                        >
                          {MEMBERSHIP_ROLE_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </NativeSelect>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {teamName(member.teamId)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {jobTitleName(member.jobTitleId)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={member.status === "active" ? "success" : "outline"}>
                          {memberStatusLabel(member.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1.5">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            disabled={busy}
                            title={member.status === "active" ? "Inativar" : "Reativar"}
                            onClick={() => handleToggleStatus(member)}
                          >
                            {member.status === "active" ? (
                              <UserX2 className="size-4" />
                            ) : (
                              <UserCheck2 className="size-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            disabled={busy}
                            title="Remover acesso"
                            onClick={() => setRemoveTarget(member)}
                          >
                            <UserX2 className="size-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>

          <div className="grid gap-3 md:hidden">
            {filtered.map((member) => {
              const busy = isPending && pendingId === member.id;
              return (
                <Card key={member.id}>
                  <CardContent className="space-y-3 pt-4">
                    <div className="flex items-center gap-2">
                      <Avatar size="sm">
                        <AvatarImage src={member.profile.avatarUrl ?? undefined} />
                        <AvatarFallback>
                          {initials(member.profile.fullName, member.profile.email)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-medium text-foreground">
                          {member.profile.fullName ?? "Sem nome"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {member.profile.email ?? "—"}
                        </p>
                      </div>
                      <Badge variant={member.status === "active" ? "success" : "outline"}>
                        {memberStatusLabel(member.status)}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                      <span>Equipe: {teamName(member.teamId)}</span>
                      <span>Cargo: {jobTitleName(member.jobTitleId)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <NativeSelect
                        value={member.role}
                        disabled={busy}
                        onChange={(event) =>
                          handleRoleChange(member, event.target.value as MembershipRole)
                        }
                        className="h-8 flex-1 text-xs"
                      >
                        {MEMBERSHIP_ROLE_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </NativeSelect>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={busy}
                        onClick={() => handleToggleStatus(member)}
                      >
                        {member.status === "active" ? "Inativar" : "Reativar"}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={busy}
                        className="text-destructive"
                        onClick={() => setRemoveTarget(member)}
                      >
                        Remover
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}

      <ConfirmDialog
        open={Boolean(removeTarget)}
        onOpenChange={(open) => !open && setRemoveTarget(null)}
        title="Remover acesso do membro"
        description={
          removeTarget
            ? `Remover o acesso de ${removeTarget.profile.fullName ?? removeTarget.profile.email} a este tenant? Esta ação não pode ser desfeita pelo membro.`
            : ""
        }
        confirmLabel="Remover acesso"
        loading={isPending}
        onConfirm={handleRemove}
      />
    </div>
  );
}
