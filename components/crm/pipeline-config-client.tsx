"use client";

import { useState, useTransition } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  deactivatePipelineStageAction,
  listPipelineStagesAction,
  seedPipelineStagesAction,
  upsertPipelineStageAction,
} from "@/lib/crm/crm-corrections-actions";
import type { CrmPipelineStageRow } from "@/types/crm-enterprise";

type Props = {
  tenantSlug: string;
  initial: {
    source: "database";
    stages: CrmPipelineStageRow[];
    empty: boolean;
    note?: string;
  };
};

export function PipelineConfigClient({ tenantSlug, initial }: Props) {
  const [state, setState] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [editKey, setEditKey] = useState("");
  const [editLabel, setEditLabel] = useState("");
  const [editOrder, setEditOrder] = useState(1);

  function refresh() {
    startTransition(async () => {
      try {
        setError(null);
        const next = await listPipelineStagesAction(tenantSlug);
        setState(next);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Falha ao carregar pipeline");
      }
    });
  }

  function seed() {
    startTransition(async () => {
      try {
        setError(null);
        await seedPipelineStagesAction(tenantSlug);
        const next = await listPipelineStagesAction(tenantSlug);
        setState(next);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Falha ao persistir etapas");
      }
    });
  }

  function saveEdit() {
    if (!editKey.trim() || !editLabel.trim()) return;
    startTransition(async () => {
      try {
        setError(null);
        await upsertPipelineStageAction(tenantSlug, {
          stage_key: editKey.trim(),
          label: editLabel.trim(),
          sort_order: Number(editOrder) || 1,
          active: true,
        });
        setEditKey("");
        setEditLabel("");
        const next = await listPipelineStagesAction(tenantSlug);
        setState(next);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Falha ao salvar etapa");
      }
    });
  }

  function deactivate(stageKey: string) {
    if (!window.confirm(`Desativar etapa «${stageKey}»?`)) return;
    startTransition(async () => {
      try {
        setError(null);
        await deactivatePipelineStageAction(tenantSlug, stageKey);
        const next = await listPipelineStagesAction(tenantSlug);
        setState(next);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Falha ao desativar");
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" onClick={refresh} disabled={pending}>
          Atualizar
        </Button>
        <Button
          type="button"
          onClick={seed}
          disabled={pending || !state.empty}
        >
          Persistir etapas padrão
        </Button>
        <Badge variant="outline">fonte: {state.source}</Badge>
        {state.empty ? <Badge variant="secondary">vazio</Badge> : null}
      </div>
      {state.note ? (
        <p className="text-sm text-amber-800" role="status">
          {state.note}
        </p>
      ) : null}
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Etapas persistidas</CardTitle>
          <CardDescription>
            Dados de <code>crm_pipeline_stages</code> — sem inventar etapas em memória.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {state.empty ? (
            <p className="text-sm text-muted-foreground">
              Nenhuma etapa ativa. Persista o seed padrão ou crie uma etapa abaixo.
            </p>
          ) : null}
          {state.stages.map((s) => (
            <div
              key={s.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm"
            >
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">{s.sort_order}</Badge>
                <span className="font-medium">{s.label}</span>
                <span className="text-xs text-muted-foreground">({s.stage_key})</span>
                {s.is_won ? <Badge>ganha</Badge> : null}
                {s.is_lost ? <Badge variant="destructive">perdida</Badge> : null}
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>prob: {s.probabilidade_padrao ?? "n/d"}</span>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={pending}
                  onClick={() => {
                    setEditKey(s.stage_key);
                    setEditLabel(s.label);
                    setEditOrder(s.sort_order);
                  }}
                >
                  Editar
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={pending || s.is_won || s.is_lost}
                  onClick={() => deactivate(s.stage_key)}
                >
                  Desativar
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Criar / editar etapa</CardTitle>
          <CardDescription>
            stage_key canônica ou custom (a-z, 0-9, _). Persistido no Supabase.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-3">
          <input
            className="h-9 rounded-md border px-3 text-sm"
            placeholder="stage_key"
            value={editKey}
            onChange={(e) => setEditKey(e.target.value)}
            aria-label="stage_key"
          />
          <input
            className="h-9 rounded-md border px-3 text-sm"
            placeholder="Label"
            value={editLabel}
            onChange={(e) => setEditLabel(e.target.value)}
            aria-label="label"
          />
          <input
            className="h-9 rounded-md border px-3 text-sm"
            type="number"
            placeholder="Ordem"
            value={editOrder}
            onChange={(e) => setEditOrder(Number(e.target.value))}
            aria-label="ordem"
          />
          <Button
            type="button"
            className="sm:col-span-3"
            onClick={saveEdit}
            disabled={pending || !editKey.trim() || !editLabel.trim()}
          >
            Salvar etapa
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
