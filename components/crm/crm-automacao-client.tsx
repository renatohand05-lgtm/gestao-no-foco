"use client";

import { useState, useTransition } from "react";
import { Plus, Send, Trash2, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SectionCard } from "@/components/ui/section-card";
import {
  createSequenceAction,
  enrollClientesAction,
  listSequencesAction,
  searchClientesAction,
  toggleSequenceActiveAction,
} from "@/lib/crm/sequence-actions";
import type {
  ClienteSearchResult,
  CrmSequence,
  CrmSequenceStepInput,
} from "@/lib/crm/sequence-service";

type Props = {
  tenantSlug: string;
  initialSequences: CrmSequence[];
};

function emptyStep(ordem: number): CrmSequenceStepInput {
  return { ordem, delayDias: ordem === 1 ? 0 : 3, canal: "whatsapp", mensagem: "" };
}

export function CrmAutomacaoClient({ tenantSlug, initialSequences }: Props) {
  const [sequences, setSequences] = useState(initialSequences);
  const [creating, setCreating] = useState(false);
  const [nome, setNome] = useState("");
  const [steps, setSteps] = useState<CrmSequenceStepInput[]>([emptyStep(1)]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [enrollTarget, setEnrollTarget] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ClienteSearchResult[]>([]);
  const [selected, setSelected] = useState<ClienteSearchResult[]>([]);
  const [enrollMsg, setEnrollMsg] = useState<string | null>(null);

  async function reload() {
    const result = await listSequencesAction(tenantSlug);
    if (result.success) setSequences(result.data);
  }

  function updateStep(index: number, patch: Partial<CrmSequenceStepInput>) {
    setSteps((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  }

  function addStep() {
    setSteps((prev) => [...prev, emptyStep(prev.length + 1)]);
  }

  function removeStep(index: number) {
    setSteps((prev) =>
      prev.filter((_, i) => i !== index).map((s, i) => ({ ...s, ordem: i + 1 })),
    );
  }

  function handleCreate() {
    setError(null);
    if (!nome.trim()) {
      setError("Dê um nome pra sequência.");
      return;
    }
    if (steps.some((s) => !s.mensagem.trim())) {
      setError("Preencha a mensagem de todas as etapas.");
      return;
    }
    startTransition(async () => {
      const result = await createSequenceAction(tenantSlug, nome, steps);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setNome("");
      setSteps([emptyStep(1)]);
      setCreating(false);
      void reload();
    });
  }

  function handleToggle(id: string, ativo: boolean) {
    startTransition(async () => {
      await toggleSequenceActiveAction(tenantSlug, id, ativo);
      void reload();
    });
  }

  function handleSearch(q: string) {
    setQuery(q);
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    startTransition(async () => {
      const result = await searchClientesAction(tenantSlug, q);
      if (result.success) setResults(result.data);
    });
  }

  function toggleSelected(c: ClienteSearchResult) {
    setSelected((prev) =>
      prev.some((s) => s.id === c.id)
        ? prev.filter((s) => s.id !== c.id)
        : [...prev, c],
    );
  }

  function handleEnroll() {
    if (!enrollTarget || selected.length === 0) return;
    setEnrollMsg(null);
    startTransition(async () => {
      const result = await enrollClientesAction(
        tenantSlug,
        enrollTarget,
        selected.map((s) => s.id),
      );
      if (!result.success) {
        setEnrollMsg(result.error);
        return;
      }
      setEnrollMsg(
        `${result.inscritos} inscrito(s)${result.jaInscritos > 0 ? `, ${result.jaInscritos} já estava(m) inscrito(s)` : ""}.`,
      );
      setSelected([]);
      setQuery("");
      setResults([]);
      void reload();
    });
  }

  return (
    <div className="space-y-6">
      <SectionCard
        title="Automação comercial"
        description="Sequências de mensagens agendadas por WhatsApp ou e-mail, disparadas automaticamente conforme o cliente avança na sequência."
      >
        <div className="space-y-4">
          {!creating ? (
            <Button type="button" onClick={() => setCreating(true)}>
              <Plus className="mr-2 size-4" />
              Nova sequência
            </Button>
          ) : (
            <div className="space-y-3 rounded-md border border-border/60 p-4">
              <input
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Nome da sequência (ex: Boas-vindas)"
                className="h-9 w-full rounded-md border border-border/60 bg-background px-3 text-sm"
              />

              {steps.map((step, i) => (
                <div
                  key={i}
                  className="flex flex-col gap-2 rounded-md border border-border/40 p-3 sm:flex-row sm:items-start"
                >
                  <div className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                    <span className="font-medium">Etapa {step.ordem}</span>
                    <span>·</span>
                    <span>esperar</span>
                    <input
                      type="number"
                      min={0}
                      value={step.delayDias}
                      onChange={(e) =>
                        updateStep(i, { delayDias: Number(e.target.value) })
                      }
                      className="h-7 w-14 rounded border border-border/60 bg-background px-1 text-center text-xs"
                    />
                    <span>dia(s)</span>
                  </div>
                  <select
                    value={step.canal}
                    onChange={(e) =>
                      updateStep(i, { canal: e.target.value as "whatsapp" | "email" })
                    }
                    className="h-8 shrink-0 rounded-md border border-border/60 bg-background px-2 text-xs"
                  >
                    <option value="whatsapp">WhatsApp</option>
                    <option value="email">E-mail</option>
                  </select>
                  <textarea
                    value={step.mensagem}
                    onChange={(e) => updateStep(i, { mensagem: e.target.value })}
                    placeholder="Mensagem — use {{nome}} pra personalizar"
                    rows={2}
                    className="flex-1 rounded-md border border-border/60 bg-background px-3 py-1.5 text-sm"
                  />
                  {steps.length > 1 ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeStep(i)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  ) : null}
                </div>
              ))}

              <Button type="button" variant="outline" size="sm" onClick={addStep}>
                <Plus className="mr-1 size-3.5" />
                Adicionar etapa
              </Button>

              {error ? (
                <p className="text-sm text-red-600" role="alert">
                  {error}
                </p>
              ) : null}

              <div className="flex gap-2">
                <Button type="button" onClick={handleCreate} disabled={isPending}>
                  {isPending ? "Salvando…" : "Salvar sequência"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setCreating(false);
                    setError(null);
                  }}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            {sequences.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhuma sequência criada ainda.
              </p>
            ) : (
              sequences.map((seq) => (
                <div
                  key={seq.id}
                  className="rounded-md border border-border/60 p-3"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{seq.nome}</p>
                      <p className="text-xs text-muted-foreground">
                        {seq.steps.length} etapa(s) · {seq.inscritosAtivos} inscrito(s) ativo(s)
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setEnrollTarget(enrollTarget === seq.id ? null : seq.id)
                        }
                      >
                        <Users className="mr-1 size-3.5" />
                        Inscrever
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggle(seq.id, !seq.ativo)}
                      >
                        {seq.ativo ? "Ativa" : "Pausada"}
                      </Button>
                    </div>
                  </div>

                  {enrollTarget === seq.id ? (
                    <div className="mt-3 space-y-2 rounded-md bg-muted/30 p-3">
                      <input
                        type="text"
                        value={query}
                        onChange={(e) => handleSearch(e.target.value)}
                        placeholder="Buscar cliente pelo nome…"
                        className="h-8 w-full rounded-md border border-border/60 bg-background px-3 text-sm"
                      />
                      {results.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {results.map((c) => (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => toggleSelected(c)}
                              className={`rounded-full border px-2.5 py-1 text-xs ${
                                selected.some((s) => s.id === c.id)
                                  ? "border-primary bg-primary/10"
                                  : "border-border/60"
                              }`}
                            >
                              {c.nome}
                            </button>
                          ))}
                        </div>
                      ) : null}
                      {selected.length > 0 ? (
                        <p className="text-xs text-muted-foreground">
                          {selected.length} cliente(s) selecionado(s)
                        </p>
                      ) : null}
                      {enrollMsg ? (
                        <p className="text-xs text-muted-foreground">{enrollMsg}</p>
                      ) : null}
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleEnroll}
                        disabled={isPending || selected.length === 0}
                      >
                        <Send className="mr-1 size-3.5" />
                        Inscrever {selected.length > 0 ? selected.length : ""}
                      </Button>
                    </div>
                  ) : null}
                </div>
              ))
            )}
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
