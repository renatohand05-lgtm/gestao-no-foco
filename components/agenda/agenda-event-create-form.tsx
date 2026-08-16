"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import { buttonVariants } from "@/components/ui/button";
import { createAgendaEventAction } from "@/lib/agenda/actions";
import {
  BUSINESS_EVENT_TYPE_LABELS,
  BUSINESS_EVENT_TYPES,
  INTERNAL_EVENT_TYPE_LABELS,
  INTERNAL_EVENT_TYPES,
  endIsoFromDuration,
  type AgendaNature,
} from "@/lib/retention/natures";
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
};

const NATURE_LABEL: Record<AgendaNature, string> = {
  cliente: "Cliente / atendimento",
  negocio: "Negócio / compromisso",
  interno: "Interno / disponibilidade",
};

export function AgendaEventCreateForm({
  tenantSlug,
  clientes,
  servicos,
  profissionais,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [natureza, setNatureza] = useState<AgendaNature>("cliente");
  const [titulo, setTitulo] = useState("");
  const [tipo, setTipo] = useState("atendimento");
  const [clienteId, setClienteId] = useState("");
  const [servicoId, setServicoId] = useState("");
  const [responsavelId, setResponsavelId] = useState("");
  const [inicio, setInicio] = useState("");
  const [duracao, setDuracao] = useState(60);
  const [fim, setFim] = useState("");
  const [endereco, setEndereco] = useState("");
  const [meetingUrl, setMeetingUrl] = useState("");
  const [observacao, setObservacao] = useState("");
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
        inicio: inicioIso,
        fim: fimIso,
        recorrencia_frequency: freq,
        recorrencia_count: count,
        override_conflito: override,
        override_justificativa: justificativa || null,
      });
      if (!res.success) {
        setError(res.error ?? "Falha");
        return;
      }
      setTitulo("");
      router.refresh();
    });
  }

  return (
    <div
      className="space-y-3 rounded-xl border p-4"
      data-phase28="agenda-create"
      data-phase35="agenda-create"
    >
      <h2 className="text-sm font-semibold">Novo evento</h2>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        <label className="text-xs">
          Natureza
          <select
            className="mt-1 w-full rounded-md border bg-background px-2 py-1.5 text-sm"
            value={natureza}
            onChange={(e) => {
              const next = e.target.value as AgendaNature;
              setNatureza(next);
              setTipo(
                next === "cliente"
                  ? "atendimento"
                  : next === "interno"
                    ? "bloqueio"
                    : "compromisso",
              );
            }}
          >
            {(Object.keys(NATURE_LABEL) as AgendaNature[]).map((k) => (
              <option key={k} value={k}>
                {NATURE_LABEL[k]}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs">
          Tipo
          <select
            className="mt-1 w-full rounded-md border bg-background px-2 py-1.5 text-sm"
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
        <label className="text-xs">
          Título
          <input
            className="mt-1 w-full rounded-md border bg-background px-2 py-1.5 text-sm"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            aria-label="Título do evento"
          />
        </label>
        {natureza !== "interno" ? (
          <label className="text-xs">
            Cliente {natureza === "cliente" ? "(obrigatório)" : "(opcional)"}
            <select
              className="mt-1 w-full rounded-md border bg-background px-2 py-1.5 text-sm"
              value={clienteId}
              onChange={(e) => setClienteId(e.target.value)}
            >
              <option value="">Selecionar cliente</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
            <a
              className="mt-1 inline-block text-[11px] underline"
              href={`/${tenantSlug}/clientes/novo`}
            >
              Cadastrar novo cliente
            </a>
          </label>
        ) : null}
        {natureza === "cliente" ? (
          <label className="text-xs">
            Serviço
            <select
              className="mt-1 w-full rounded-md border bg-background px-2 py-1.5 text-sm"
              value={servicoId}
              onChange={(e) => {
                const id = e.target.value;
                setServicoId(id);
                const svc = servicos.find((s) => s.id === id);
                if (svc?.minutes) {
                  setDuracao(svc.minutes);
                  applyDuration(inicio, svc.minutes);
                }
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
          </label>
        ) : null}
        <label className="text-xs">
          Profissional responsável
          <select
            className="mt-1 w-full rounded-md border bg-background px-2 py-1.5 text-sm"
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
        <label className="text-xs">
          Início
          <input
            type="datetime-local"
            className="mt-1 w-full rounded-md border bg-background px-2 py-1.5 text-sm"
            value={inicio}
            onChange={(e) => {
              setInicio(e.target.value);
              applyDuration(e.target.value, duracao);
            }}
          />
        </label>
        <label className="text-xs">
          Duração (min)
          <input
            type="number"
            min={5}
            className="mt-1 w-full rounded-md border bg-background px-2 py-1.5 text-sm"
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
            className="mt-1 w-full rounded-md border bg-background px-2 py-1.5 text-sm"
            value={fim}
            onChange={(e) => setFim(e.target.value)}
          />
        </label>
        {natureza === "negocio" ? (
          <>
            <label className="text-xs">
              Local
              <input
                className="mt-1 w-full rounded-md border bg-background px-2 py-1.5 text-sm"
                value={endereco}
                onChange={(e) => setEndereco(e.target.value)}
              />
            </label>
            <label className="text-xs">
              Link da reunião
              <input
                className="mt-1 w-full rounded-md border bg-background px-2 py-1.5 text-sm"
                value={meetingUrl}
                onChange={(e) => setMeetingUrl(e.target.value)}
              />
            </label>
          </>
        ) : null}
        <label className="text-xs sm:col-span-2">
          Observações
          <input
            className="mt-1 w-full rounded-md border bg-background px-2 py-1.5 text-sm"
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
          />
        </label>
        <label className="text-xs">
          Recorrência
          <select
            className="mt-1 w-full rounded-md border bg-background px-2 py-1.5 text-sm"
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
              className="mt-1 w-full rounded-md border bg-background px-2 py-1.5 text-sm"
              value={count}
              onChange={(e) => setCount(Number(e.target.value) || 1)}
            />
          </label>
        ) : null}
      </div>
      <label className="flex items-center gap-2 text-xs">
        <input
          type="checkbox"
          checked={override}
          onChange={(e) => setOverride(e.target.checked)}
        />
        Confirmar override de conflito (owner/admin)
      </label>
      {override ? (
        <input
          className="w-full rounded-md border bg-background px-2 py-1.5 text-sm"
          placeholder="Justificativa do override"
          value={justificativa}
          onChange={(e) => setJustificativa(e.target.value)}
        />
      ) : null}
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      <button
        type="button"
        disabled={pending}
        className={cn(buttonVariants())}
        onClick={submit}
      >
        {pending ? "Salvando..." : "Criar evento"}
      </button>
    </div>
  );
}
