"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import {
  OsVeiculoPicker,
  useClienteVeiculos,
} from "@/components/ordens/os-veiculo-picker";
import { AnexosPanel } from "@/components/ordens/inspecao/anexos-panel";
import { ChecklistVisual } from "@/components/ordens/inspecao/checklist-visual";
import { InspecaoEnvioPanel } from "@/components/ordens/inspecao/inspecao-envio-panel";
import { OsVeiculoEditDialog } from "@/components/ordens/os-veiculo-edit-dialog";
import { buttonVariants } from "@/components/ui/button";
import { FeedbackMessage } from "@/components/ui/feedback-message";
import { Input } from "@/components/ui/input";
import { SectionCard } from "@/components/ui/section-card";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  addOsItemAction,
  applyOsAprovacaoAction,
  changeOsStatusAction,
  concluirOsEntregaAction,
  createOsRetornoAction,
  faturarOsAction,
  removeOsItemAction,
  saveOsDiagnosticoAction,
  updateOsHeaderAction,
  updateOsItemAction,
  updateOsItemExecucaoAction,
  updateOsPrevisaoAction,
  updateOsVeiculoAction,
} from "@/lib/ordens/actions";
import { formatOsEventoLine } from "@/lib/ordens/os-event-format";
import { formatCurrency } from "@/lib/format";
import {
  canApplyAprovacao,
  canEditOrcamento,
  canFaturarStatus,
  canRegisterDiagnostico,
  OS_APROVACAO_CANAL_OPTIONS,
  OS_STATUS,
  OS_STATUS_LABELS,
  OS_TRANSITIONS,
  type OsStatus,
} from "@/lib/ordens/os-status";
import type { ShareListItem } from "@/lib/ordens/compartilhamento-service";
import type { OsAnexoRecord } from "@/lib/ordens/inspecao-storage-service";
import type { OrcamentoVersaoRecord } from "@/lib/ordens/orcamento-versao-service";
import type { OrdemServicoDetail } from "@/lib/ordens/ordem-servico-service";
import { cn } from "@/lib/utils";

type Option = { id: string; nome: string };

type Props = {
  tenantSlug: string;
  os: OrdemServicoDetail;
  produtos: Option[];
  formasPagamento: Option[];
  veiculosIniciais: import("@/lib/ordens/veiculo-shared").VeiculoOption[];
  anexos: OsAnexoRecord[];
  orcamentoVersoes: OrcamentoVersaoRecord[];
  compartilhamentos: ShareListItem[];
  emailConfigured: boolean;
};

const TABS = [
  "resumo",
  "checklist",
  "diagnostico",
  "orcamento",
  "aprovacao",
  "execucao",
  "financeiro",
  "entrega",
  "historico",
  "anexos",
  "retorno",
] as const;

type Tab = (typeof TABS)[number];

const EXEC_LABELS: Record<string, string> = {
  em_execucao: "Iniciar / retomar",
  pausado: "Pausar",
  concluido: "Concluir",
  cancelado: "Cancelar item",
};

const APROVACAO_LABELS: Record<string, string> = {
  pendente: "Pendente",
  aprovado: "Aprovado",
  reprovado: "Reprovado",
};

function canEditOs(os: OrdemServicoDetail) {
  return (
    !os.venda_id &&
    os.status !== "faturado" &&
    os.status !== "cancelado" &&
    os.status !== "cancelada"
  );
}

export function OsWorkspace({
  tenantSlug,
  os,
  produtos,
  formasPagamento,
  veiculosIniciais,
  anexos,
  orcamentoVersoes,
  compartilhamentos,
  emailConfigured,
}: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("resumo");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [aprovacaoCanal, setAprovacaoCanal] = useState<string>("presencial");
  const [itensParciais, setItensParciais] = useState<string[]>([]);
  const [veiculoEditId, setVeiculoEditId] = useState(os.veiculo_id ?? "");
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [execHoras, setExecHoras] = useState<Record<string, string>>({});
  const [veiculoMasterOpen, setVeiculoMasterOpen] = useState(false);
  const {
    veiculos,
    error: veiculoError,
    loading: veiculoLoading,
    load: loadVeiculos,
  } = useClienteVeiculos(tenantSlug, veiculosIniciais);

  const nextStatuses = OS_TRANSITIONS[os.status as OsStatus] ?? [];
  const canDiagnostico = canRegisterDiagnostico(os.status);
  const canOrcamento = canEditOs(os) && canEditOrcamento(os.status);
  const canAprovar = canEditOs(os) && canApplyAprovacao(os.status);
  const canFaturar =
    !os.venda_id &&
    os.status !== "cancelado" &&
    os.status !== "cancelada" &&
    canFaturarStatus(os.status);
  const faturarBloqueio = os.venda_id
    ? "OS já faturada — segundo faturamento bloqueado."
    : os.status === "cancelado" || os.status === "cancelada"
      ? "Não é possível faturar OS cancelada."
      : !canFaturarStatus(os.status)
        ? `Status atual (${OS_STATUS_LABELS[os.status as OsStatus] ?? os.status}) não permite faturar.`
        : null;

  const aprovados = useMemo(
    () => os.itens.filter((i) => i.aprovacao_status === "aprovado"),
    [os.itens],
  );

  function run(
    action: () => Promise<{ success: boolean; error?: string }>,
    okMessage?: string,
  ) {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const result = await action();
      if (!result.success) {
        setError(result.error ?? "Falha na operação.");
        return;
      }
      if (okMessage) setSuccess(okMessage);
      router.refresh();
    });
  }

  function handleStatusChange(status: OsStatus) {
    const label = OS_STATUS_LABELS[status];
    if (status === "cancelado") {
      if (
        !window.confirm(
          "Cancelar esta OS? A ação é irreversível e não pode ser desfeita após confirmação.",
        )
      ) {
        return;
      }
    } else if (
      !window.confirm(`Avançar status para "${label}"?`)
    ) {
      return;
    }
    run(
      () =>
        changeOsStatusAction(tenantSlug, os.id, {
          status,
          motivo: `Avanço para ${label}`,
        }),
      `Status → ${label}`,
    );
  }

  function toggleParcial(id: string) {
    setItensParciais((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  return (
    <div className="space-y-4">
      {error ? <FeedbackMessage variant="error">{error}</FeedbackMessage> : null}
      {success ? (
        <FeedbackMessage variant="success">{success}</FeedbackMessage>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge
          label={OS_STATUS_LABELS[os.status as OsStatus] ?? os.status}
        />
        <span className="text-sm text-muted-foreground">
          #{os.numero} · {os.cliente_nome} · {os.placa ?? "sem placa"}
          {os.modelo ? ` · ${os.modelo}` : ""}
        </span>
        <span className="ml-auto text-sm font-semibold tabular-nums">
          {formatCurrency(os.valor_total)}
        </span>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium capitalize",
              tab === t
                ? "border-emerald-600 bg-emerald-600/10 text-emerald-800 dark:text-emerald-300"
                : "border-border hover:bg-muted",
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "resumo" ? (
        <SectionCard title="Resumo" contentClassName="pt-0 space-y-3">
          {canEditOs(os) ? (
            <form
              className="space-y-2 rounded-lg border p-3"
              onSubmit={(e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                run(
                  () =>
                    updateOsHeaderAction(tenantSlug, os.id, {
                      reclamacao_cliente:
                        String(fd.get("reclamacao_cliente") || "") || null,
                      observacoes: String(fd.get("observacoes") || "") || null,
                      quilometragem_entrada: fd.get("quilometragem_entrada")
                        ? Number(fd.get("quilometragem_entrada"))
                        : null,
                      previsao_entrega:
                        String(fd.get("previsao_entrega") || "") || null,
                      nivel_combustivel:
                        String(fd.get("nivel_combustivel") || "") || null,
                      objetos_deixados:
                        String(fd.get("objetos_deixados") || "") || null,
                      danos_aparentes:
                        String(fd.get("danos_aparentes") || "") || null,
                      prioridade: String(fd.get("prioridade") || "normal"),
                      origem_atendimento:
                        String(fd.get("origem_atendimento") || "") || null,
                    }),
                  "Dados da OS salvos.",
                );
              }}
            >
              <p className="text-xs font-medium text-muted-foreground">
                Editar dados da OS
              </p>
              <textarea
                name="reclamacao_cliente"
                defaultValue={os.reclamacao_cliente ?? ""}
                placeholder="Reclamação do cliente"
                rows={2}
                disabled={pending}
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
              />
              <textarea
                name="observacoes"
                defaultValue={os.observacoes ?? ""}
                placeholder="Observações internas"
                rows={2}
                disabled={pending}
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
              />
              <div className="grid gap-2 md:grid-cols-2">
                <Input
                  name="quilometragem_entrada"
                  type="number"
                  min={0}
                  defaultValue={os.quilometragem_entrada ?? ""}
                  placeholder="Km entrada"
                  disabled={pending}
                />
                <Input
                  name="previsao_entrega"
                  type="datetime-local"
                  defaultValue={os.previsao_entrega ?? ""}
                  disabled={pending}
                />
                <Input
                  name="nivel_combustivel"
                  defaultValue={os.nivel_combustivel ?? ""}
                  placeholder="Nível combustível"
                  disabled={pending}
                />
                <select
                  name="prioridade"
                  defaultValue={os.prioridade}
                  disabled={pending}
                  className="h-10 rounded-md border px-3 text-sm"
                >
                  <option value="baixa">Baixa</option>
                  <option value="normal">Normal</option>
                  <option value="alta">Alta</option>
                  <option value="urgente">Urgente</option>
                </select>
                <Input
                  name="objetos_deixados"
                  defaultValue={os.objetos_deixados ?? ""}
                  placeholder="Objetos deixados"
                  disabled={pending}
                />
                <Input
                  name="danos_aparentes"
                  defaultValue={os.danos_aparentes ?? ""}
                  placeholder="Danos aparentes"
                  disabled={pending}
                />
                <Input
                  name="origem_atendimento"
                  defaultValue={os.origem_atendimento ?? ""}
                  placeholder="Origem do atendimento"
                  disabled={pending}
                  className="md:col-span-2"
                />
              </div>
              <button
                type="submit"
                disabled={pending}
                className={cn(buttonVariants({ size: "sm" }))}
              >
                Salvar alterações
              </button>
            </form>
          ) : (
            <p className="text-sm">
              {os.reclamacao_cliente ?? os.observacoes ?? "—"}
            </p>
          )}
          <dl className="grid gap-2 text-sm md:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">Entrada</dt>
              <dd>{os.data_hora_entrada ?? os.data_abertura}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Previsão</dt>
              <dd>{os.previsao_entrega ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Km entrada</dt>
              <dd>{os.quilometragem_entrada ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Prioridade</dt>
              <dd>{os.prioridade}</dd>
            </div>
          </dl>

          {!os.venda_id && os.status !== "cancelado" ? (
            <div className="space-y-2 rounded-lg border p-3">
              <p className="text-sm font-medium">Veículo vinculado</p>
              <OsVeiculoPicker
                tenantSlug={tenantSlug}
                clienteId={os.cliente_id}
                value={veiculoEditId}
                onChange={setVeiculoEditId}
                veiculos={veiculos}
                loading={veiculoLoading}
                error={veiculoError}
                disabled={pending}
                onRefresh={(id) =>
                  loadVeiculos(os.cliente_id, id, (selected) =>
                    setVeiculoEditId(selected),
                  )
                }
              />
              <button
                type="button"
                disabled={pending || !veiculoEditId || veiculoEditId === os.veiculo_id}
                className={cn(buttonVariants({ size: "sm" }))}
                onClick={() =>
                  run(
                    () =>
                      updateOsVeiculoAction(tenantSlug, os.id, {
                        veiculo_id: veiculoEditId,
                      }),
                    "Veículo atualizado.",
                  )
                }
              >
                Salvar veículo
              </button>
              {os.veiculo_id ? (
                <button
                  type="button"
                  disabled={pending}
                  className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                  onClick={() => setVeiculoMasterOpen(true)}
                >
                  Editar cadastro do veículo
                </button>
              ) : null}
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2">
            {nextStatuses.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Sem transições disponíveis a partir deste status.
              </p>
            ) : (
              nextStatuses.map((status) => (
                <button
                  key={status}
                  type="button"
                  disabled={pending}
                  className={cn(
                    buttonVariants({
                      variant: status === "cancelado" ? "destructive" : "outline",
                      size: "sm",
                    }),
                  )}
                  onClick={() => handleStatusChange(status)}
                >
                  → {OS_STATUS_LABELS[status]}
                </button>
              ))
            )}
          </div>
        </SectionCard>
      ) : null}

      {tab === "checklist" ? (
        <ChecklistVisual
          tenantSlug={tenantSlug}
          osId={os.id}
          items={os.checklist}
          anexos={anexos}
          onRefresh={() => router.refresh()}
          disabled={pending}
        />
      ) : null}

      {tab === "diagnostico" ? (
        <SectionCard
          title="Diagnóstico"
          description="Não gera movimentação financeira. Ao salvar a partir de Rascunho, a OS avança Rascunho → Aguardando diagnóstico → Diagnóstico concluído."
          contentClassName="pt-0"
        >
          {!canDiagnostico ? (
            <p className="mb-3 text-sm text-amber-700 dark:text-amber-400">
              Status atual não permite novo diagnóstico operacional.
            </p>
          ) : null}
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              run(
                () =>
                  saveOsDiagnosticoAction(tenantSlug, os.id, {
                    sintoma_relatado: String(fd.get("sintoma_relatado") || "") || null,
                    diagnostico_tecnico:
                      String(fd.get("diagnostico_tecnico") || "") || null,
                    causa_provavel: String(fd.get("causa_provavel") || "") || null,
                    recomendacao: String(fd.get("recomendacao") || "") || null,
                    gravidade: (String(fd.get("gravidade") || "") || null) as never,
                    urgencia: (String(fd.get("urgencia") || "") || null) as never,
                    observacoes_cliente:
                      String(fd.get("observacoes_cliente") || "") || null,
                  }),
                "Diagnóstico salvo.",
              );
            }}
          >
            <Input name="sintoma_relatado" placeholder="Sintoma relatado" disabled={pending || !canDiagnostico} />
            <textarea
              name="diagnostico_tecnico"
              placeholder="Diagnóstico técnico"
              rows={3}
              disabled={pending || !canDiagnostico}
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
            />
            <Input name="causa_provavel" placeholder="Causa provável" disabled={pending || !canDiagnostico} />
            <Input name="recomendacao" placeholder="Recomendação" disabled={pending || !canDiagnostico} />
            <textarea
              name="observacoes_cliente"
              placeholder="Observações para o cliente (visível no link público)"
              rows={2}
              disabled={pending || !canDiagnostico}
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
            />
            <div className="grid gap-2 md:grid-cols-2">
              <select name="gravidade" disabled={pending || !canDiagnostico} className="h-10 rounded-md border px-3 text-sm">
                <option value="">Gravidade</option>
                <option value="baixa">Baixa</option>
                <option value="media">Média</option>
                <option value="alta">Alta</option>
                <option value="critica">Crítica</option>
              </select>
              <select name="urgencia" disabled={pending || !canDiagnostico} className="h-10 rounded-md border px-3 text-sm">
                <option value="">Urgência</option>
                <option value="baixa">Baixa</option>
                <option value="media">Média</option>
                <option value="alta">Alta</option>
              </select>
            </div>
            <button
              type="submit"
              disabled={pending || !canDiagnostico}
              className={cn(buttonVariants({ size: "sm" }))}
            >
              Salvar diagnóstico
            </button>
          </form>
          {os.diagnosticos[0] ? (
            <div className="mt-4 space-y-1 rounded-lg bg-muted/40 p-3 text-sm">
              <p>
                <span className="text-muted-foreground">Técnico: </span>
                {String(os.diagnosticos[0].diagnostico_tecnico ?? "—")}
              </p>
              <p>
                <span className="text-muted-foreground">Causa: </span>
                {String(os.diagnosticos[0].causa_provavel ?? "—")}
              </p>
            </div>
          ) : null}
        </SectionCard>
      ) : null}

      {tab === "orcamento" ? (
        <SectionCard
          title="Orçamento"
          description="Orçamento não gera receita nem baixa estoque. O primeiro item avança Diagnóstico concluído → Aguardando orçamento."
          contentClassName="pt-0 space-y-4"
        >
          {!canOrcamento ? (
            <p className="text-sm text-amber-700 dark:text-amber-400">
              Conclua o diagnóstico antes de montar o orçamento.
            </p>
          ) : null}
          <ul className="space-y-2">
            {os.itens.map((item) => (
              <li
                key={item.id}
                className="space-y-2 rounded-lg border px-3 py-2 text-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium">{item.descricao}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.categoria_item} ·{" "}
                      {APROVACAO_LABELS[item.aprovacao_status] ??
                        item.aprovacao_status}{" "}
                      · estoque {item.estoque_status}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="tabular-nums font-semibold">
                      {formatCurrency(item.valor_total)}
                    </p>
                    {canEditOs(os) && item.aprovacao_status === "pendente" ? (
                      <>
                        <button
                          type="button"
                          disabled={pending}
                          className={cn(
                            buttonVariants({ variant: "outline", size: "sm" }),
                          )}
                          onClick={() =>
                            setEditingItemId(
                              editingItemId === item.id ? null : item.id,
                            )
                          }
                        >
                          {editingItemId === item.id ? "Fechar" : "Editar"}
                        </button>
                        <button
                          type="button"
                          disabled={pending}
                          className={cn(
                            buttonVariants({ variant: "destructive", size: "sm" }),
                          )}
                          onClick={() => {
                            if (
                              !window.confirm(
                                `Remover "${item.descricao}" do orçamento?`,
                              )
                            ) {
                              return;
                            }
                            run(
                              () =>
                                removeOsItemAction(tenantSlug, os.id, item.id),
                              "Item removido.",
                            );
                          }}
                        >
                          Remover
                        </button>
                      </>
                    ) : null}
                  </div>
                </div>
                {editingItemId === item.id ? (
                  <form
                    className="space-y-2 border-t pt-2"
                    onSubmit={(e) => {
                      e.preventDefault();
                      const fd = new FormData(e.currentTarget);
                      run(
                        () =>
                          updateOsItemAction(tenantSlug, os.id, item.id, {
                            produto_id:
                              String(fd.get("produto_id") || "") || undefined,
                            descricao: String(fd.get("descricao") || ""),
                            tipo_item: String(fd.get("tipo_item") || "servico"),
                            categoria_item: String(
                              fd.get("categoria_item") || "servico",
                            ),
                            quantidade: Number(fd.get("quantidade") || 1),
                            valor_unitario: Number(fd.get("valor_unitario") || 0),
                            desconto: Number(fd.get("desconto") || 0),
                            acrescimo: Number(fd.get("acrescimo") || 0),
                            peca_origem: String(fd.get("peca_origem") || "estoque"),
                            horas_previstas: fd.get("horas_previstas")
                              ? Number(fd.get("horas_previstas"))
                              : null,
                          }),
                        "Item atualizado.",
                      );
                      setEditingItemId(null);
                    }}
                  >
                    <select
                      name="produto_id"
                      defaultValue={item.produto_id ?? ""}
                      disabled={pending}
                      className="h-10 w-full rounded-md border px-3 text-sm"
                    >
                      <option value="">Produto/serviço (opcional)</option>
                      {produtos.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.nome}
                        </option>
                      ))}
                    </select>
                    <Input
                      name="descricao"
                      required
                      defaultValue={item.descricao}
                      disabled={pending}
                    />
                    <div className="grid gap-2 md:grid-cols-4">
                      <select
                        name="tipo_item"
                        defaultValue={item.tipo_item}
                        disabled={pending}
                        className="h-10 rounded-md border px-2 text-sm"
                      >
                        <option value="servico">Serviço</option>
                        <option value="produto">Produto</option>
                      </select>
                      <select
                        name="categoria_item"
                        defaultValue={item.categoria_item}
                        disabled={pending}
                        className="h-10 rounded-md border px-2 text-sm"
                      >
                        <option value="peca">Peça</option>
                        <option value="servico">Serviço</option>
                        <option value="mao_obra">Mão de obra</option>
                        <option value="outro">Outro</option>
                      </select>
                      <Input
                        name="quantidade"
                        type="number"
                        step="0.001"
                        defaultValue={item.quantidade}
                        disabled={pending}
                      />
                      <Input
                        name="valor_unitario"
                        type="number"
                        step="0.01"
                        defaultValue={item.valor_unitario}
                        disabled={pending}
                      />
                    </div>
                    <div className="grid gap-2 md:grid-cols-3">
                      <Input
                        name="desconto"
                        type="number"
                        step="0.01"
                        defaultValue={item.desconto}
                        disabled={pending}
                      />
                      <Input
                        name="acrescimo"
                        type="number"
                        step="0.01"
                        defaultValue={item.acrescimo}
                        disabled={pending}
                      />
                      <Input
                        name="horas_previstas"
                        type="number"
                        step="0.1"
                        defaultValue={item.horas_previstas ?? ""}
                        disabled={pending}
                      />
                    </div>
                    <select
                      name="peca_origem"
                      defaultValue={item.peca_origem}
                      disabled={pending}
                      className="h-10 w-full rounded-md border px-2 text-sm"
                    >
                      <option value="estoque">Estoque</option>
                      <option value="cliente">Fornecida pelo cliente</option>
                      <option value="compra">Compra sob demanda</option>
                      <option value="outro">Outro</option>
                    </select>
                    <button
                      type="submit"
                      disabled={pending}
                      className={cn(buttonVariants({ size: "sm" }))}
                    >
                      Salvar item
                    </button>
                  </form>
                ) : null}
              </li>
            ))}
            {os.itens.length === 0 ? (
              <li className="text-sm text-muted-foreground">Nenhum item ainda.</li>
            ) : null}
          </ul>
          <form
            className="space-y-2 rounded-xl border border-dashed p-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (!canEditOs(os)) {
                setError("Orçamento bloqueado nesta OS.");
                return;
              }
              const fd = new FormData(e.currentTarget);
              run(
                () =>
                  addOsItemAction(tenantSlug, os.id, {
                    produto_id: String(fd.get("produto_id") || "") || undefined,
                    descricao: String(fd.get("descricao") || ""),
                    tipo_item: String(fd.get("tipo_item") || "servico"),
                    categoria_item: String(fd.get("categoria_item") || "servico"),
                    quantidade: Number(fd.get("quantidade") || 1),
                    valor_unitario: Number(fd.get("valor_unitario") || 0),
                    desconto: Number(fd.get("desconto") || 0),
                    acrescimo: Number(fd.get("acrescimo") || 0),
                    peca_origem: String(fd.get("peca_origem") || "estoque"),
                    horas_previstas: fd.get("horas_previstas")
                      ? Number(fd.get("horas_previstas"))
                      : null,
                  }),
                "Item incluído no orçamento.",
              );
              e.currentTarget.reset();
            }}
          >
            <p className="text-xs font-medium text-muted-foreground">
              Adicionar peça / serviço / mão de obra
            </p>
            <select
              name="produto_id"
              disabled={pending}
              className="h-10 w-full rounded-md border px-3 text-sm"
            >
              <option value="">Produto/serviço (opcional para orçar texto)</option>
              {produtos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nome}
                </option>
              ))}
            </select>
            <Input name="descricao" required placeholder="Descrição" disabled={pending} />
            <div className="grid gap-2 md:grid-cols-4">
              <select
                name="tipo_item"
                defaultValue="servico"
                disabled={pending}
                className="h-10 rounded-md border px-2 text-sm"
              >
                <option value="servico">Serviço</option>
                <option value="produto">Produto</option>
              </select>
              <select
                name="categoria_item"
                defaultValue="servico"
                disabled={pending}
                className="h-10 rounded-md border px-2 text-sm"
              >
                <option value="peca">Peça</option>
                <option value="servico">Serviço</option>
                <option value="mao_obra">Mão de obra</option>
                <option value="outro">Outro</option>
              </select>
              <Input
                name="quantidade"
                type="number"
                step="0.001"
                defaultValue={1}
                disabled={pending}
              />
              <Input
                name="valor_unitario"
                type="number"
                step="0.01"
                defaultValue={0}
                disabled={pending}
              />
            </div>
            <div className="grid gap-2 md:grid-cols-3">
              <Input
                name="desconto"
                type="number"
                step="0.01"
                defaultValue={0}
                placeholder="Desconto"
                disabled={pending}
              />
              <Input
                name="acrescimo"
                type="number"
                step="0.01"
                defaultValue={0}
                placeholder="Acréscimo"
                disabled={pending}
              />
              <Input
                name="horas_previstas"
                type="number"
                step="0.1"
                placeholder="Horas previstas"
                disabled={pending}
              />
            </div>
            <select
              name="peca_origem"
              defaultValue="estoque"
              disabled={pending}
              className="h-10 w-full rounded-md border px-2 text-sm"
            >
              <option value="estoque">Estoque</option>
              <option value="cliente">Fornecida pelo cliente</option>
              <option value="compra">Compra sob demanda</option>
              <option value="outro">Outro</option>
            </select>
            <button
              type="submit"
              disabled={pending || !canOrcamento}
              className={cn(buttonVariants({ size: "sm" }))}
            >
              Incluir no orçamento
            </button>
          </form>
          <InspecaoEnvioPanel
            tenantSlug={tenantSlug}
            osId={os.id}
            osNumero={os.numero}
            emailConfigured={emailConfigured}
            versoes={orcamentoVersoes}
            shares={compartilhamentos}
            onRefresh={() => router.refresh()}
            disabled={pending || !canOrcamento}
          />
        </SectionCard>
      ) : null}

      {tab === "aprovacao" ? (
        <SectionCard
          title="Aprovação do cliente"
          description="Exige orçamento. A OS avança para Aguardando aprovação e só então para Aprovado / Parcialmente aprovado."
          contentClassName="pt-0 space-y-3"
        >
          {!canAprovar ? (
            <p className="text-sm text-amber-700 dark:text-amber-400">
              Status atual não permite aprovação. Conclua diagnóstico e orçamento
              primeiro.
            </p>
          ) : null}
          <label className="block space-y-1 text-sm">
            <span className="text-muted-foreground">Canal</span>
            <select
              value={aprovacaoCanal}
              onChange={(e) => setAprovacaoCanal(e.target.value)}
              disabled={pending}
              className="h-10 w-full rounded-md border px-3 text-sm"
            >
              {OS_APROVACAO_CANAL_OPTIONS.map((canal) => (
                <option key={canal.value} value={canal.value}>
                  {canal.label}
                </option>
              ))}
            </select>
          </label>

          <div className="space-y-2 rounded-lg border p-3">
            <p className="text-xs font-medium text-muted-foreground">
              Itens para aprovação parcial
            </p>
            {os.itens.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem itens no orçamento.</p>
            ) : (
              os.itens.map((item) => (
                <label key={item.id} className="flex items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={itensParciais.includes(item.id)}
                    disabled={pending}
                    onChange={() => toggleParcial(item.id)}
                  />
                  <span>
                    {item.descricao}{" "}
                    <span className="text-muted-foreground">
                      ({item.aprovacao_status} · {formatCurrency(item.valor_total)})
                    </span>
                  </span>
                </label>
              ))
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={pending || os.itens.length === 0 || !canAprovar}
              className={cn(buttonVariants({ size: "sm" }))}
              onClick={() =>
                run(
                  () =>
                    applyOsAprovacaoAction(tenantSlug, os.id, {
                      modo: "total",
                      canal: aprovacaoCanal,
                    }),
                  "Orçamento aprovado integralmente.",
                )
              }
            >
              Aprovar todos
            </button>
            <button
              type="button"
              disabled={pending || itensParciais.length === 0 || !canAprovar}
              className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
              onClick={() =>
                run(
                  () =>
                    applyOsAprovacaoAction(tenantSlug, os.id, {
                      modo: "parcial",
                      canal: aprovacaoCanal,
                      item_ids_aprovados: itensParciais,
                      motivo: "Aprovação parcial",
                    }),
                  "Aprovação parcial registrada.",
                )
              }
            >
              Aprovar selecionados
            </button>
            <button
              type="button"
              disabled={pending || os.itens.length === 0 || !canAprovar}
              className={cn(buttonVariants({ variant: "destructive", size: "sm" }))}
              onClick={() => {
                if (!window.confirm("Reprovar todo o orçamento?")) return;
                run(
                  () =>
                    applyOsAprovacaoAction(tenantSlug, os.id, {
                      modo: "reprovar",
                      canal: aprovacaoCanal,
                      motivo: "Cliente reprovou orçamento",
                    }),
                  "Orçamento reprovado.",
                );
              }}
            >
              Reprovar
            </button>
          </div>
        </SectionCard>
      ) : null}

      {tab === "execucao" ? (
        <SectionCard
          title="Execução"
          description="Somente itens aprovados. Estoque físico não é baixado aqui."
          contentClassName="pt-0"
        >
          {aprovados.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhum item aprovado para execução. Aprove o orçamento primeiro.
            </p>
          ) : (
            <ul className="space-y-2">
              {aprovados.map((item) => (
                <li
                  key={item.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm"
                >
                  <div>
                    <p className="font-medium">{item.descricao}</p>
                    <p className="text-xs text-muted-foreground">
                      Status: {item.execucao_status}
                      {item.horas_previstas != null
                        ? ` · previsto ${item.horas_previstas}h`
                        : ""}
                      {item.horas_realizadas != null
                        ? ` · realizado ${item.horas_realizadas}h`
                        : ""}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Input
                      type="number"
                      step="0.1"
                      min={0}
                      placeholder="Horas realizadas"
                      value={execHoras[item.id] ?? ""}
                      onChange={(e) =>
                        setExecHoras((prev) => ({
                          ...prev,
                          [item.id]: e.target.value,
                        }))
                      }
                      disabled={pending}
                      className="h-8 w-28 text-xs"
                    />
                    <div className="flex flex-wrap gap-1">
                      {["em_execucao", "pausado", "concluido", "cancelado"].map(
                        (st) => (
                      <button
                        key={st}
                        type="button"
                        disabled={pending || item.execucao_status === "cancelado"}
                        className={cn(
                          buttonVariants({
                            variant: st === "cancelado" ? "destructive" : "outline",
                            size: "sm",
                          }),
                        )}
                        onClick={() => {
                          if (st === "cancelado") {
                            if (
                              !window.confirm(
                                `Cancelar execução de "${item.descricao}"?`,
                              )
                            ) {
                              return;
                            }
                          }
                          run(
                            () =>
                              updateOsItemExecucaoAction(
                                tenantSlug,
                                os.id,
                                item.id,
                                {
                                  status: st as "em_execucao" | "pausado" | "concluido" | "cancelado",
                                  horas_realizadas: execHoras[item.id]
                                    ? Number(execHoras[item.id])
                                    : null,
                                },
                              ),
                            `Execução: ${EXEC_LABELS[st] ?? st}`,
                          );
                        }}
                      >
                        {EXEC_LABELS[st] ?? st}
                      </button>
                        ),
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      ) : null}

      {tab === "financeiro" ? (
        <SectionCard
          title="Faturamento"
          description="Reutiliza o motor de vendas. Estoque baixa uma única vez na fatura."
          contentClassName="pt-0 space-y-3"
        >
          {os.venda_id ? (
            <p className="text-sm">
              Já faturada.{" "}
              <Link
                href={`/${tenantSlug}/vendas/${os.venda_id}`}
                className="underline"
              >
                Abrir venda
              </Link>
            </p>
          ) : (
            <>
              {faturarBloqueio ? (
                <FeedbackMessage variant="error">{faturarBloqueio}</FeedbackMessage>
              ) : null}
              <form
                className="space-y-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!canFaturar) {
                    setError(faturarBloqueio ?? "Faturamento bloqueado.");
                    return;
                  }
                  if (
                    !window.confirm(
                      "Faturar itens aprovados? Será criada uma venda e Conta a Receber pelo motor atual.",
                    )
                  ) {
                    return;
                  }
                  const fd = new FormData(e.currentTarget);
                  run(
                    () =>
                      faturarOsAction(tenantSlug, os.id, {
                        forma_pagamento_id: String(fd.get("forma_pagamento_id")),
                        data_venda: String(fd.get("data_venda")),
                      }),
                    "OS faturada. Venda e Contas a Receber geradas pelo motor atual.",
                  );
                }}
              >
                <select
                  name="forma_pagamento_id"
                  required
                  disabled={pending || !canFaturar}
                  className="h-10 w-full rounded-md border px-3 text-sm"
                >
                  <option value="">Forma de pagamento</option>
                  {formasPagamento.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.nome}
                    </option>
                  ))}
                </select>
                <Input
                  name="data_venda"
                  type="date"
                  required
                  disabled={pending || !canFaturar}
                  defaultValue={new Date().toISOString().slice(0, 10)}
                />
                <button
                  type="submit"
                  disabled={pending || !canFaturar}
                  className={cn(buttonVariants({ size: "sm" }))}
                >
                  Faturar itens aprovados
                </button>
              </form>
            </>
          )}
        </SectionCard>
      ) : null}

      {tab === "entrega" ? (
        <SectionCard title="Entrega" contentClassName="pt-0 space-y-3">
          {os.previsoes.length > 0 ? (
            <div className="space-y-2 rounded-lg border p-3">
              <p className="text-xs font-medium text-muted-foreground">
                Histórico de previsões
              </p>
              <ul className="space-y-1 text-sm">
                {os.previsoes.map((p) => (
                  <li key={p.id} className="text-muted-foreground">
                    {p.previsao_anterior ?? "—"} → {p.previsao_nova}
                    {p.motivo ? ` · ${p.motivo}` : ""}
                    <span className="block text-xs">
                      {new Date(p.created_at).toLocaleString("pt-BR")}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <form
            className="space-y-2"
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              run(
                () =>
                  updateOsPrevisaoAction(tenantSlug, os.id, {
                    previsao_entrega: String(fd.get("previsao_entrega")),
                    motivo: String(fd.get("motivo")),
                  }),
                "Previsão atualizada.",
              );
            }}
          >
            <p className="text-xs font-medium text-muted-foreground">
              Alterar previsão
            </p>
            <Input
              name="previsao_entrega"
              type="datetime-local"
              required
              disabled={pending}
            />
            <Input name="motivo" required placeholder="Motivo" disabled={pending} />
            <button
              type="submit"
              disabled={pending}
              className={cn(buttonVariants({ size: "sm", variant: "outline" }))}
            >
              Salvar previsão
            </button>
          </form>
          <form
            className="space-y-2 border-t pt-3"
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              run(
                () =>
                  concluirOsEntregaAction(tenantSlug, os.id, {
                    quilometragem_saida: fd.get("quilometragem_saida")
                      ? Number(fd.get("quilometragem_saida"))
                      : null,
                    garantia_dias: fd.get("garantia_dias")
                      ? Number(fd.get("garantia_dias"))
                      : null,
                    forcar: fd.get("forcar") === "on",
                    motivo_excecao: String(fd.get("motivo_excecao") || "") || null,
                  }),
                "Entrega concluída.",
              );
            }}
          >
            <Input
              name="quilometragem_saida"
              type="number"
              placeholder="Km saída"
              disabled={pending}
            />
            <Input
              name="garantia_dias"
              type="number"
              placeholder="Garantia (dias)"
              disabled={pending}
            />
            <label className="flex items-center gap-2 text-xs">
              <input type="checkbox" name="forcar" disabled={pending} /> Exceção
              autorizada
            </label>
            <Input
              name="motivo_excecao"
              placeholder="Motivo da exceção"
              disabled={pending}
            />
            <button
              type="submit"
              disabled={pending}
              className={cn(buttonVariants({ size: "sm" }))}
            >
              Concluir entrega
            </button>
          </form>
        </SectionCard>
      ) : null}

      {tab === "historico" ? (
        <SectionCard title="Histórico" contentClassName="pt-0">
          <ul className="space-y-2">
            {os.eventos.length === 0 ? (
              <li className="text-sm text-muted-foreground">Sem eventos.</li>
            ) : (
              os.eventos.map((ev) => (
                <li key={ev.id} className="rounded-lg border px-3 py-2 text-sm">
                  <p className="font-medium">{ev.descricao}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatOsEventoLine(ev)}
                  </p>
                </li>
              ))
            )}
          </ul>
        </SectionCard>
      ) : null}

      {tab === "anexos" ? (
        <AnexosPanel
          tenantSlug={tenantSlug}
          osId={os.id}
          anexos={anexos}
          onRefresh={() => router.refresh()}
          disabled={pending}
        />
      ) : null}

      {tab === "retorno" ? (
        <SectionCard title="Retorno / garantia" contentClassName="pt-0">
          <form
            className="space-y-2"
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              run(
                () =>
                  createOsRetornoAction(tenantSlug, os.id, {
                    motivo: String(fd.get("motivo")),
                    tipo_retorno: String(fd.get("tipo_retorno")),
                    tipo_cobertura: String(fd.get("tipo_cobertura") || "garantia"),
                    diagnostico: String(fd.get("diagnostico") || "") || null,
                  }),
                "Retorno/garantia registrado (histórico original preservado).",
              );
            }}
          >
            <Input name="motivo" required placeholder="Motivo" disabled={pending} />
            <select
              name="tipo_retorno"
              disabled={pending}
              className="h-10 w-full rounded-md border px-3 text-sm"
            >
              <option value="garantia">Garantia</option>
              <option value="retrabalho">Retrabalho</option>
              <option value="novo_problema">Novo problema</option>
              <option value="cortesia">Cortesia</option>
              <option value="cobranca_adicional">Cobrança adicional</option>
            </select>
            <select
              name="tipo_cobertura"
              disabled={pending}
              className="h-10 w-full rounded-md border px-3 text-sm"
            >
              <option value="garantia">Cobertura garantia</option>
              <option value="pago">Pago</option>
            </select>
            <Input
              name="diagnostico"
              placeholder="Diagnóstico do retorno"
              disabled={pending}
            />
            <button
              type="submit"
              disabled={pending}
              className={cn(buttonVariants({ size: "sm" }))}
            >
              Registrar retorno
            </button>
          </form>
        </SectionCard>
      ) : null}

      <p className="text-xs text-muted-foreground">
        Status canônicos: {OS_STATUS.length} · Transições e tenant validados no
        servidor.
      </p>

      {os.veiculo_id ? (
        <OsVeiculoEditDialog
          open={veiculoMasterOpen}
          onOpenChange={setVeiculoMasterOpen}
          tenantSlug={tenantSlug}
          veiculo={{
            id: os.veiculo_id,
            placa: os.placa,
            marca: null,
            modelo: os.modelo,
            ano: null,
            cor: null,
          }}
          onUpdated={() => {
            loadVeiculos(os.cliente_id);
            router.refresh();
          }}
        />
      ) : null}
    </div>
  );
}
