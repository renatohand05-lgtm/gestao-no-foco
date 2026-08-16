"use client";

import { useMemo, useState, useTransition } from "react";

import { buttonVariants } from "@/components/ui/button";
import { OPERATIONAL_AUTOCOMPLETE_PROPS } from "@/lib/ux/browser-autocomplete";
import {
  createCustomServiceForAgendaAction,
  adoptOneLibraryItemAction,
} from "@/lib/segments/library-actions.ts";
import {
  rankLibrarySuggestions,
  type CatalogSuggestionDto,
} from "@/lib/segments/catalogs/suggest.ts";
import { cn } from "@/lib/utils";

export type AgendaServiceOption = {
  id: string;
  label: string;
  minutes?: number | null;
};

type Props = {
  tenantSlug: string;
  servicos: AgendaServiceOption[];
  servicoId: string;
  onSelect: (service: AgendaServiceOption) => void;
  canCreate: boolean;
  library: CatalogSuggestionDto[];
};

export function AgendaServiceField({
  tenantSlug,
  servicos,
  servicoId,
  onSelect,
  canCreate,
  library,
}: Props) {
  const [panel, setPanel] = useState<"none" | "suggest" | "create">("none");
  const empty = servicos.length === 0;

  return (
    <div className="text-xs" data-fast-input="agenda-service">
      <span>Serviço {empty ? "" : "*"}</span>
      {empty ? (
        <p className="mt-1 text-sm text-muted-foreground">
          Nenhum serviço cadastrado.
        </p>
      ) : (
        <select
          className="mt-1 min-h-11 w-full rounded-md border bg-background px-2 py-1.5 text-sm"
          value={servicoId}
          autoComplete="off"
          onChange={(event) => {
            const id = event.target.value;
            const svc = servicos.find((s) => s.id === id);
            if (svc) onSelect(svc);
            else onSelect({ id: "", label: "" });
          }}
        >
          <option value="">Selecionar serviço</option>
          {servicos.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
              {s.minutes ? ` (${s.minutes} min)` : ""}
            </option>
          ))}
        </select>
      )}

      {canCreate ? (
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "min-h-11")}
            onClick={() => setPanel(panel === "suggest" ? "none" : "suggest")}
          >
            Escolher das sugestões
          </button>
          <button
            type="button"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "min-h-11")}
            onClick={() => setPanel(panel === "create" ? "none" : "create")}
          >
            + Criar serviço
          </button>
        </div>
      ) : empty ? (
        <p className="mt-2 text-sm text-muted-foreground">
          Peça a um administrador para cadastrar um serviço.
        </p>
      ) : null}

      {panel === "suggest" && canCreate ? (
        <AgendaAdoptPanel
          tenantSlug={tenantSlug}
          library={library}
          existingNames={servicos.map((s) => s.label)}
          onCancel={() => setPanel("none")}
          onUsed={(svc) => {
            onSelect(svc);
            setPanel("none");
          }}
        />
      ) : null}

      {panel === "create" && canCreate ? (
        <AgendaCustomPanel
          tenantSlug={tenantSlug}
          onCancel={() => setPanel("none")}
          onUsed={(svc) => {
            onSelect(svc);
            setPanel("none");
          }}
        />
      ) : null}
    </div>
  );
}

function AgendaAdoptPanel({
  tenantSlug,
  library,
  existingNames,
  onUsed,
  onCancel,
}: {
  tenantSlug: string;
  library: CatalogSuggestionDto[];
  existingNames: string[];
  onUsed: (svc: AgendaServiceOption) => void;
  onCancel: () => void;
}) {
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [preco, setPreco] = useState("");
  const [duracao, setDuracao] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const ranked = useMemo(
    () =>
      rankLibrarySuggestions({
        items: library,
        query,
        existingNames,
        mode: "adopt",
        limit: 12,
      }),
    [library, query, existingNames],
  );
  const selected = ranked.find((item) => item.id === selectedId) ?? null;

  function adopt() {
    if (!selected) {
      setError("Selecione um serviço sugerido.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await adoptOneLibraryItemAction(tenantSlug, {
        libraryItemId: selected.id,
        preco_venda: preco === "" ? null : Number(preco),
        tempo_estimado_minutos:
          duracao === ""
            ? selected.defaultDurationMinutes
            : Number(duracao),
      });
      if (!res.success || !res.id) {
        setError(res.success ? "Falha ao adotar." : res.error);
        return;
      }
      onUsed({
        id: res.id,
        label: res.nome,
        minutes: res.minutes,
      });
    });
  }

  return (
    <div
      className="mt-2 space-y-2 rounded-xl border p-3"
      data-fast-input="agenda-adopt"
    >
      <p className="text-sm font-medium">Serviços sugeridos para sua empresa</p>
      <input
        className="min-h-11 w-full rounded-md border bg-background px-2 text-sm"
        placeholder="Busca"
        value={query}
        name="gestoo-agenda-library-search"
        {...OPERATIONAL_AUTOCOMPLETE_PROPS}
        onChange={(event) => setQuery(event.target.value)}
      />
      <ul className="max-h-48 overflow-auto">
        {ranked.length === 0 ? (
          <li className="py-2 text-muted-foreground">Nenhuma sugestão.</li>
        ) : (
          ranked.map((item) => (
            <li key={item.id}>
              <label className="flex min-h-11 cursor-pointer items-center gap-2 rounded-md px-2 hover:bg-muted">
                <input
                  type="radio"
                  name="agenda-library-one"
                  checked={selectedId === item.id}
                  onChange={() => {
                    setSelectedId(item.id);
                    setDuracao(
                      item.defaultDurationMinutes
                        ? String(item.defaultDurationMinutes)
                        : "",
                    );
                  }}
                />
                <span>
                  {item.name}
                  <span className="ml-2 text-[11px] text-muted-foreground">
                    {item.category}
                    {item.defaultDurationMinutes
                      ? ` · ${item.defaultDurationMinutes} min`
                      : ""}
                  </span>
                </span>
              </label>
            </li>
          ))
        )}
      </ul>
      {selected ? (
        <div className="grid gap-2 sm:grid-cols-2">
          <label>
            Preço
            <input
              type="number"
              min={0}
              step="0.01"
              className="mt-1 min-h-11 w-full rounded-md border px-2"
              value={preco}
              placeholder="Opcional"
              {...OPERATIONAL_AUTOCOMPLETE_PROPS}
              onChange={(event) => setPreco(event.target.value)}
            />
          </label>
          <label>
            Duração (min)
            <input
              type="number"
              min={0}
              className="mt-1 min-h-11 w-full rounded-md border px-2"
              value={duracao}
              {...OPERATIONAL_AUTOCOMPLETE_PROPS}
              onChange={(event) => setDuracao(event.target.value)}
            />
          </label>
        </div>
      ) : null}
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={pending || !selected}
          className={cn(buttonVariants(), "min-h-11")}
          onClick={adopt}
        >
          {pending ? "Salvando..." : "Adicionar e usar"}
        </button>
        <button
          type="button"
          className={cn(buttonVariants({ variant: "ghost" }), "min-h-11")}
          onClick={onCancel}
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}

function AgendaCustomPanel({
  tenantSlug,
  onUsed,
  onCancel,
}: {
  tenantSlug: string;
  onUsed: (svc: AgendaServiceOption) => void;
  onCancel: () => void;
}) {
  const [nome, setNome] = useState("");
  const [preco, setPreco] = useState("");
  const [duracao, setDuracao] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function save() {
    if (nome.trim().length < 2) {
      setError("Informe o nome do serviço.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await createCustomServiceForAgendaAction(tenantSlug, {
        nome: nome.trim(),
        preco_venda: preco === "" ? null : Number(preco),
        tempo_estimado_minutos: duracao === "" ? null : Number(duracao),
      });
      if (!res.success || !res.id) {
        setError(res.success ? "Falha ao criar." : res.error);
        return;
      }
      onUsed({
        id: res.id,
        label: res.nome,
        minutes: res.minutes,
      });
    });
  }

  return (
    <div
      className="mt-2 space-y-2 rounded-xl border p-3"
      data-fast-input="agenda-quick-create"
    >
      <p className="text-sm font-medium">Novo serviço</p>
      <label>
        Nome *
        <input
          className="mt-1 min-h-11 w-full rounded-md border px-2 text-sm"
          value={nome}
          name="gestoo-agenda-custom-service"
          {...OPERATIONAL_AUTOCOMPLETE_PROPS}
          onChange={(event) => setNome(event.target.value)}
        />
      </label>
      <div className="grid gap-2 sm:grid-cols-2">
        <label>
          Preço
          <input
            type="number"
            min={0}
            step="0.01"
            className="mt-1 min-h-11 w-full rounded-md border px-2"
            value={preco}
            placeholder="Opcional"
            {...OPERATIONAL_AUTOCOMPLETE_PROPS}
            onChange={(event) => setPreco(event.target.value)}
          />
        </label>
        <label>
          Duração
          <input
            type="number"
            min={0}
            className="mt-1 min-h-11 w-full rounded-md border px-2"
            value={duracao}
            placeholder="min"
            {...OPERATIONAL_AUTOCOMPLETE_PROPS}
            onChange={(event) => setDuracao(event.target.value)}
          />
        </label>
      </div>
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={pending}
          className={cn(buttonVariants(), "min-h-11")}
          onClick={save}
        >
          {pending ? "Salvando..." : "Salvar e usar"}
        </button>
        <button
          type="button"
          className={cn(buttonVariants({ variant: "ghost" }), "min-h-11")}
          onClick={onCancel}
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
