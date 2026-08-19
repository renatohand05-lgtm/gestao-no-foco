"use client";

import { useState, useTransition } from "react";

import { RelationshipTypeSelector } from "@/components/clientes/relationship-type-selector";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MoreDetails } from "@/components/ui/more-details";
import {
  checkClienteDuplicatesAction,
  createClienteAction,
} from "@/lib/clientes/actions";
import {
  origemForRelationship,
  type ClientRelationship,
} from "@/lib/clientes/relationship";
import { CRM_FUNIL_LABELS, CRM_FUNIL_STAGES } from "@/lib/crm/constants";
import { createVeiculoAction } from "@/lib/ordens/actions";
import { cn } from "@/lib/utils";

type Dup = { id: string; label: string; matchedOn: string[] };

export type QuickClientCreated = {
  id: string;
  nome: string;
  veiculoId?: string;
};

type Props = {
  tenantSlug: string;
  showVehicles?: boolean;
  allowBusiness?: boolean;
  embedded?: boolean;
  onCreated: (input: QuickClientCreated) => void;
};

function emptyClientePayload(
  mode: ClientRelationship,
  fields: {
    nome: string;
    whatsapp: string;
    email: string;
    empresa: string;
    estagio: string;
    origem?: string;
    consultor?: string;
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
    origem: fields.origem?.trim() || origemForRelationship(mode),
    observacoes: "",
    classificacao: "",
    score: 0,
    consultor_id: fields.consultor ?? "",
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
  showVehicles = false,
  allowBusiness = false,
  embedded = false,
  onCreated,
}: Props) {
  const [open, setOpen] = useState(embedded);
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

  const atendimento = mode === "atendimento";

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
                    if (!embedded) setOpen(false);
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
        data-quick-vehicle={showVehicles && atendimento ? "" : undefined}
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setError(null);
          setDups([]);
          const fd = new FormData(e.currentTarget);
          const nome = String(fd.get("nome") ?? "").trim();
          const whatsapp = String(fd.get("whatsapp") ?? "").trim();
          const email = String(fd.get("email") ?? "").trim();
          const empresa = String(fd.get("empresa") ?? "").trim();
          const estagio = String(fd.get("estagio_funil") ?? "lead");
          const origem = String(fd.get("origem_negocio") ?? "").trim();
          const consultor = String(fd.get("consultor") ?? "").trim();
          const modelo = String(fd.get("veiculo_modelo") ?? "").trim();
          const marca = String(fd.get("veiculo_marca") ?? "").trim();
          const placa = String(fd.get("veiculo_placa") ?? "").trim();
          const anoRaw = String(fd.get("veiculo_ano") ?? "").trim();
          const kmRaw = String(fd.get("veiculo_km") ?? "").trim();
          if (showVehicles && atendimento && !modelo) {
            setError("Informe o modelo do veículo.");
            return;
          }
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
              emptyClientePayload(mode, {
                nome,
                whatsapp,
                email,
                empresa,
                estagio,
                origem,
                consultor,
              }),
            );
            if (!result.success || !result.id) {
              setError(result.success ? "Falha ao criar." : result.error);
              return;
            }
            let veiculoId: string | undefined;
            if (showVehicles && atendimento && modelo) {
              const veiculo = await createVeiculoAction(tenantSlug, {
                cliente_id: result.id,
                modelo,
                marca: marca || null,
                placa: placa || null,
                ano: anoRaw ? Number(anoRaw) : null,
                quilometragem: kmRaw ? Number(kmRaw) : null,
                ativo: true,
              });
              if (!veiculo.success) {
                setError(veiculo.error);
                onCreated({ id: result.id, nome });
                if (!embedded) setOpen(false);
                return;
              }
              veiculoId = veiculo.id;
            }
            onCreated({ id: result.id, nome, veiculoId });
            if (!embedded) setOpen(false);
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
              Contato
              <Input name="empresa" disabled={pending} className="mt-1 h-11" />
            </label>
            <label className="text-xs">
              Origem
              <Input name="origem_negocio" disabled={pending} className="mt-1 h-11" />
            </label>
            <label className="text-xs">
              Responsável
              <Input name="consultor" disabled={pending} className="mt-1 h-11" />
            </label>
            <label className="text-xs sm:col-span-2">
              Funil / oportunidade
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
        {showVehicles && atendimento ? (
          <>
            <p className="text-xs font-medium sm:col-span-2">Veículo</p>
            <label className="text-xs sm:col-span-2">
              Modelo *
              <Input name="veiculo_modelo" disabled={pending} className="mt-1 h-11" />
            </label>
            <label className="text-xs">
              Marca
              <Input name="veiculo_marca" disabled={pending} className="mt-1 h-11" />
            </label>
            <label className="text-xs">
              Placa
              <Input name="veiculo_placa" disabled={pending} className="mt-1 h-11" />
            </label>
            <label className="text-xs">
              Ano
              <Input name="veiculo_ano" type="number" disabled={pending} className="mt-1 h-11" />
            </label>
            <label className="text-xs">
              Km
              <Input name="veiculo_km" type="number" disabled={pending} className="mt-1 h-11" />
            </label>
          </>
        ) : null}
        <div className="sm:col-span-2">
          <MoreDetails summary="Mais informações">
            <p className="text-xs text-muted-foreground">
              Score, funil avançado, empresa, filial e porte ficam no cadastro completo.
            </p>
          </MoreDetails>
        </div>
        {error ? (
          <p className="text-sm text-destructive sm:col-span-2" role="alert">
            {error}
          </p>
        ) : null}
        <div className="flex flex-wrap gap-2 sm:col-span-2">
          <button type="submit" disabled={pending} className={cn(buttonVariants(), "min-h-11")}>
            {pending ? "Salvando…" : "Salvar cliente e usar"}
          </button>
          {!embedded ? (
            <button
              type="button"
              className={cn(buttonVariants({ variant: "ghost" }), "min-h-11")}
              onClick={() => setOpen(false)}
            >
              Cancelar
            </button>
          ) : null}
        </div>
      </form>
    </div>
  );
}
