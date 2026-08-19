"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { AgendaServiceField, type AgendaServiceOption } from "@/components/agenda/agenda-service-field";
import {
  OsVeiculoPicker,
  useClienteVeiculos,
} from "@/components/ordens/os-veiculo-picker";
import { MoreDetails } from "@/components/ui/more-details";
import { buttonVariants } from "@/components/ui/button";
import { FeedbackMessage } from "@/components/ui/feedback-message";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { SaveButton } from "@/components/ui/save-button";
import {
  createOrdemServicoIntegradaAction,
  searchClientesOsAction,
  type CreateOsIntegratedResult,
} from "@/lib/ordens/actions";
import type { OsAbrirDuplicate, OsSearchHit } from "@/lib/ordens/os-abrir-rpc";
import {
  OFICINA_ATTENDANCE_OPTIONS,
  type AttendanceTypeOption,
} from "@/lib/segments/attendance-types.ts";
import { cn } from "@/lib/utils";

type Mode = "existente" | "novo_cliente";

type Props = {
  tenantSlug: string;
  canForceDuplicate?: boolean;
  operationTypeLabel?: string;
  openCta?: string;
  openingLabel?: string;
  attendanceOptions?: AttendanceTypeOption[];
  defaultAttendanceType?: string;
  compactVehicleVitals?: boolean;
  showVehicles?: boolean;
  servicos?: AgendaServiceOption[];
  library?: import("@/lib/segments/catalogs/suggest.ts").CatalogSuggestionDto[];
  canCreateProduto?: boolean;
  profissionais?: Array<{ id: string; label: string }>;
  showMechanic?: boolean;
};

export function OsOpenForm({
  tenantSlug,
  canForceDuplicate = false,
  operationTypeLabel = "Tipo de operação",
  openCta = "Abrir OS",
  openingLabel = "Abrindo…",
  attendanceOptions = OFICINA_ATTENDANCE_OPTIONS,
  defaultAttendanceType = "oficina",
  compactVehicleVitals = false,
  showVehicles = true,
  servicos = [],
  library = [],
  canCreateProduto = false,
  profissionais = [],
  showMechanic = false,
}: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [mode, setMode] = useState<Mode>("existente");
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<OsSearchHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [duplicates, setDuplicates] = useState<OsAbrirDuplicate[] | null>(null);

  const [clienteId, setClienteId] = useState("");
  const [clienteNome, setClienteNome] = useState("");
  const [veiculoId, setVeiculoId] = useState("");
  const [servicoIds, setServicoIds] = useState<string[]>([]);
  const [catalogoServicos, setCatalogoServicos] = useState(servicos);

  const {
    veiculos,
    error: veiculoError,
    loading: veiculoLoading,
    load,
  } = useClienteVeiculos(tenantSlug);

  function onSearchChange(value: string) {
    setQuery(value);
    if (mode !== "existente" || value.trim().length < 2) {
      setHits([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const term = value;
    window.setTimeout(() => {
      void (async () => {
        const result = await searchClientesOsAction(tenantSlug, term);
        setSearching(false);
        if (result.success) setHits(result.hits);
        else setHits([]);
      })();
    }, 280);
  }

  const visibleHits =
    mode === "existente" && query.trim().length >= 2 ? hits : [];

  function selectHit(hit: OsSearchHit) {
    setClienteId(hit.cliente_id);
    setClienteNome(hit.cliente_nome);
    setQuery("");
    setHits([]);
    setVeiculoId(hit.veiculo_id ?? "");
    load(hit.cliente_id, hit.veiculo_id ?? undefined, (id) => {
      if (id) setVeiculoId(id);
    });
  }

  function submit(force = false) {
    setError(null);
    setDuplicates(null);

    const form = document.getElementById("os-open-form") as HTMLFormElement | null;
    const fd = form ? new FormData(form) : new FormData();

    const osFields = {
      quilometragem_entrada: fd.get("quilometragem_entrada")
        ? Number(fd.get("quilometragem_entrada"))
        : null,
      reclamacao_cliente: String(fd.get("reclamacao_cliente") ?? "") || null,
      observacoes: String(fd.get("observacoes") ?? "") || null,
      nivel_combustivel: String(fd.get("nivel_combustivel") ?? "") || null,
      objetos_deixados: String(fd.get("objetos_deixados") ?? "") || null,
      danos_aparentes: String(fd.get("danos_aparentes") ?? "") || null,
      origem_atendimento: String(fd.get("origem_atendimento") ?? "") || "balcao",
      prioridade: String(fd.get("prioridade") ?? "normal"),
      previsao_entrega: String(fd.get("previsao_entrega") ?? "") || null,
      tipo_ordem: String(fd.get("tipo_ordem") ?? defaultAttendanceType) || defaultAttendanceType,
      mecanico_id: String(fd.get("mecanico_id") ?? "") || "",
    };

    const values =
      mode === "existente"
        ? {
            mode: "existente" as const,
            force_create: false,
            cliente_id: clienteId,
            veiculo_id: showVehicles ? veiculoId : "",
            servico_ids: servicoIds,
            vehiclesRequired: showVehicles,
            ...osFields,
          }
        : {
            mode: "novo_cliente" as const,
            force_create: force,
            cliente: {
              nome: String(fd.get("novo_nome") ?? ""),
              telefone: String(fd.get("novo_telefone") ?? "") || String(fd.get("novo_whatsapp") ?? "") || null,
              whatsapp: String(fd.get("novo_whatsapp") ?? "") || String(fd.get("novo_telefone") ?? "") || null,
              documento: String(fd.get("novo_documento") ?? "") || null,
              email: String(fd.get("novo_email") ?? "") || null,
              tipo_pessoa: (String(fd.get("novo_tipo_pessoa") ?? "pf") as
                | "pf"
                | "pj"),
              origem: String(fd.get("novo_origem") ?? "") || "atendimento",
            },
            veiculo: showVehicles
              ? {
                  placa: String(fd.get("novo_placa") ?? ""),
                  marca: String(fd.get("novo_marca") ?? "") || null,
                  modelo: String(fd.get("novo_modelo") ?? "") || null,
                  ano: fd.get("novo_ano") ? Number(fd.get("novo_ano")) : null,
                  quilometragem: fd.get("novo_km")
                    ? Number(fd.get("novo_km"))
                    : null,
                }
              : undefined,
            servico_ids: servicoIds,
            vehiclesRequired: showVehicles,
            ...osFields,
            quilometragem_entrada: fd.get("novo_km")
              ? Number(fd.get("novo_km"))
              : osFields.quilometragem_entrada,
          };

    startTransition(async () => {
      const result: CreateOsIntegratedResult =
        await createOrdemServicoIntegradaAction(tenantSlug, values);
      if (!result.success) {
        setError(result.error);
        if (result.duplicates?.length) setDuplicates(result.duplicates);
        return;
      }
      router.push(`/${tenantSlug}/ordens/${result.id}`);
      router.refresh();
    });
  }

  return (
    <form
      id="os-open-form"
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        submit(false);
      }}
    >
      {error ? <FeedbackMessage variant="error">{error}</FeedbackMessage> : null}

      <ol
        className="flex flex-wrap gap-2 text-xs text-muted-foreground sm:hidden"
        data-os-mobile-steps=""
      >
        <li>1. Cliente</li>
        {showVehicles ? <li>2. Veículo</li> : null}
        <li>{showVehicles ? "3" : "2"}. Serviço</li>
        <li>{showVehicles ? "4" : "3"}. Confirmar</li>
      </ol>

      {duplicates?.length ? (
        <div className="space-y-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm dark:border-amber-700 dark:bg-amber-950/40">
          <p className="font-medium text-amber-900 dark:text-amber-100">
            Possível cadastro duplicado
          </p>
          <ul className="space-y-2">
            {duplicates.map((d, i) => (
              <li
                key={`${d.id}-${d.matched_on}-${i}`}
                className="flex flex-wrap items-center justify-between gap-2"
              >
                <span>
                  {d.nome}
                  <span className="text-muted-foreground">
                    {" "}
                    · {d.matched_on}
                    {d.placa ? ` · placa ${d.placa}` : ""}
                  </span>
                </span>
                <button
                  type="button"
                  className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                  onClick={() => {
                    setMode("existente");
                    setClienteId(d.id);
                    setClienteNome(d.nome);
                    setVeiculoId(d.veiculo_id ?? "");
                    setDuplicates(null);
                    setError(null);
                    load(d.id, d.veiculo_id, (id) => {
                      if (id) setVeiculoId(id);
                    });
                  }}
                >
                  Usar este
                </button>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={cn(buttonVariants({ variant: "secondary", size: "sm" }))}
              onClick={() => {
                setDuplicates(null);
                setError(null);
              }}
            >
              Revisar dados
            </button>
            {canForceDuplicate ? (
              <button
                type="button"
                disabled={pending}
                className={cn(buttonVariants({ variant: "destructive", size: "sm" }))}
                onClick={() => submit(true)}
              >
                Criar novo mesmo assim
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={cn(
            buttonVariants({
              variant: mode === "existente" ? "default" : "outline",
              size: "lg",
            }),
          )}
          onClick={() => setMode("existente")}
        >
          Cliente existente
        </button>
        <button
          type="button"
          className={cn(
            buttonVariants({
              variant: mode === "novo_cliente" ? "default" : "outline",
              size: "lg",
            }),
          )}
          onClick={() => setMode("novo_cliente")}
        >
          Novo cliente
        </button>
      </div>

      {mode === "existente" ? (
        <div className="space-y-4" data-os-step="cliente">
          <label className="block space-y-1 text-sm">
            <span className="text-muted-foreground">
              Buscar por nome, CPF/CNPJ, telefone, WhatsApp, e-mail ou placa
            </span>
            <Input
              value={query}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Digite para buscar…"
              disabled={pending}
              autoComplete="off"
              className="h-11 text-base"
            />
          </label>

          {searching ? (
            <p className="text-sm text-muted-foreground">Buscando…</p>
          ) : null}

          {visibleHits.length > 0 ? (
            <ul className="max-h-56 overflow-auto rounded-md border divide-y">
              {visibleHits.map((hit, idx) => (
                <li key={`${hit.tipo}-${hit.cliente_id}-${hit.veiculo_id ?? idx}`}>
                  <button
                    type="button"
                    className="flex w-full flex-col items-start gap-0.5 px-3 py-2.5 text-left hover:bg-muted"
                    onClick={() => selectHit(hit)}
                  >
                    <span className="font-medium">{hit.cliente_nome}</span>
                    <span className="text-xs text-muted-foreground">
                      {[
                        hit.documento,
                        hit.telefone || hit.whatsapp,
                        hit.placa
                          ? `${hit.placa}${hit.modelo ? ` · ${hit.modelo}` : ""}`
                          : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}

          {clienteId ? (
            <div className="rounded-md border bg-muted/30 p-3 text-sm">
              <p>
                Cliente: <strong>{clienteNome || clienteId}</strong>
              </p>
              <button
                type="button"
                className="mt-1 text-xs text-muted-foreground underline"
                onClick={() => {
                  setClienteId("");
                  setClienteNome("");
                  setVeiculoId("");
                }}
              >
                Trocar cliente
              </button>
            </div>
          ) : null}

          {showVehicles ? (
          <div className="space-y-1" data-os-step="veiculo">
            <p className="text-sm font-medium">Veículo *</p>
            <OsVeiculoPicker
              tenantSlug={tenantSlug}
              clienteId={clienteId}
              value={veiculoId}
              onChange={setVeiculoId}
              veiculos={veiculos}
              loading={veiculoLoading}
              error={veiculoError}
              disabled={pending || !clienteId}
              compactCreate
              onRefresh={(id) =>
                load(clienteId, id, (selected) => setVeiculoId(selected))
              }
            />
          </div>
          ) : null}
        </div>
      ) : (
        <div className="space-y-4" data-os-step="cliente">
          <p className="text-sm text-muted-foreground">
            Cadastre o mínimo agora. Complete depois — sem sair desta tela.
          </p>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="block space-y-1 text-sm md:col-span-2">
              <span className="text-muted-foreground">Nome *</span>
              <Input name="novo_nome" required disabled={pending} className="h-11" />
            </label>
            <label className="block space-y-1 text-sm">
              <span className="text-muted-foreground">WhatsApp / telefone *</span>
              <Input name="novo_whatsapp" disabled={pending} className="h-11" />
            </label>
            <label className="block space-y-1 text-sm">
              <span className="text-muted-foreground">E-mail</span>
              <Input name="novo_email" type="email" disabled={pending} className="h-11" />
            </label>
          </div>
          <MoreDetails summary="Mais informações">
            <div className="grid gap-3 md:grid-cols-2">
              <label className="block space-y-1 text-sm">
                <span className="text-muted-foreground">Telefone extra</span>
                <Input name="novo_telefone" disabled={pending} className="h-11" />
              </label>
              <label className="block space-y-1 text-sm">
                <span className="text-muted-foreground">CPF/CNPJ</span>
                <Input name="novo_documento" disabled={pending} className="h-11" />
              </label>
              <label className="block space-y-1 text-sm">
                <span className="text-muted-foreground">Tipo</span>
                <NativeSelect
                  name="novo_tipo_pessoa"
                  disabled={pending}
                  className="h-11"
                  defaultValue="pf"
                >
                  <option value="pf">Pessoa física</option>
                  <option value="pj">Pessoa jurídica</option>
                </NativeSelect>
              </label>
              <input type="hidden" name="novo_origem" value="atendimento" />
            </div>
          </MoreDetails>

          {showVehicles ? (
          <div className="grid gap-3 border-t pt-4 md:grid-cols-2" data-os-step="veiculo">
            <p className="text-sm font-medium md:col-span-2">Veículo</p>
            <label className="block space-y-1 text-sm">
              <span className="text-muted-foreground">Modelo *</span>
              <Input name="novo_modelo" required={showVehicles} disabled={pending} className="h-11" />
            </label>
            <label className="block space-y-1 text-sm">
              <span className="text-muted-foreground">Placa</span>
              <Input name="novo_placa" placeholder="ABC1D23" disabled={pending} className="h-11" />
            </label>
            <label className="block space-y-1 text-sm">
              <span className="text-muted-foreground">Marca (opcional)</span>
              <Input name="novo_marca" disabled={pending} className="h-11" />
            </label>
          </div>
          ) : null}
        </div>
      )}

      <div className="border-t pt-4" data-os-open="services" data-os-step="servico">
        <AgendaServiceField
          tenantSlug={tenantSlug}
          servicos={catalogoServicos}
          servicoId={servicoIds[0] ?? ""}
          selectedIds={servicoIds}
          multiple
          onSelect={(svc) => {
            if (svc.id) {
              setCatalogoServicos((prev) =>
                prev.some((item) => item.id === svc.id) ? prev : [...prev, svc],
              );
            }
          }}
          onSelectMany={(list) => {
            setServicoIds(list.map((s) => s.id));
            setCatalogoServicos((prev) => {
              const map = new Map(prev.map((s) => [s.id, s]));
              for (const s of list) map.set(s.id, s);
              return [...map.values()];
            });
          }}
          canCreate={canCreateProduto}
          library={library}
        />
      </div>

      <div className="grid gap-3 border-t pt-4 md:grid-cols-3" data-os-step="confirmar">
        {showMechanic && profissionais.length > 0 ? (
          <label className="block space-y-1 text-sm md:col-span-3">
            <span className="text-muted-foreground">Mecânico</span>
            <NativeSelect name="mecanico_id" disabled={pending} className="h-11">
              <option value="">Selecionar depois</option>
              {profissionais.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </NativeSelect>
          </label>
        ) : null}
        <label className="block space-y-1 text-sm md:col-span-3">
          <span className="text-muted-foreground">{operationTypeLabel}</span>
          <NativeSelect
            name="tipo_ordem"
            defaultValue={defaultAttendanceType}
            disabled={pending}
            className="h-11"
            aria-label={operationTypeLabel}
          >
            {attendanceOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </NativeSelect>
        </label>
        {!compactVehicleVitals ? (
          <label className="block space-y-1 text-sm">
            <span className="text-muted-foreground">Km entrada</span>
            <Input
              name="quilometragem_entrada"
              type="number"
              disabled={pending}
              className="h-11"
            />
          </label>
        ) : null}
        <label className="block space-y-1 text-sm">
          <span className="text-muted-foreground">Prioridade</span>
          <NativeSelect
            name="prioridade"
            defaultValue="normal"
            disabled={pending}
            className="h-11"
          >
            <option value="baixa">Baixa</option>
            <option value="normal">Normal</option>
            <option value="alta">Alta</option>
            <option value="urgente">Urgente</option>
          </NativeSelect>
        </label>
        <label className="block space-y-1 text-sm">
          <span className="text-muted-foreground">Previsão entrega</span>
          <Input
            name="previsao_entrega"
            type="datetime-local"
            disabled={pending}
            className="h-11"
          />
        </label>
        <label className="block space-y-1 text-sm md:col-span-3">
          <span className="text-muted-foreground">Reclamação / motivo</span>
          <Input name="reclamacao_cliente" disabled={pending} className="h-11" />
        </label>
        {!compactVehicleVitals ? (
          <label className="block space-y-1 text-sm">
            <span className="text-muted-foreground">Combustível</span>
            <Input name="nivel_combustivel" disabled={pending} className="h-11" />
          </label>
        ) : null}
        <label className="block space-y-1 text-sm">
          <span className="text-muted-foreground">Objetos deixados</span>
          <Input name="objetos_deixados" disabled={pending} className="h-11" />
        </label>
        <label className="block space-y-1 text-sm">
          <span className="text-muted-foreground">Danos aparentes</span>
          <Input name="danos_aparentes" disabled={pending} className="h-11" />
        </label>
        <label className="block space-y-1 text-sm md:col-span-3">
          <span className="text-muted-foreground">Observações</span>
          <Input name="observacoes" disabled={pending} className="h-11" />
        </label>
        {compactVehicleVitals ? (
          <details className="md:col-span-3 rounded-lg border border-border/60 bg-muted/20 p-3">
            <summary className="cursor-pointer text-sm font-medium text-muted-foreground">
              Km e combustível (opcional)
            </summary>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="block space-y-1 text-sm">
                <span className="text-muted-foreground">Km entrada</span>
                <Input
                  name="quilometragem_entrada"
                  type="number"
                  disabled={pending}
                  className="h-11"
                />
              </label>
              <label className="block space-y-1 text-sm">
                <span className="text-muted-foreground">Combustível</span>
                <Input name="nivel_combustivel" disabled={pending} className="h-11" />
              </label>
            </div>
          </details>
        ) : null}
        <input type="hidden" name="origem_atendimento" value="balcao" />
      </div>

      <div className="flex flex-wrap gap-3 pt-2">
        <SaveButton loading={pending} loadingText={openingLabel}>
          {openCta}
        </SaveButton>
        <Link
          href={`/${tenantSlug}/ordens`}
          className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
        >
          Cancelar
        </Link>
      </div>
    </form>
  );
}
