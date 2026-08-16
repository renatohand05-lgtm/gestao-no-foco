"use client";

import { useMemo, useState, useTransition } from "react";

import { buttonVariants } from "@/components/ui/button";
import { FastInputCtaBar, MoreDetails } from "@/components/ui/more-details";
import { PostSaveActions } from "@/components/ui/post-save-actions";
import { createAgendaEventAction } from "@/lib/agenda/actions";
import {
  BUSINESS_EVENT_TYPE_LABELS,
  BUSINESS_EVENT_TYPES,
  INTERNAL_EVENT_TYPE_LABELS,
  INTERNAL_EVENT_TYPES,
  endIsoFromDuration,
  natureRequiresCliente,
  type AgendaNature,
} from "@/lib/retention/natures";
import { AgendaServiceField } from "@/components/agenda/agenda-service-field";
import {
  novoClienteFromAgendaHref,
  type AgendaCreateContext,
} from "@/lib/ux/fast-input";
import type { CatalogSuggestionDto } from "@/lib/segments/catalogs/suggest.ts";
import { cn } from "@/lib/utils";

export type AgendaSelectOption = {
  id: string;
  label: string;
  minutes?: number | null;
  phone?: string | null;
};

type Props = {
  tenantSlug: string;
  clientes: AgendaSelectOption[];
  servicos: AgendaSelectOption[];
  profissionais: AgendaSelectOption[];
  initial?: AgendaCreateContext;
  library?: CatalogSuggestionDto[];
  canCreateProduto?: boolean;
};

const NATURE_LABEL: Record<AgendaNature, string> = {
  cliente: "Cliente / atendimento",
  negocio: "Negócio / compromisso",
  interno: "Interno / disponibilidade",
};

function defaultTipo(natureza: AgendaNature): string {
  if (natureza === "cliente") return "atendimento";
  if (natureza === "interno") return "bloqueio";
  return "compromisso";
}

function toDatetimeLocalValue(raw: string | null | undefined): string {
  if (!raw) return "";
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(raw)) return raw.slice(0, 16);
  return raw;
}

export function AgendaEventCreateForm({
  tenantSlug,
  clientes,
  servicos,
  profissionais,
  initial,
  library = [],
  canCreateProduto = false,
}: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [commNote, setCommNote] = useState<string | null>(null);
  const initialNatureza: AgendaNature = initial?.natureza ?? "cliente";
  const [natureza, setNatureza] = useState<AgendaNature>(initialNatureza);
  const [titulo, setTitulo] = useState("");
  const [tipo, setTipo] = useState(defaultTipo(initialNatureza));
  const [clienteId, setClienteId] = useState(initial?.clienteId ?? "");
  const [servicoId, setServicoId] = useState(initial?.servicoId ?? "");
  const [catalogoServicos, setCatalogoServicos] = useState(servicos);
  const initialMinutes =
    servicos.find((s) => s.id === initial?.servicoId)?.minutes ?? 60;
  const [duracao, setDuracao] = useState(initialMinutes);
  const [inicio, setInicio] = useState(
    toDatetimeLocalValue(initial?.inicioLocal),
  );
  const [fim, setFim] = useState("");
  const [responsavelId, setResponsavelId] = useState(
    initial?.profissionalId ?? "",
  );
  const [returnId] = useState(initial?.returnId ?? "");
  const [endereco, setEndereco] = useState("");
  const [meetingUrl, setMeetingUrl] = useState("");
  const [observacao, setObservacao] = useState("");
  const [lembrete, setLembrete] = useState("");
  const [freq, setFreq] = useState<"nenhuma" | "diaria" | "semanal" | "mensal">(
    "nenhuma",
  );
  const [count, setCount] = useState(1);
  const [override, setOverride] = useState(false);
  const [justificativa, setJustificativa] = useState("");

  const tipoOptions = useMemo(() => {
    if (natureza === "interno") {
      return INTERNAL_EVENT_TYPES.map((v) => ({
        value: v,
        label: INTERNAL_EVENT_TYPE_LABELS[v],
      }));
    }
    if (natureza === "negocio") {
      return BUSINESS_EVENT_TYPES.map((v) => ({
        value: v,
        label: BUSINESS_EVENT_TYPE_LABELS[v],
      }));
    }
    return [{ value: "atendimento", label: "Atendimento" }];
  }, [natureza]);

  function applyDuration(nextStart: string, minutes: number) {
    if (!nextStart) return;
    const startIso = nextStart.includes("T")
      ? new Date(nextStart).toISOString()
      : new Date(`${nextStart}:00`).toISOString();
    const end = endIsoFromDuration(startIso, minutes);
    const local = new Date(end);
    const pad = (n: number) => String(n).padStart(2, "0");
    setFim(
      `${local.getFullYear()}-${pad(local.getMonth() + 1)}-${pad(local.getDate())}T${pad(local.getHours())}:${pad(local.getMinutes())}`,
    );
  }

  function selectServico(svc: { id: string; label: string; minutes?: number | null }) {
    if (svc.id) {
      setCatalogoServicos((prev) =>
        prev.some((item) => item.id === svc.id) ? prev : [...prev, svc],
      );
    }
    setServicoId(svc.id);
    if (svc.minutes) {
      setDuracao(svc.minutes);
      applyDuration(inicio, svc.minutes);
    }
  }

  function resetForm() {
    setCreatedId(null);
    setCommNote(null);
    setError(null);
    setTitulo("");
    setObservacao("");
    setMeetingUrl("");
    setEndereco("");
    setOverride(false);
    setJustificativa("");
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      const inicioIso = inicio.includes("T")
        ? new Date(inicio).toISOString()
        : new Date(`${inicio}:00`).toISOString();
      const fimIso = fim
        ? fim.includes("T")
          ? new Date(fim).toISOString()
          : new Date(`${fim}:00`).toISOString()
        : endIsoFromDuration(inicioIso, duracao);
      const res = await createAgendaEventAction(tenantSlug, {
        titulo:
          titulo.trim() ||
          (natureza === "cliente" ? "Atendimento" : NATURE_LABEL[natureza]),
        tipo,
        natureza,
        cliente_id: clienteId || null,
        servico_id: servicoId || null,
        responsavel_id: responsavelId || null,
        duracao_minutos: duracao,
        meeting_url: meetingUrl || null,
        endereco: endereco || null,
        observacao: observacao || null,
        lembrete_minutos: lembrete ? Number(lembrete) : null,
        inicio: inicioIso,
        fim: fimIso,
        recorrencia_frequency: freq,
        recorrencia_count: count,
        override_conflito: override,
        override_justificativa: justificativa || null,
        return_id: returnId || null,
      });
      if (!res.success) {
        setError(res.error ?? "Falha");
        return;
      }
      setCreatedId(res.id ?? "ok");
      setCommNote(res.commNote ?? null);
    });
  }

  if (createdId) {
    return (
      <PostSaveActions
        title="Agendamento criado"
        description={commNote ?? undefined}
        actions={[
          {
            href: `/${tenantSlug}/agenda`,
            label: "Ver agenda",
            primary: true,
          },
          {
            label: "Novo agendamento",
            onClick: resetForm,
          },
          ...(clienteId
            ? [
                {
                  href: `/${tenantSlug}/clientes/${clienteId}`,
                  label: "Ver cliente",
                },
              ]
            : []),
        ]}
      />
    );
  }

  const fieldClass =
    "mt-1 w-full rounded-md border bg-background px-2 py-1.5 text-sm min-h-11";

  return (
    <div
      className="space-y-3 rounded-xl border p-4"
      data-phase28="agenda-create"
      data-phase35="agenda-create"
      data-fast-input="agenda"
    >
      <h2 className="text-sm font-semibold">Novo agendamento</h2>
      <div
        className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3"
        data-fast-input="essentials"
      >
        {!initial?.natureza ? (
          <label className="text-xs">
            Natureza
            <select
              className={fieldClass}
              value={natureza}
              onChange={(e) => {
                const next = e.target.value as AgendaNature;
                setNatureza(next);
                setTipo(defaultTipo(next));
              }}
            >
              {(Object.keys(NATURE_LABEL) as AgendaNature[]).map((k) => (
                <option key={k} value={k}>
                  {NATURE_LABEL[k]}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        {natureza !== "cliente" ? (
          <label className="text-xs">
            Tipo
            <select
              className={fieldClass}
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
            >
              {tipoOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        {natureza !== "interno" ? (
          <label className="text-xs">
            Cliente {natureRequiresCliente(natureza) ? "*" : "(opcional)"}
            <select
              className={fieldClass}
              value={clienteId}
              onChange={(e) => setClienteId(e.target.value)}
              disabled={Boolean(initial?.clienteId)}
            >
              <option value="">Selecionar cliente</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
            {!initial?.clienteId ? (
              <a
                className="mt-1 inline-block text-[11px] underline"
                href={novoClienteFromAgendaHref(tenantSlug)}
              >
                Cadastrar novo cliente
              </a>
            ) : null}
          </label>
        ) : null}
        {natureza === "cliente" ? (
          <AgendaServiceField
            tenantSlug={tenantSlug}
            servicos={catalogoServicos}
            servicoId={servicoId}
            onSelect={selectServico}
            canCreate={canCreateProduto}
            library={library}
          />
        ) : null}
        <label className="text-xs">
          Data e hora *
          <input
            type="datetime-local"
            className={fieldClass}
            value={inicio}
            onChange={(e) => {
              setInicio(e.target.value);
              applyDuration(e.target.value, duracao);
            }}
          />
        </label>
        {profissionais.length > 0 ? (
          <label className="text-xs">
            Profissional
            <select
              className={fieldClass}
              value={responsavelId}
              onChange={(e) => setResponsavelId(e.target.value)}
            >
              <option value="">Sem responsável</option>
              {profissionais.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>

      <FastInputCtaBar>
        <button
          type="button"
          disabled={pending}
          className={cn(buttonVariants(), "min-h-11")}
          onClick={submit}
        >
          {pending ? "Salvando..." : "Agendar"}
        </button>
      </FastInputCtaBar>

      <MoreDetails summary="Mais opções">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {initial?.natureza ? (
            <label className="text-xs">
              Natureza
              <select
                className={fieldClass}
                value={natureza}
                onChange={(e) => {
                  const next = e.target.value as AgendaNature;
                  setNatureza(next);
                  setTipo(defaultTipo(next));
                }}
              >
                {(Object.keys(NATURE_LABEL) as AgendaNature[]).map((k) => (
                  <option key={k} value={k}>
                    {NATURE_LABEL[k]}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          {natureza === "cliente" ? (
            <label className="text-xs">
              Tipo
              <select
                className={fieldClass}
                value={tipo}
                onChange={(e) => setTipo(e.target.value)}
              >
                {tipoOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <label className="text-xs">
            Título
            <input
              className={fieldClass}
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              aria-label="Título do evento"
            />
          </label>
          <label className="text-xs">
            Duração (min)
            <input
              type="number"
              min={5}
              className={fieldClass}
              value={duracao}
              onChange={(e) => {
                const n = Number(e.target.value) || 60;
                setDuracao(n);
                applyDuration(inicio, n);
              }}
            />
          </label>
          <label className="text-xs">
            Fim
            <input
              type="datetime-local"
              className={fieldClass}
              value={fim}
              onChange={(e) => setFim(e.target.value)}
            />
          </label>
          <label className="text-xs">
            Lembrete personalizado (min antes)
            <input
              type="number"
              min={0}
              className={fieldClass}
              value={lembrete}
              onChange={(e) => setLembrete(e.target.value)}
            />
          </label>
          <label className="text-xs">
            Local
            <input
              className={fieldClass}
              value={endereco}
              onChange={(e) => setEndereco(e.target.value)}
            />
          </label>
          <label className="text-xs">
            Link da reunião
            <input
              className={fieldClass}
              value={meetingUrl}
              onChange={(e) => setMeetingUrl(e.target.value)}
            />
          </label>
          <label className="text-xs sm:col-span-2">
            Observações
            <input
              className={fieldClass}
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
            />
          </label>
          <label className="text-xs">
            Recorrência
            <select
              className={fieldClass}
              value={freq}
              onChange={(e) => setFreq(e.target.value as typeof freq)}
            >
              <option value="nenhuma">Nenhuma</option>
              <option value="diaria">Diária</option>
              <option value="semanal">Semanal</option>
              <option value="mensal">Mensal</option>
            </select>
          </label>
          {freq !== "nenhuma" ? (
            <label className="text-xs">
              Ocorrências (máx. 52)
              <input
                type="number"
                min={1}
                max={52}
                className={fieldClass}
                value={count}
                onChange={(e) => setCount(Number(e.target.value) || 1)}
              />
            </label>
          ) : null}
        </div>
        <label className="mt-3 flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={override}
            onChange={(e) => setOverride(e.target.checked)}
          />
          Confirmar override de conflito (owner/admin)
        </label>
        {override ? (
          <input
            className={cn(fieldClass, "mt-2")}
            placeholder="Justificativa do override"
            value={justificativa}
            onChange={(e) => setJustificativa(e.target.value)}
          />
        ) : null}
      </MoreDetails>
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
