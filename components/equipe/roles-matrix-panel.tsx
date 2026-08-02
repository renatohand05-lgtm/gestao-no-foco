"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { NativeSelect } from "@/components/ui/native-select";
import type { RolesMatrix } from "@/lib/equipe";
import { cn } from "@/lib/utils";

type RolesMatrixPanelProps = {
  matrix: RolesMatrix;
};

const RISK_VARIANT: Record<string, "default" | "warning" | "destructive" | "secondary"> = {
  baixo: "secondary",
  medio: "default",
  alto: "warning",
  critico: "destructive",
};

export function RolesMatrixPanel({ matrix }: RolesMatrixPanelProps) {
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const modules = useMemo(() => {
    if (roleFilter === "all") return matrix.modules;
    return matrix.modules
      .map((mod) => ({
        ...mod,
        entries: mod.entries.filter((entry) => entry.rolesGranting.includes(roleFilter)),
      }))
      .filter((mod) => mod.entries.length > 0);
  }, [matrix.modules, roleFilter]);

  function toggle(module: string) {
    setExpanded((prev) => ({ ...prev, [module]: !prev[module] }));
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Matriz de Papéis × Permissões</CardTitle>
          <CardDescription>
            Catálogo canônico do sistema (SYSTEM_ROLES). Papéis de módulo herdam permissões
            granulares por módulo — sem duplicar regras de acesso.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3">
          <label className="text-sm text-muted-foreground" htmlFor="roles-matrix-filter">
            Comparar papel:
          </label>
          <NativeSelect
            id="roles-matrix-filter"
            value={roleFilter}
            onChange={(event) => setRoleFilter(event.target.value)}
            className="w-auto"
          >
            <option value="all">Todos os papéis</option>
            {matrix.roles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name}
              </option>
            ))}
          </NativeSelect>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 pt-4">
          <div className="flex flex-wrap gap-2">
            {matrix.roles.map((role) => (
              <Badge key={role.id} variant="outline" title={role.description}>
                {role.name} · nível {role.level}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="space-y-2">
        {modules.map((mod) => {
          const isOpen = expanded[mod.module] ?? false;
          return (
            <Card key={mod.module}>
              <button
                type="button"
                onClick={() => toggle(mod.module)}
                className="flex w-full items-center justify-between px-4 py-3 text-left"
                aria-expanded={isOpen}
              >
                <span className="flex items-center gap-2 font-medium capitalize text-foreground">
                  {isOpen ? (
                    <ChevronDown className="size-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="size-4 text-muted-foreground" />
                  )}
                  {mod.module}
                </span>
                <Badge variant="secondary">{mod.entries.length} permissões</Badge>
              </button>
              {isOpen ? (
                <CardContent className="space-y-2 border-t border-border/60 pt-3">
                  {mod.entries.map((entry) => (
                    <div
                      key={entry.permissionKey}
                      className={cn(
                        "flex flex-col gap-1 rounded-lg border border-border/60 p-3 sm:flex-row sm:items-center sm:justify-between",
                      )}
                    >
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {entry.description}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {entry.permissionKey}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge variant={RISK_VARIANT[entry.risk] ?? "secondary"}>
                          {entry.risk}
                        </Badge>
                        {entry.rolesGranting.map((roleId) => (
                          <Badge key={roleId} variant="outline">
                            {matrix.roles.find((r) => r.id === roleId)?.name ?? roleId}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </CardContent>
              ) : null}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
