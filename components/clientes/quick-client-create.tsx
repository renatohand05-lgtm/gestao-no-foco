"use client";

import { useState, useTransition } from "react";

import { RelationshipTypeSelector } from "@/components/clientes/relationship-type-selector";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  checkClienteDuplicatesAction,
  createClienteAction,
} from "@/lib/clientes/actions";
import {
  origemForRelationship,
  type ClientRelationship,
} from "@/lib/clientes/relationship";
import { CRM_FUNIL_LABELS, CRM_FUNIL_STAGES } from "@/lib/crm/constants";
import { cn } from "@/lib/utils";

type Dup = { id: string; label: string; matchedOn: string[] };

type Props = {
  tenantSlug: string;
  showVehicles?: boolean;
  allowBusiness?: boolean;
  onCreated: (input: { id: string; nome: string }) => void;
};

function emptyClientePayload(
  mode: ClientRelationship,
  fields: {
    nome: string;
    whatsapp: string;
    email: string;
    empresa: string;
    estagio: string;
  },
) {
  const empresa = fields.empresa.trim();
  return {
    tipo_pessoa: mode === "negocio" ? ("pj" as const) : ("pf" as const),
    nome: fields.nome,
    razao_social: mode === "negocio" ? empresa || fields.nome : "",
    nome_fantasia: empresa,
    ie_rg: "",
    documento: "",
    telefone: fields.whatsapp,
    whatsapp: fields.whatsapp,
    email: fields.email,
    data_referencia: "",
    cep: "",
    rua: "",
    numero: "",
    complemento: "",
    bairro: "",
    cidade: "",
    estado: "",
    segmento: "",
    porte: "",
    origem: origemForRelationship(mode),
    observacoes: "",
    classificacao: "",
    score: 0,
    consultor_id: "",
    empresa_id: "",
    filial_id: "",
    valor_estimado: null,
    probabilidade: null,
    data_prevista_fechamento: "",
    motivo_perda: "",
    estagio_funil: (CRM_FUNIL_STAGES.includes(fields.estagio as (typeof CRM_FUNIL_STAGES)[number])
      ? fields.estagio
      : "lead") as (typeof CRM_FUNIL_STAGES)[number],
    tag_ids: [] as string[],
    ativo: true,
  };
}

export function QuickClientCreate({
  tenantSlug,
  allowBusiness = false,
  onCreated,
}: Props) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<ClientRelationship>("atendimento");
  const [error, setError] = useState<string | null>(null);
  const [dups, setDups] = useState<Dup[]>([]);
  const [pending, startTransition] = useTransition();

  if (!open) {
    return (
      <button
        type="button"
        className="mt-1 inline-block text-[11px] underline"
        onClick={() => setOpen(true)}
      >
        + Novo cliente
      </button>
    );
  }

  return (
    <div className="mt-2 space-y-2 rounded-lg border p-3" data-quick-client="">
      {allowBusiness ? (
        <RelationshipTypeSelector value={mode} onChange={setMode} disabled={pending} />
      ) : null}
      {dups.length ? (
        <div className="space-y-2 rounded-md border border-amber-300 bg-amber-50 p-2 text-sm">
          <p className="font-medium">Cliente já existente?</p>
          <ul className="space-y-1">
            {dups.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center justify-between gap-2">
                <span>
                  {d.label}
                  <span className="text-muted-foreground">
                    {" "}
                    · {d.matchedOn.join(", ")}
                  </span>
                </span>
                <button
                  type="button"
                  className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                  onClick={() => {
                    onCreated({ id: d.id, nome: d.label });
                    setOpen(false);
                    setDups([]);
                  }}
                >
                  Usar este
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <form
        className="grid gap-2 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          setError(null);
          setDups([]);
          const fd = new FormData(e.currentTarget);
          const nome = String(fd.get("nome") ?? "").trim();
          const whatsapp = String(fd.get("whatsapp") ?? "").trim();
          const email = String(fd.get("email") ?? "").trim();
          const empresa = String(fd.get("empresa") ?? "").trim();
          const estagio = String(fd.get("estagio_funil") ?? "lead");
          startTransition(async () => {
            const dup = await checkClienteDuplicatesAction(tenantSlug, {
              email: email || null,
              telefone: whatsapp || null,
            });
            if (dup.success && dup.result.hasDuplicates) {
              setDups(dup.result.matches);
              setError("Cliente já existente? Confirme antes de criar outro.");
              return;
            }
            const result = await createClienteAction(
              tenantSlug,
              emptyClientePayload(mode, { nome, whatsapp, email, empresa, estagio }),
            );
            if (!result.success || !result.id) {
              setError(result.success ? "Falha ao criar." : result.error);
              return;
            }
            onCreated({ id: result.id, nome });
            setOpen(false);
          });
        }}
      >
        <label className="text-xs sm:col-span-2">
          {mode === "negocio" ? "Nome / Razão social *" : "Nome *"}
          <Input name="nome" required disabled={pending} className="mt-1 h-11" />
        </label>
        {mode === "negocio" ? (
          <>
            <label className="text-xs sm:col-span-2">
              Empresa
              <Input name="empresa" disabled={pending} className="mt-1 h-11" />
            </label>
            <label className="text-xs sm:col-span-2">
              Etapa
              <select
                name="estagio_funil"
                defaultValue="lead"
                disabled={pending}
                className="mt-1 h-11 w-full rounded-md border bg-background px-2 text-sm"
              >
                {CRM_FUNIL_STAGES.map((stage) => (
                  <option key={stage} value={stage}>
                    {CRM_FUNIL_LABELS[stage]}
                  </option>
                ))}
              </select>
            </label>
          </>
        ) : null}
        <label className="text-xs">
          WhatsApp / telefone
          <Input name="whatsapp" disabled={pending} className="mt-1 h-11" />
        </label>
        <label className="text-xs">
          E-mail
          <Input name="email" type="email" disabled={pending} className="mt-1 h-11" />
        </label>
        {error ? (
          <p className="text-sm text-destructive sm:col-span-2" role="alert">
            {error}
          </p>
        ) : null}
        <div className="flex flex-wrap gap-2 sm:col-span-2">
          <button type="submit" disabled={pending} className={cn(buttonVariants(), "min-h-11")}>
            {pending ? "Salvando…" : "Salvar e usar"}
          </button>
          <button
            type="button"
            className={cn(buttonVariants({ variant: "ghost" }), "min-h-11")}
            onClick={() => setOpen(false)}
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}
