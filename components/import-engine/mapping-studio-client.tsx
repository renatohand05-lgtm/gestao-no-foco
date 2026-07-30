"use client";

import { useMemo, useState, useTransition } from "react";
import {
  AlertTriangle,
  ArrowDown,
  CheckCircle2,
  CircleDashed,
  Columns3,
  FileSpreadsheet,
} from "lucide-react";

import { ExecutiveBadge } from "@/components/executive/ExecutiveBadge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  computeImportMappingConfidence,
  deleteImportProfile,
  duplicateImportProfile,
  listImportProfiles,
  saveImportProfile,
} from "@/lib/import-engine/intelligence/intelligence-actions";
import { listImportAdapters } from "@/lib/import-engine";
import type {
  ImportColumnMapping,
  ImportMappingConfidence,
  ImportMappingProfile,
} from "@/lib/import-engine";
import { cn } from "@/lib/utils";
import {
  averageMappingConfidence,
  confidenceBand,
} from "./intelligence-presentation";

type Props = {
  tenantSlug: string;
  initialModule: string;
  initialProfiles: ImportMappingProfile[];
};

const PROFILE_PRESETS = [
  "ERP Oficina",
  "ERP X",
  "Planilha Financeira",
  "Sistema Antigo",
  "Sistema Próprio",
];

function bandTone(
  band: "Alta" | "Média" | "Baixa",
): "success" | "warning" | "danger" {
  if (band === "Alta") return "success";
  if (band === "Média") return "warning";
  return "danger";
}

function statusBadge(status: ImportMappingConfidence["status"]) {
  if (status === "recognized") {
    return <ExecutiveBadge tone="success">Reconhecido</ExecutiveBadge>;
  }
  if (status === "needs_confirmation") {
    return <ExecutiveBadge tone="warning">Necessita confirmação</ExecutiveBadge>;
  }
  return <ExecutiveBadge tone="neutral" variant="outline">Não reconhecido</ExecutiveBadge>;
}

export function MappingStudioClient({
  tenantSlug,
  initialModule,
  initialProfiles,
}: Props) {
  const adapters = listImportAdapters();
  const [moduleKey, setModuleKey] = useState(initialModule);
  const adapter =
    adapters.find((a) => a.moduleKey === moduleKey || a.id === moduleKey) ??
    adapters[0];
  const [profiles, setProfiles] = useState(initialProfiles);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(
    initialProfiles[0]?.id ?? null,
  );
  const selected = profiles.find((p) => p.id === selectedProfileId) ?? null;
  const [profileName, setProfileName] = useState(selected?.name ?? "ERP Oficina");
  const [description, setDescription] = useState(selected?.description ?? "");
  const [mapping, setMapping] = useState<ImportColumnMapping>(
    selected?.mapping ??
      Object.fromEntries(adapter.fields.map((f) => [f.key, null])),
  );
  const [sourceColumns, setSourceColumns] = useState<string[]>(
    Object.values(selected?.mapping ?? {}).filter(Boolean) as string[],
  );
  const [newColumn, setNewColumn] = useState("");
  const [confidence, setConfidence] = useState<ImportMappingConfidence[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const fields = adapter.fields;

  const columnsForSelect = useMemo(() => {
    const set = new Set(sourceColumns);
    for (const v of Object.values(mapping)) {
      if (v) set.add(v);
    }
    return [...set];
  }, [sourceColumns, mapping]);

  const mappedCount = fields.filter((f) => Boolean(mapping[f.key])).length;
  const requiredPending = fields.filter(
    (f) => f.required && !mapping[f.key],
  ).length;
  const recognizedCount = confidence.filter(
    (c) => c.status === "recognized",
  ).length;
  const needsConfirmCount = confidence.filter(
    (c) => c.status === "needs_confirmation",
  ).length;
  const conflictColumns = (() => {
    const conflicts = Object.values(mapping).reduce<Record<string, number>>(
      (acc, col) => {
        if (!col) return acc;
        acc[col] = (acc[col] ?? 0) + 1;
        return acc;
      },
      {},
    );
    return Object.entries(conflicts)
      .filter(([, n]) => n > 1)
      .map(([col]) => col);
  })();
  const avgConfidence = averageMappingConfidence(confidence);
  const summary = {
    mapped: mappedCount,
    pending: fields.length - mappedCount,
    requiredPending,
    recognized: recognizedCount,
    needsConfirm: needsConfirmCount,
    conflictColumns,
    avg: avgConfidence,
  };

  function loadProfile(p: ImportMappingProfile) {
    setSelectedProfileId(p.id);
    setProfileName(p.name);
    setDescription(p.description ?? "");
    setMapping({ ...p.mapping });
    setSourceColumns(
      Object.values(p.mapping).filter((v): v is string => Boolean(v)),
    );
    setConfidence([]);
    setMessage(null);
    setError(null);
  }

  function switchModule(next: string) {
    setModuleKey(next);
    setSelectedProfileId(null);
    setProfileName("ERP Oficina");
    setDescription("");
    const nextAdapter =
      adapters.find((a) => a.moduleKey === next || a.id === next) ?? adapters[0];
    setMapping(Object.fromEntries(nextAdapter.fields.map((f) => [f.key, null])));
    setSourceColumns([]);
    setConfidence([]);
    startTransition(async () => {
      const res = await listImportProfiles(tenantSlug, next);
      if (res.success) {
        setProfiles(res.profiles);
        if (res.profiles[0]) loadProfile(res.profiles[0]);
      }
    });
  }

  function addSourceColumn() {
    const col = newColumn.trim();
    if (!col) return;
    setSourceColumns((prev) => (prev.includes(col) ? prev : [...prev, col]));
    setNewColumn("");
  }

  function refreshConfidence() {
    startTransition(async () => {
      const res = await computeImportMappingConfidence({
        mapping,
        columns: columnsForSelect,
        fields,
      });
      setConfidence(res.confidence);
    });
  }

  function save() {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const res = await saveImportProfile(tenantSlug, {
        module: adapter.moduleKey,
        targetEntity: adapter.targetEntity,
        name: profileName.trim() || "perfil",
        mapping,
        description: description || null,
        makeDefault: false,
      });
      if (!res.success) {
        setError(res.error);
        return;
      }
      setMessage(
        `Perfil “${res.profile.name}” guardado. Nenhuma importação foi executada.`,
      );
      const list = await listImportProfiles(tenantSlug, adapter.moduleKey);
      if (list.success) {
        setProfiles(list.profiles);
        setSelectedProfileId(res.profile.id);
      }
    });
  }

  function duplicate() {
    if (!selectedProfileId) return;
    const name = `${profileName.trim() || "perfil"}-copia`;
    startTransition(async () => {
      const res = await duplicateImportProfile(tenantSlug, {
        module: adapter.moduleKey,
        id: selectedProfileId,
        name,
      });
      if (!res.success) {
        setError(res.error);
        return;
      }
      setMessage(`Perfil duplicado como “${res.profile.name}”.`);
      const list = await listImportProfiles(tenantSlug, adapter.moduleKey);
      if (list.success) {
        setProfiles(list.profiles);
        loadProfile(res.profile);
      }
    });
  }

  function remove() {
    if (!selectedProfileId) return;
    startTransition(async () => {
      const res = await deleteImportProfile(tenantSlug, {
        module: adapter.moduleKey,
        id: selectedProfileId,
      });
      if (!res.success) {
        setError(res.error);
        return;
      }
      setMessage("Perfil removido.");
      const list = await listImportProfiles(tenantSlug, adapter.moduleKey);
      if (list.success) {
        setProfiles(list.profiles);
        if (list.profiles[0]) loadProfile(list.profiles[0]);
        else {
          setSelectedProfileId(null);
          setMapping(Object.fromEntries(fields.map((f) => [f.key, null])));
        }
      }
    });
  }

  return (
    <div className="space-y-6" data-mapping-studio>
      {error ? (
        <p
          className="rounded-lg border border-red-500/40 px-3 py-2 text-sm text-red-700"
          role="alert"
        >
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="rounded-lg border border-emerald-600/30 bg-emerald-50/50 px-3 py-2 text-sm text-emerald-900">
          {message}
        </p>
      ) : null}

      {/* Fluxo visual Arquivo → Coluna → Campo → Confiança → Status */}
      <nav
        aria-label="Fluxo do Mapping Studio"
        className="flex flex-wrap items-center justify-center gap-2 rounded-xl border border-border/60 bg-card/40 px-4 py-3 text-xs font-medium sm:gap-3"
      >
        {[
          { icon: FileSpreadsheet, label: "Arquivo" },
          { icon: Columns3, label: "Coluna" },
          { icon: CheckCircle2, label: "Campo do Sistema" },
          { icon: CircleDashed, label: "Confiança" },
          { icon: AlertTriangle, label: "Status" },
        ].map((step, i, arr) => (
          <div key={step.label} className="flex items-center gap-2 sm:gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background px-2.5 py-1">
              <step.icon className="size-3.5 text-muted-foreground" aria-hidden />
              {step.label}
            </span>
            {i < arr.length - 1 ? (
              <ArrowDown className="size-3.5 rotate-[-90deg] text-muted-foreground" aria-hidden />
            ) : null}
          </div>
        ))}
      </nav>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <SummaryChip label="Reconhecidos" value={String(summary.recognized)} tone="success" />
        <SummaryChip label="Pendentes" value={String(summary.pending)} tone="neutral" />
        <SummaryChip
          label="Obrigatórios em falta"
          value={String(summary.requiredPending)}
          tone={summary.requiredPending > 0 ? "danger" : "success"}
        />
        <SummaryChip
          label="Conflitos"
          value={String(summary.conflictColumns.length)}
          tone={summary.conflictColumns.length > 0 ? "warning" : "success"}
        />
        <SummaryChip
          label="Confiança média"
          value={
            summary.avg != null
              ? `${Math.round(summary.avg * 100)}%`
              : "—"
          }
          tone="info"
        />
      </div>

      {summary.conflictColumns.length > 0 ? (
        <p className="rounded-lg border border-amber-500/40 bg-amber-50/40 px-3 py-2 text-sm text-amber-900" role="status">
          Conflito: coluna(s) mapeada(s) a múltiplos campos —{" "}
          {summary.conflictColumns.join(", ")}.
        </p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="text-base">Perfis</CardTitle>
            <CardDescription>Reutilizáveis por tenant e módulo.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <label className="block space-y-1 text-sm">
              <span className="text-muted-foreground">Módulo</span>
              <select
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={adapter.moduleKey}
                onChange={(e) => switchModule(e.target.value)}
              >
                {adapters.map((a) => (
                  <option key={a.id} value={a.moduleKey}>
                    {a.label}
                  </option>
                ))}
              </select>
            </label>
            <ul className="space-y-1" role="listbox" aria-label="Lista de perfis">
              {profiles.length === 0 ? (
                <li className="text-xs text-muted-foreground">
                  Nenhum perfil guardado.
                </li>
              ) : (
                profiles.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={selectedProfileId === p.id}
                      className={cn(
                        "w-full rounded-md px-2 py-1.5 text-left text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        selectedProfileId === p.id
                          ? "bg-[var(--brand-graphite)] text-white"
                          : "hover:bg-muted",
                      )}
                      onClick={() => loadProfile(p)}
                    >
                      <span className="block truncate font-medium">{p.name}</span>
                      <span className="block text-[10px] opacity-80">
                        {p.importCount ?? 0} importações
                      </span>
                    </button>
                  </li>
                ))
              )}
            </ul>
            <div className="flex flex-wrap gap-1">
              {PROFILE_PRESETS.map((name) => (
                <Button
                  key={name}
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-7 text-[11px]"
                  onClick={() => setProfileName(name)}
                >
                  {name}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="border-border/60">
            <CardHeader>
              <CardTitle className="text-base">Data Mapping Studio</CardTitle>
              <CardDescription>
                Arquivo → Coluna → Campo do Sistema → Confiança → Status. Nada é
                importado aqui — apenas o perfil de mapeamento.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block space-y-1 text-sm">
                  <span className="text-muted-foreground">Nome do perfil</span>
                  <input
                    className="w-full rounded-md border border-input bg-transparent px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                  />
                </label>
                <label className="block space-y-1 text-sm">
                  <span className="text-muted-foreground">Descrição</span>
                  <input
                    className="w-full rounded-md border border-input bg-transparent px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Ex.: exportação mensal do ERP"
                  />
                </label>
              </div>

              <div className="flex flex-wrap items-end gap-2">
                <label className="block min-w-[200px] flex-1 space-y-1 text-sm">
                  <span className="text-muted-foreground">
                    Colunas do ficheiro (amostra)
                  </span>
                  <input
                    className="w-full rounded-md border border-input bg-transparent px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    value={newColumn}
                    onChange={(e) => setNewColumn(e.target.value)}
                    placeholder="Ex.: Descrição da despesa"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addSourceColumn();
                      }
                    }}
                  />
                </label>
                <Button type="button" variant="outline" onClick={addSourceColumn}>
                  Adicionar coluna
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={pending}
                  onClick={refreshConfidence}
                >
                  Calcular confiança
                </Button>
              </div>

              {columnsForSelect.length > 0 ? (
                <div className="flex flex-wrap gap-1.5" aria-label="Colunas do arquivo">
                  {columnsForSelect.map((c) => (
                    <ExecutiveBadge
                      key={c}
                      tone={
                        summary.conflictColumns.includes(c) ? "warning" : "neutral"
                      }
                      variant="outline"
                    >
                      {c}
                    </ExecutiveBadge>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Adicione os nomes das colunas do ficheiro (ou carregue um perfil
                  existente).
                </p>
              )}

              <div className="overflow-x-auto rounded-lg border border-border/60">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Arquivo / Campo</TableHead>
                      <TableHead>Coluna</TableHead>
                      <TableHead>Campo do Sistema</TableHead>
                      <TableHead>Confiança</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fields.map((field) => {
                      const conf = confidence.find((c) => c.fieldKey === field.key);
                      const band = conf
                        ? confidenceBand(conf.confidence)
                        : null;
                      const col = mapping[field.key];
                      return (
                        <TableRow key={field.key}>
                          <TableCell className="text-xs text-muted-foreground">
                            {profileName || "perfil"}
                          </TableCell>
                          <TableCell>
                            <select
                              className="w-full min-w-[160px] rounded-md border border-input bg-transparent px-2 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                              value={col ?? ""}
                              aria-label={`Coluna para ${field.label}`}
                              onChange={(e) =>
                                setMapping((m) => ({
                                  ...m,
                                  [field.key]: e.target.value || null,
                                }))
                              }
                            >
                              <option value="">— não mapear —</option>
                              {columnsForSelect.map((c) => (
                                <option key={c} value={c}>
                                  {c}
                                </option>
                              ))}
                            </select>
                          </TableCell>
                          <TableCell className="text-sm font-medium">
                            {field.label}
                            {field.required ? (
                              <span className="ml-1 text-red-600" title="Obrigatório">
                                *
                              </span>
                            ) : null}
                            {!col && field.required ? (
                              <span className="ml-2">
                                <ExecutiveBadge tone="danger" variant="outline">
                                  Obrigatório
                                </ExecutiveBadge>
                              </span>
                            ) : null}
                          </TableCell>
                          <TableCell>
                            {conf && band ? (
                              <div className="flex flex-col gap-1">
                                <ExecutiveBadge
                                  tone={bandTone(band)}
                                  variant="soft"
                                >
                                  {band}
                                </ExecutiveBadge>
                                <span className="text-[11px] tabular-nums text-muted-foreground">
                                  {Math.round(conf.confidence * 100)}%
                                </span>
                              </div>
                            ) : (
                              <ExecutiveBadge tone="neutral" variant="outline">
                                Pendente
                              </ExecutiveBadge>
                            )}
                          </TableCell>
                          <TableCell>
                            {conf ? (
                              statusBadge(conf.status)
                            ) : (
                              <ExecutiveBadge tone="neutral" variant="outline">
                                Pendente
                              </ExecutiveBadge>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button type="button" disabled={pending} onClick={save}>
                  Guardar perfil
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={pending || !selectedProfileId}
                  onClick={duplicate}
                >
                  Duplicar
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  disabled={pending || !selectedProfileId}
                  onClick={remove}
                >
                  Remover
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function SummaryChip({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "success" | "warning" | "danger" | "neutral" | "info";
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-card/40 px-3 py-2.5">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <div className="mt-1 flex items-center gap-2">
        <span className="text-lg font-semibold tabular-nums">{value}</span>
        <ExecutiveBadge tone={tone} variant="soft">
          {label.split(" ")[0]}
        </ExecutiveBadge>
      </div>
    </div>
  );
}
