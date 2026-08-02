"use client";

import { useState, useTransition } from "react";
import { Archive, Plus, RotateCcw, UsersRound } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createTeamAction, setTeamStatusAction } from "@/lib/equipe/actions";
import {
  getDepartmentPresets,
  teamStatusLabel,
  type Team,
} from "@/lib/equipe";

type TeamsPanelProps = {
  tenantSlug: string;
  teams: Team[];
  segment: string | null;
  schemaReady: boolean;
};

const STATUS_VARIANT: Record<string, "success" | "outline" | "secondary"> = {
  active: "success",
  inactive: "secondary",
  archived: "outline",
};

export function TeamsPanel({ tenantSlug, teams, segment, schemaReady }: TeamsPanelProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [area, setArea] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const presets = getDepartmentPresets(segment);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createTeamAction(tenantSlug, {
        name,
        description: description || null,
        area: area || null,
      });
      if (!result.ok) {
        setError(result.error.message);
        return;
      }
      setOpen(false);
      setName("");
      setDescription("");
      setArea("");
    });
  }

  function handleArchive(team: Team) {
    startTransition(async () => {
      await setTeamStatusAction(
        tenantSlug,
        team.id,
        team.status === "archived" ? "active" : "archived",
      );
    });
  }

  if (!schemaReady) {
    return (
      <EmptyState
        icon={UsersRound}
        title="Equipes indisponíveis"
        description="A migration de Equipe (tenant_teams) ainda não foi aplicada neste ambiente."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button />}>
            <Plus className="mr-2 size-4" />
            Nova equipe
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nova equipe</DialogTitle>
              <DialogDescription>
                Departamentos comuns para o seu segmento: {presets.join(", ")}.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-3">
              <FormField label="Nome" htmlFor="team-name" required>
                <Input
                  id="team-name"
                  required
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  list="team-name-presets"
                />
                <datalist id="team-name-presets">
                  {presets.map((preset) => (
                    <option key={preset} value={preset} />
                  ))}
                </datalist>
              </FormField>
              <FormField label="Área (opcional)" htmlFor="team-area">
                <Input id="team-area" value={area} onChange={(event) => setArea(event.target.value)} />
              </FormField>
              <FormField label="Descrição (opcional)" htmlFor="team-description">
                <Textarea
                  id="team-description"
                  rows={2}
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                />
              </FormField>
              {error ? <p className="text-sm text-destructive">{error}</p> : null}
              <DialogFooter>
                <Button type="submit" disabled={isPending}>
                  {isPending ? "Salvando..." : "Criar equipe"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {teams.length === 0 ? (
        <EmptyState
          icon={UsersRound}
          title="Nenhuma equipe criada"
          description="Organize a equipe por departamento (ex.: recepção, oficina, financeiro)."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {teams.map((team) => (
            <Card key={team.id}>
              <CardHeader className="flex-row items-start justify-between gap-2 space-y-0">
                <div>
                  <CardTitle className="text-sm">{team.name}</CardTitle>
                  {team.area ? (
                    <p className="text-xs text-muted-foreground">{team.area}</p>
                  ) : null}
                </div>
                <Badge variant={STATUS_VARIANT[team.status] ?? "secondary"}>
                  {teamStatusLabel(team.status)}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-3">
                {team.description ? (
                  <p className="text-sm text-muted-foreground">{team.description}</p>
                ) : null}
                <p className="text-sm text-muted-foreground">
                  {team.memberCount} {team.memberCount === 1 ? "membro" : "membros"}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isPending}
                  onClick={() => handleArchive(team)}
                >
                  {team.status === "archived" ? (
                    <RotateCcw className="mr-2 size-3.5" />
                  ) : (
                    <Archive className="mr-2 size-3.5" />
                  )}
                  {team.status === "archived" ? "Reativar" : "Arquivar"}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
