"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { ClienteDeleteButton } from "@/components/clientes/cliente-delete-button";
import { ClienteStatusBadge } from "@/components/clientes/cliente-status-badge";
import { ClienteDocumentosPanel } from "@/components/crm/cliente-documentos-panel";
import { CrmAgendaList } from "@/components/crm/crm-agenda-list";
import { CrmRichContent, CrmRichEditor } from "@/components/crm/crm-rich-editor";
import { CrmScoreBadges } from "@/components/crm/crm-score-badges";
import { CrmTagBadges } from "@/components/crm/crm-tag-badges";
import { CrmTimeline } from "@/components/crm/crm-timeline";
import { CrmTarefasList } from "@/components/crm/crm-tarefas-list";
import { ModuleHeader } from "@/components/layout/module-header";
import { ActionButton } from "@/components/ui/action-button";
import { FeedbackMessage } from "@/components/ui/feedback-message";
import { FormGrid } from "@/components/ui/form-grid";
import { Input } from "@/components/ui/input";
import { SectionCard } from "@/components/ui/section-card";
import {
  createClienteAgendamentoAction,
  createClienteTarefaAction,
  recordClienteObservacaoAction,
} from "@/lib/crm/actions";
import {
  CRM_TAREFA_TIPOS,
  CRM_TAREFA_TIPO_LABELS,
} from "@/lib/crm/constants";
import {
  formatClienteDate,
  formatCep,
  formatDataReferencia,
  formatDocumento,
  formatEndereco,
  formatTelefone,
  getDataReferenciaLabel,
  getNomeLabel,
} from "@/lib/clientes/format";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Cliente360Data } from "@/types/crm";
import type { Cliente } from "@/types/clientes";

type ClienteWorkspaceProps = {
  tenantSlug: string;
  cliente: Cliente;
  data360: Cliente360Data;
  consultorNome?: string | null;
};

const TABS = [
  "resumo",
  "cadastro",
  "financeiro",
  "ordens",
  "vendas",
  "veiculos",
  "timeline",
  "agenda",
  "tarefas",
  "observacoes",
  "documentos",
] as const;

type Tab = (typeof TABS)[number];

const TAB_LABELS: Record<Tab, string> = {
  resumo: "Resumo",
  cadastro: "Cadastro",
  financeiro: "Financeiro",
  ordens: "Ordens de serviço",
  vendas: "Vendas",
  veiculos: "Veículos",
  timeline: "Timeline",
  agenda: "Agenda",
  tarefas: "Tarefas",
  observacoes: "Observações",
  documentos: "Documentos",
};

function DetailItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <div className="text-sm">{value}</div>
    </div>
  );
}

export function ClienteWorkspace({
  tenantSlug,
  cliente,
  data360,
  consultorNome,
}: ClienteWorkspaceProps) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("resumo");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [obsTexto, setObsTexto] = useState("");
  const [tarefaTitulo, setTarefaTitulo] = useState("");
  const [tarefaTipo, setTarefaTipo] = useState<(typeof CRM_TAREFA_TIPOS)[number]>("ligar");
  const [agendaTitulo, setAgendaTitulo] = useState("");
  const [agendaInicio, setAgendaInicio] = useState("");

  function runAction(fn: () => Promise<{ success: boolean; error?: string }>) {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const result = await fn();
      if (!result.success) {
        setError(result.error ?? "Erro ao processar.");
        return;
      }
      setSuccess("Registro salvo.");
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <ModuleHeader
        title={cliente.nome}
        description="Visão 360° do cliente"
        breadcrumbs={[
          { label: "Clientes", href: `/${tenantSlug}/clientes` },
          { label: cliente.nome },
        ]}
      >
        <ClienteStatusBadge ativo={cliente.ativo} />
        <ActionButton
          action="edit"
          href={`/${tenantSlug}/clientes/${cliente.id}/editar`}
        />
        <ClienteDeleteButton
          tenantSlug={tenantSlug}
          clienteId={cliente.id}
          clienteNome={cliente.nome}
        />
      </ModuleHeader>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
        <SectionCard title="Valor total comprado">
          <p className="text-xl font-semibold tabular-nums">
            {formatCurrency(data360.resumo.receita_total)}
          </p>
        </SectionCard>
        <SectionCard title="Ticket médio">
          <p className="text-xl font-semibold tabular-nums">
            {formatCurrency(data360.resumo.ticket_medio)}
          </p>
        </SectionCard>
        <SectionCard title="Ordens de serviço">
          <p className="text-xl font-semibold tabular-nums">{data360.resumo.ordens_total}</p>
        </SectionCard>
        <SectionCard title="Veículos">
          <p className="text-xl font-semibold tabular-nums">{data360.resumo.veiculos_total}</p>
        </SectionCard>
        <SectionCard title="Última compra">
          <p className="text-sm font-medium">
            {data360.resumo.ultima_compra
              ? formatClienteDate(data360.resumo.ultima_compra)
              : "—"}
          </p>
        </SectionCard>
        <SectionCard title="Último contato">
          <p className="text-sm font-medium">
            {data360.resumo.ultimo_contato
              ? formatClienteDate(data360.resumo.ultimo_contato)
              : "—"}
          </p>
        </SectionCard>
        <SectionCard title="Consultor">
          <p className="text-sm font-medium">{consultorNome ?? "—"}</p>
        </SectionCard>
        <SectionCard title="Score & funil">
          <CrmScoreBadges
            score={Number(cliente.score ?? 0)}
            classificacao={cliente.classificacao}
            estagioFunil={cliente.estagio_funil ?? "lead"}
          />
          <CrmTagBadges tags={data360.tags} className="mt-2" />
        </SectionCard>
        <SectionCard title="Contas em aberto">
          <p className="text-xl font-semibold tabular-nums">
            {data360.resumo.contas_abertas}
          </p>
        </SectionCard>
        <SectionCard title="Orçamentos abertos">
          <p className="text-xl font-semibold tabular-nums">{data360.orcamentos.length}</p>
        </SectionCard>
      </div>

      {error ? <FeedbackMessage variant="error">{error}</FeedbackMessage> : null}
      {success ? <FeedbackMessage variant="success">{success}</FeedbackMessage> : null}

      <div className="flex flex-wrap gap-2 border-b pb-2">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium",
              tab === t
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted",
            )}
          >
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>

      {tab === "resumo" ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <SectionCard title="Atividade recente">
            <CrmTimeline eventos={data360.eventos.slice(0, 8)} />
          </SectionCard>
          <SectionCard title="Orçamentos em aberto">
            {data360.orcamentos.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum orçamento aberto.</p>
            ) : (
              <ul className="divide-y">
                {data360.orcamentos.slice(0, 5).map((row) => (
                  <li key={`${row.origem}-${row.id}`} className="flex justify-between py-2 text-sm">
                    <Link
                      href={
                        row.origem === "venda"
                          ? `/${tenantSlug}/vendas/${row.id}`
                          : `/${tenantSlug}/ordens/${row.id}`
                      }
                      className="text-primary hover:underline"
                    >
                      {row.origem === "venda" ? "Venda" : "OS"} #{row.numero ?? row.id.slice(0, 8)}
                    </Link>
                    <span>{formatCurrency(row.total)}</span>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
          <SectionCard title="Próximas tarefas" className="lg:col-span-2">
            <CrmTarefasList
              tenantSlug={tenantSlug}
              tarefas={data360.tarefas.filter((t) => t.status !== "concluida").slice(0, 5)}
            />
          </SectionCard>
        </div>
      ) : null}

      {tab === "cadastro" ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <SectionCard title="Identificação">
            <FormGrid>
              <DetailItem
                label="Tipo"
                value={cliente.tipo_pessoa === "pf" ? "Pessoa física" : "Pessoa jurídica"}
              />
              <DetailItem label={getNomeLabel(cliente.tipo_pessoa)} value={cliente.nome} />
              <DetailItem
                label={cliente.tipo_pessoa === "pf" ? "CPF" : "CNPJ"}
                value={formatDocumento(cliente.documento, cliente.tipo_pessoa)}
              />
              <DetailItem label="Segmento" value={cliente.segmento ?? "—"} />
              <DetailItem label="Porte" value={cliente.porte ?? "—"} />
              <DetailItem label="Origem" value={cliente.origem ?? "—"} />
              <DetailItem label="Consultor" value={consultorNome ?? "—"} />
              <DetailItem
                label={getDataReferenciaLabel(cliente.tipo_pessoa)}
                value={formatDataReferencia(cliente.data_referencia)}
              />
            </FormGrid>
          </SectionCard>
          <SectionCard title="Contato">
            <FormGrid>
              <DetailItem label="Telefone" value={formatTelefone(cliente.telefone)} />
              <DetailItem label="WhatsApp" value={formatTelefone(cliente.whatsapp)} />
              <DetailItem
                label="E-mail"
                value={
                  cliente.email ? (
                    <Link href={`mailto:${cliente.email}`} className="text-primary hover:underline">
                      {cliente.email}
                    </Link>
                  ) : (
                    "—"
                  )
                }
              />
            </FormGrid>
          </SectionCard>
          <SectionCard title="Endereço" className="lg:col-span-2">
            <FormGrid columns={4}>
              <DetailItem label="CEP" value={formatCep(cliente.cep)} />
              <DetailItem label="Endereço" value={formatEndereco(cliente)} />
              <DetailItem label="Cidade" value={cliente.cidade ?? "—"} />
              <DetailItem label="Estado" value={cliente.estado ?? "—"} />
            </FormGrid>
          </SectionCard>
        </div>
      ) : null}

      {tab === "financeiro" ? (
        <SectionCard title="Histórico financeiro">
          {data360.financeiro.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem contas a receber.</p>
          ) : (
            <ul className="divide-y">
              {data360.financeiro.map((row) => (
                <li key={row.id} className="flex justify-between py-2 text-sm">
                  <span>
                    {row.descricao} · venc. {formatClienteDate(row.data_vencimento)}
                  </span>
                  <span className="font-medium tabular-nums">
                    {formatCurrency(row.valor_original)} · {row.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      ) : null}

      {tab === "ordens" ? (
        <SectionCard title="Ordens de serviço">
          {data360.ordens.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma OS.</p>
          ) : (
            <ul className="divide-y">
              {data360.ordens.map((row) => (
                <li key={row.id} className="flex justify-between py-2 text-sm">
                  <Link href={`/${tenantSlug}/ordens/${row.id}`} className="text-primary hover:underline">
                    OS #{row.numero ?? row.id.slice(0, 8)}
                  </Link>
                  <span>
                    {formatCurrency(row.valor_total)} · {row.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      ) : null}

      {tab === "vendas" ? (
        <SectionCard title="Vendas faturadas">
          {data360.vendas.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma venda faturada.</p>
          ) : (
            <ul className="divide-y">
              {data360.vendas.map((row) => (
                <li key={row.id} className="flex justify-between py-2 text-sm">
                  <Link href={`/${tenantSlug}/vendas/${row.id}`} className="text-primary hover:underline">
                    Venda #{row.numero ?? row.id.slice(0, 8)}
                  </Link>
                  <span>
                    {formatCurrency(row.total)} · {row.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      ) : null}

      {tab === "veiculos" ? (
        <SectionCard title="Veículos">
          {data360.veiculos.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum veículo vinculado.</p>
          ) : (
            <ul className="divide-y">
              {data360.veiculos.map((v) => (
                <li key={v.id} className="py-2 text-sm">
                  {v.placa ?? "Sem placa"} · {[v.marca, v.modelo, v.ano].filter(Boolean).join(" ")}
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      ) : null}

      {tab === "timeline" ? <CrmTimeline eventos={data360.eventos} /> : null}

      {tab === "agenda" ? (
        <div className="space-y-4">
          <SectionCard title="Novo agendamento">
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                placeholder="Título"
                value={agendaTitulo}
                onChange={(e) => setAgendaTitulo(e.target.value)}
              />
              <Input
                type="datetime-local"
                value={agendaInicio}
                onChange={(e) => setAgendaInicio(e.target.value)}
              />
            </div>
            <button
              type="button"
              disabled={pending || agendaTitulo.trim().length < 2 || !agendaInicio}
              className="mt-3 rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50"
              onClick={() =>
                runAction(() =>
                  createClienteAgendamentoAction(tenantSlug, {
                    cliente_id: cliente.id,
                    titulo: agendaTitulo.trim(),
                    inicio: new Date(agendaInicio).toISOString(),
                  }),
                )
              }
            >
              Agendar
            </button>
          </SectionCard>
          <CrmAgendaList tenantSlug={tenantSlug} agendamentos={data360.agendamentos} />
        </div>
      ) : null}

      {tab === "tarefas" ? (
        <div className="space-y-4">
          <SectionCard title="Nova tarefa">
            <div className="grid gap-3 sm:grid-cols-3">
              <select
                className="rounded-md border border-input px-3 py-2 text-sm"
                value={tarefaTipo}
                onChange={(e) => setTarefaTipo(e.target.value as typeof tarefaTipo)}
              >
                {CRM_TAREFA_TIPOS.map((t) => (
                  <option key={t} value={t}>
                    {CRM_TAREFA_TIPO_LABELS[t]}
                  </option>
                ))}
              </select>
              <Input
                placeholder="Título da tarefa"
                value={tarefaTitulo}
                onChange={(e) => setTarefaTitulo(e.target.value)}
                className="sm:col-span-2"
              />
            </div>
            <button
              type="button"
              disabled={pending || tarefaTitulo.trim().length < 2}
              className="mt-3 rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50"
              onClick={() =>
                runAction(() =>
                  createClienteTarefaAction(tenantSlug, {
                    cliente_id: cliente.id,
                    tipo: tarefaTipo,
                    titulo: tarefaTitulo.trim(),
                  }),
                )
              }
            >
              Criar tarefa
            </button>
          </SectionCard>
          <CrmTarefasList tenantSlug={tenantSlug} tarefas={data360.tarefas} />
        </div>
      ) : null}

      {tab === "observacoes" ? (
        <div className="space-y-4">
          <SectionCard title="Observações cadastrais">
            <p className="text-sm text-muted-foreground">
              {cliente.observacoes || "Nenhuma observação no cadastro."}
            </p>
          </SectionCard>
          <SectionCard title="Nova observação">
            <CrmRichEditor
              value={obsTexto}
              onChange={setObsTexto}
              disabled={pending}
              placeholder="Registre contexto comercial, acordos, preferências…"
            />
            <button
              type="button"
              disabled={pending || obsTexto.replace(/<[^>]+>/g, "").trim().length < 2}
              className="mt-3 rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50"
              onClick={() =>
                runAction(async () => {
                  const result = await recordClienteObservacaoAction(
                    tenantSlug,
                    cliente.id,
                    obsTexto.trim(),
                  );
                  if (result.success) setObsTexto("");
                  return result;
                })
              }
            >
              Salvar observação
            </button>
          </SectionCard>
          <SectionCard title="Histórico de observações">
            {data360.observacoes.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma observação na timeline.</p>
            ) : (
              <ul className="divide-y">
                {data360.observacoes.map((obs) => (
                  <li key={obs.id} className="py-3">
                    <CrmRichContent html={obs.descricao ?? ""} />
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatClienteDate(obs.created_at)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </div>
      ) : null}

      {tab === "documentos" ? (
        <ClienteDocumentosPanel
          tenantSlug={tenantSlug}
          clienteId={cliente.id}
          documentos={data360.documentos}
          onRefresh={() => router.refresh()}
        />
      ) : null}
    </div>
  );
}
