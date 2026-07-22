"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  OsVeiculoPicker,
  useClienteVeiculos,
} from "@/components/ordens/os-veiculo-picker";
import { buttonVariants } from "@/components/ui/button";
import { FeedbackMessage } from "@/components/ui/feedback-message";
import { Input } from "@/components/ui/input";
import { SaveButton } from "@/components/ui/save-button";
import {
  createOrdemServicoIntegradaAction,
  searchClientesOsAction,
  type CreateOsIntegratedResult,
} from "@/lib/ordens/actions";
import type { OsAbrirDuplicate, OsSearchHit } from "@/lib/ordens/os-abrir-rpc";
import { cn } from "@/lib/utils";

type Mode = "existente" | "novo_cliente";

type Props = {
  tenantSlug: string;
  canForceDuplicate?: boolean;
};

export function OsOpenForm({
  tenantSlug,
  canForceDuplicate = false,
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
    };

    const values =
      mode === "existente"
        ? {
            mode: "existente" as const,
            force_create: false,
            cliente_id: clienteId,
            veiculo_id: veiculoId,
            ...osFields,
          }
        : {
            mode: "novo_cliente" as const,
            force_create: force,
            cliente: {
              nome: String(fd.get("novo_nome") ?? ""),
              telefone: String(fd.get("novo_telefone") ?? "") || null,
              whatsapp: String(fd.get("novo_whatsapp") ?? "") || null,
              documento: String(fd.get("novo_documento") ?? "") || null,
              email: String(fd.get("novo_email") ?? "") || null,
              tipo_pessoa: (String(fd.get("novo_tipo_pessoa") ?? "pf") as
                | "pf"
                | "pj"),
              origem: String(fd.get("novo_origem") ?? "") || "ordem_de_servico",
            },
            veiculo: {
              placa: String(fd.get("novo_placa") ?? ""),
              marca: String(fd.get("novo_marca") ?? "") || null,
              modelo: String(fd.get("novo_modelo") ?? "") || null,
              ano: fd.get("novo_ano") ? Number(fd.get("novo_ano")) : null,
              quilometragem: fd.get("novo_km")
                ? Number(fd.get("novo_km"))
                : null,
            },
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
        <div className="space-y-4">
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

          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Veículo</p>
            <OsVeiculoPicker
              tenantSlug={tenantSlug}
              clienteId={clienteId}
              value={veiculoId}
              onChange={setVeiculoId}
              veiculos={veiculos}
              loading={veiculoLoading}
              error={veiculoError}
              disabled={pending || !clienteId}
              onRefresh={(id) =>
                load(clienteId, id, (selected) => setVeiculoId(selected))
              }
            />
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Cadastro rápido — não precisa sair desta tela.
          </p>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="block space-y-1 text-sm md:col-span-2">
              <span className="text-muted-foreground">Nome *</span>
              <Input name="novo_nome" required disabled={pending} className="h-11" />
            </label>
            <label className="block space-y-1 text-sm">
              <span className="text-muted-foreground">Telefone</span>
              <Input name="novo_telefone" disabled={pending} className="h-11" />
            </label>
            <label className="block space-y-1 text-sm">
              <span className="text-muted-foreground">WhatsApp</span>
              <Input name="novo_whatsapp" disabled={pending} className="h-11" />
            </label>
            <label className="block space-y-1 text-sm">
              <span className="text-muted-foreground">CPF/CNPJ</span>
              <Input name="novo_documento" disabled={pending} className="h-11" />
            </label>
            <label className="block space-y-1 text-sm">
              <span className="text-muted-foreground">E-mail</span>
              <Input name="novo_email" type="email" disabled={pending} className="h-11" />
            </label>
            <label className="block space-y-1 text-sm">
              <span className="text-muted-foreground">Tipo</span>
              <select
                name="novo_tipo_pessoa"
                disabled={pending}
                className="flex h-11 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                defaultValue="pf"
              >
                <option value="pf">Pessoa física</option>
                <option value="pj">Pessoa jurídica</option>
              </select>
            </label>
            <label className="block space-y-1 text-sm">
              <span className="text-muted-foreground">Origem</span>
              <Input
                name="novo_origem"
                defaultValue="ordem_de_servico"
                disabled={pending}
                className="h-11"
              />
            </label>
          </div>

          <div className="grid gap-3 border-t pt-4 md:grid-cols-2">
            <p className="text-sm font-medium md:col-span-2">Veículo</p>
            <label className="block space-y-1 text-sm">
              <span className="text-muted-foreground">Placa *</span>
              <Input name="novo_placa" required disabled={pending} className="h-11" />
            </label>
            <label className="block space-y-1 text-sm">
              <span className="text-muted-foreground">Marca</span>
              <Input name="novo_marca" disabled={pending} className="h-11" />
            </label>
            <label className="block space-y-1 text-sm">
              <span className="text-muted-foreground">Modelo</span>
              <Input name="novo_modelo" disabled={pending} className="h-11" />
            </label>
            <label className="block space-y-1 text-sm">
              <span className="text-muted-foreground">Ano</span>
              <Input name="novo_ano" type="number" disabled={pending} className="h-11" />
            </label>
            <label className="block space-y-1 text-sm">
              <span className="text-muted-foreground">Quilometragem</span>
              <Input name="novo_km" type="number" disabled={pending} className="h-11" />
            </label>
          </div>
        </div>
      )}

      <div className="grid gap-3 border-t pt-4 md:grid-cols-3">
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
          <span className="text-muted-foreground">Prioridade</span>
          <select
            name="prioridade"
            defaultValue="normal"
            disabled={pending}
            className="flex h-11 w-full rounded-md border border-input bg-transparent px-3 text-sm"
          >
            <option value="baixa">Baixa</option>
            <option value="normal">Normal</option>
            <option value="alta">Alta</option>
            <option value="urgente">Urgente</option>
          </select>
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
        <label className="block space-y-1 text-sm">
          <span className="text-muted-foreground">Combustível</span>
          <Input name="nivel_combustivel" disabled={pending} className="h-11" />
        </label>
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
        <input type="hidden" name="origem_atendimento" value="balcao" />
      </div>

      <div className="flex flex-wrap gap-3 pt-2">
        <SaveButton loading={pending} loadingText="Abrindo…">
          Abrir OS
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
