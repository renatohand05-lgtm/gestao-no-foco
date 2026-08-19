"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import { OsDescontoPanel } from "@/components/ordens/os-desconto-panel";
import { OsLifecycleMenu } from "@/components/ordens/os-lifecycle-menu";
import { OsRecursoBinder } from "@/components/ordens/os-recurso-binder";
import { OsMecanicoBinder } from "@/components/ordens/os-mecanico-binder";
import { OsOrcamentoItensPanel } from "@/components/ordens/os-orcamento-itens-panel";
import {
  OsVeiculoPicker,
  useClienteVeiculos,
} from "@/components/ordens/os-veiculo-picker";
import { AnexosPanel } from "@/components/ordens/inspecao/anexos-panel";
import { ChecklistVisual } from "@/components/ordens/inspecao/checklist-visual";
import { InspecaoEnvioPanel } from "@/components/ordens/inspecao/inspecao-envio-panel";
import { OsVeiculoEditDialog } from "@/components/ordens/os-veiculo-edit-dialog";
import { ServiceReadyPanel } from "@/components/retention/service-ready-panel";
import {
  createManualReturnAction,
  registerOsPickupAction,
} from "@/lib/retention/actions";
import { AUTOMOTIVE_RETURN_PRESETS } from "@/lib/ux/fast-input";
import { GFSelect } from "@/components/gf/gf-select";
import { FormasPagamentoEmptyHint } from "@/components/financeiro/formas-pagamento-empty-hint";
import { PAYMENT_METHODS_EMPTY_TEXT } from "@/lib/financeiro/formas-pagamento-catalog";
import { buttonVariants } from "@/components/ui/button";
import { FeedbackMessage } from "@/components/ui/feedback-message";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { ExecutiveSection } from "@/components/executive";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  applyOsAprovacaoAction,
  changeOsStatusAction,
  concluirOsEntregaAction,
  createOsRetornoAction,
  faturarOsAction,
  saveOsDiagnosticoAction,
  skipDiagnosticoOrcamentoAction,
  updateOsHeaderAction,
  updateOsItemExecucaoAction,
  updateOsPrevisaoAction,
  updateOsVeiculoAction,
} from "@/lib/ordens/actions";
import { formatOsEventoLine } from "@/lib/ordens/os-event-format";
import { formatCurrency } from "@/lib/format";
import { requiresDiagnosisBeforeBudget, canAdvanceToApproval } from "@/lib/ordens/budget-gate";
import {
  canEditOrcamento,
  canFaturarStatus,
  canMarkAguardandoRetirada,
  canMutateOsExecution,
  canRegisterDiagnostico,
  deliveryUiMode,
  diagnosisCompletedFromOsStatus,
  itemAprovacaoIsApproved,
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

export type OsWorkspaceProps = {
  tenantSlug: string;
  os: OrdemServicoDetail;
  produtos: Option[];
  formasPagamento: Option[];
  canConfigureFormas?: boolean;
  veiculosIniciais: import("@/lib/ordens/veiculo-shared").VeiculoOption[];
  anexos: OsAnexoRecord[];
  orcamentoVersoes: OrcamentoVersaoRecord[];
  compartilhamentos: ShareListItem[];
  emailConfigured: boolean;
  recorrencia?: import("@/lib/crm/cliente-recorrencia-service").ClienteRecorrencia | null;
  canApplyDesconto?: boolean;
  canAddPersonalizado?: boolean;
  canConvertPersonalizado?: boolean;
  canCancel?: boolean;
  canArquivar?: boolean;
  canExcluirRascunho?: boolean;
  canExcluirPermanente?: boolean;
  canRestaurar?: boolean;
  recursos?: import("@/lib/operacoes/recursos-service").OficinaRecurso[];
  canBindRecurso?: boolean;
  mecanicosCadastro?: import("@/lib/mecanicos/mecanico-service").Mecanico[];
  osMecanicos?: import("@/lib/mecanicos/os-mecanico-service").OrdemServicoMecanico[];
  osCustoReal?: import("@/lib/mecanicos/os-mecanico-service").OsCustoReal | null;
  canAtribuirMecanico?: boolean;
  canTransferirMecanico?: boolean;
  canApontarHoras?: boolean;
  professionalLabel?: string;
  professionalsLabel?: string;
  uiCopy?: import("@/lib/segments/copy.ts").SegmentUiCopyClient;
  serviceReadyEnabled?: boolean;
  canFinalize?: boolean;
  canNotify?: boolean;
  notifyReadyAuto?: boolean;
  empresaNome?: string;
  tenantSegment?: string | null;
  clientePhone?: string | null;
  clienteEmail?: string | null;
  whatsappProviderConfigured?: boolean;
  emailProviderConfigured?: boolean;
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
  formasPagamento,
  canConfigureFormas = false,
  veiculosIniciais,
  anexos,
  orcamentoVersoes,
  compartilhamentos,
  emailConfigured,
  recorrencia = null,
  canApplyDesconto = false,
  canAddPersonalizado = false,
  canConvertPersonalizado = false,
  canCancel = false,
  canArquivar = false,
  canExcluirRascunho = false,
  canExcluirPermanente = false,
  canRestaurar = false,
  recursos = [],
  canBindRecurso = false,
  mecanicosCadastro = [],
  osMecanicos = [],
  osCustoReal = null,
  canAtribuirMecanico = false,
  canTransferirMecanico = false,
  canApontarHoras = false,
  professionalLabel = "Mecânico",
  professionalsLabel = "Mecânicos",
  uiCopy,
  serviceReadyEnabled = false,
  canFinalize = false,
  canNotify = false,
  notifyReadyAuto = false,
  empresaNome = "",
  tenantSegment = null,
  clientePhone = null,
  clienteEmail = null,
  whatsappProviderConfigured = false,
  emailProviderConfigured = false,
}: OsWorkspaceProps) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("resumo");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [aprovacaoCanal, setAprovacaoCanal] = useState<string>("presencial");
  const [itensParciais, setItensParciais] = useState<string[]>([]);
  const [veiculoEditId, setVeiculoEditId] = useState(os.veiculo_id ?? "");
  const [execHoras, setExecHoras] = useState<Record<string, string>>({});
  const [veiculoMasterOpen, setVeiculoMasterOpen] = useState(false);
  const [formaPagamentoFaturar, setFormaPagamentoFaturar] = useState(
    formasPagamento[0]?.id ?? "",
  );
  const {
    veiculos,
    error: veiculoError,
    loading: veiculoLoading,
    load: loadVeiculos,
  } = useClienteVeiculos(tenantSlug, veiculosIniciais);

  function statusCopy(status: string) {
    return (
      uiCopy?.statusLabels[status] ??
      OS_STATUS_LABELS[status as OsStatus] ??
      status
    );
  }

  const requireDiagnosis = requiresDiagnosisBeforeBudget({
    automotiveWorkflow: uiCopy?.automotiveWorkflow,
  });
  const canDiagnostico = canRegisterDiagnostico(os.status);
  const canOrcamento = canEditOs(os) && canEditOrcamento(os.status, requireDiagnosis);
  const publishedBudget = orcamentoVersoes.some(
    (v) => v.status === "publicado" || v.status === "enviado" || v.status === "pronto",
  );
  const approvalGate = canAdvanceToApproval({
    workflowConfig: { automotiveWorkflow: uiCopy?.automotiveWorkflow },
    budgetPublished: publishedBudget,
    diagnosisCompleted: diagnosisCompletedFromOsStatus(os.status),
    osStatus: os.status,
  });
  const canAprovar = canEditOs(os) && approvalGate.ok;
  const canOpenServiceReady =
    serviceReadyEnabled &&
    canFinalize &&
    canMarkAguardandoRetirada(os.status);
  const executionLocked = !canMutateOsExecution(os.status);
  const entregaMode = deliveryUiMode(os.status, os.aceite_entrega_em);
  const nextStatuses = (OS_TRANSITIONS[os.status as OsStatus] ?? []).filter(
    (s) => s !== "cancelado",
  );
  const canFaturar =
    !os.venda_id &&
    os.status !== "cancelado" &&
    os.status !== "cancelada" &&
    canFaturarStatus(os.status);
  const faturarBloqueio = os.venda_id
    ? (uiCopy?.alreadyBilledMessage ??
      "OS já faturada — segundo faturamento bloqueado.")
    : os.status === "cancelado" || os.status === "cancelada"
      ? (uiCopy?.cannotBillCanceledMessage ??
        "Não é possível faturar OS cancelada.")
      : !canFaturarStatus(os.status)
        ? `Status atual (${statusCopy(os.status)}) não permite faturar.`
        : null;

  const aprovados = useMemo(
    () => os.itens.filter((i) => itemAprovacaoIsApproved(i.aprovacao_status)),
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
    const label = statusCopy(status);
    if (status === "cancelado") {
      if (
        !window.confirm(
          uiCopy && !uiCopy.automotiveWorkflow
            ? `Cancelar este ${uiCopy.workOrder.toLowerCase()}? A ação é irreversível e não pode ser desfeita após confirmação.`
            : "Cancelar esta OS? A ação é irreversível e não pode ser desfeita após confirmação.",
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
          label={statusCopy(os.status)}
        />
        {os.arquivado_em ? (
          <StatusBadge label="Arquivada" />
        ) : null}
        <span className="text-sm text-muted-foreground">
          #{os.numero}
        </span>
        <div className="text-sm">
          <p className="font-medium">{os.cliente_nome ?? uiCopy?.customer ?? "Cliente"}</p>
          {uiCopy?.showVehicles !== false ? (
            <>
              <p>
                {[os.marca, os.modelo].filter(Boolean).join(" ") ||
                  (uiCopy?.vehicleLabel ?? "Veículo")}
              </p>
              <p className="font-mono tracking-wide">
                {os.placa ?? uiCopy?.missingVehicleLabel ?? "sem placa"}
              </p>
            </>
          ) : null}
        </div>
        <span className="ml-auto text-sm font-semibold tabular-nums">
          {formatCurrency(os.valor_total)}
        </span>
      </div>

      <OsLifecycleMenu
        tenantSlug={tenantSlug}
        osId={os.id}
        numero={os.numero}
        clienteNome={os.cliente_nome}
        placa={os.placa}
        modelo={os.modelo}
        status={os.status}
        vendaId={os.venda_id}
        arquivadoEm={os.arquivado_em}
        canCancel={canCancel}
        canArquivar={canArquivar}
        canExcluirRascunho={canExcluirRascunho}
        canExcluirPermanente={canExcluirPermanente}
        canRestaurar={canRestaurar}
        cancelLabel={
          uiCopy && !uiCopy.automotiveWorkflow
            ? `Cancelar ${uiCopy.workOrder.toLowerCase()}`
            : "Cancelar OS"
        }
      />

      <OsRecursoBinder
        tenantSlug={tenantSlug}
        osId={os.id}
        recursoId={os.recurso_id}
        recursoNome={
          recursos.find((r) => r.id === os.recurso_id)?.nome ?? null
        }
        recursos={recursos}
        canEdit={canBindRecurso && canEditOs(os)}
      />

      <OsMecanicoBinder
        tenantSlug={tenantSlug}
        osId={os.id}
        osMecanicoId={os.mecanico_id}
        alocacoes={osMecanicos}
        mecanicos={mecanicosCadastro}
        custoReal={osCustoReal}
        canAtribuir={canAtribuirMecanico && canEditOs(os)}
        canTransferir={canTransferirMecanico && canEditOs(os)}
        canApontar={canApontarHoras && !executionLocked}
        professionalLabel={professionalLabel}
        professionalsLabel={professionalsLabel}
      />

      <div className="flex flex-wrap gap-1.5">
        {TABS.filter(
          (t) => t !== "diagnostico" || uiCopy?.automotiveWorkflow !== false,
        ).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium",
              tab === t
                ? "border-emerald-600 bg-emerald-600/10 text-emerald-800 dark:text-emerald-300"
                : "border-border hover:bg-muted",
            )}
          >
            {uiCopy?.workspaceTabLabels[t] ?? t}
          </button>
        ))}
      </div>

      {tab === "resumo" ? (
        <ExecutiveSection title="Resumo" panel>
          <ServiceReadyPanel
            tenantSlug={tenantSlug}
            osId={os.id}
            enabled={canOpenServiceReady}
            canFinalize={canFinalize}
            canNotify={canNotify}
            notifyReadyAuto={notifyReadyAuto}
            awaitingPickup={os.status === "pronto_para_entrega"}
            segment={tenantSegment}
            clienteNome={os.cliente_nome ?? ""}
            empresaNome={empresaNome}
            clientePhone={clientePhone}
            clienteEmail={clienteEmail}
            whatsappProviderConfigured={whatsappProviderConfigured}
            emailProviderConfigured={emailProviderConfigured}
            preview={{
              itens: os.itens,
              marca: os.marca,
              modelo: os.modelo,
              placa: os.placa,
            }}
            finalizeOnlyLabel={uiCopy?.finalizeOnlyLabel ?? "Finalizar serviço"}
            finalizeAndNotifyLabel={
              uiCopy?.finalizeAndNotifyLabel ?? "Finalizar e avisar cliente"
            }
            sheetTitle={uiCopy?.serviceReadySheetTitle ?? "Serviço concluído"}
          />
          {os.status === "pronto_para_entrega" && canFinalize ? (
            <button
              type="button"
              className={cn(buttonVariants({ size: "sm" }), "mb-3 min-h-11")}
              disabled={pending}
              onClick={() =>
                run(
                  () =>
                    registerOsPickupAction(tenantSlug, { osId: os.id }),
                  uiCopy?.registerPickupLabel ?? "Retirada registrada.",
                )
              }
            >
              {uiCopy?.registerPickupLabel ?? "Registrar retirada"}
            </button>
          ) : null}
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
                  uiCopy?.headerSavedMessage ?? "Dados da OS salvos.",
                );
              }}
            >
              <p className="text-xs font-medium text-muted-foreground">
                {uiCopy && !uiCopy.automotiveWorkflow
                  ? `Editar dados do ${uiCopy.workOrder.toLowerCase()}`
                  : "Editar dados da OS"}
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
                {uiCopy?.showVehicles !== false && !uiCopy?.compactVehicleVitals ? (
                  <Input
                    name="quilometragem_entrada"
                    type="number"
                    min={0}
                    defaultValue={os.quilometragem_entrada ?? ""}
                    placeholder="Km entrada"
                    disabled={pending}
                  />
                ) : null}
                <Input
                  name="previsao_entrega"
                  type="datetime-local"
                  defaultValue={os.previsao_entrega ?? ""}
                  disabled={pending}
                />
                {uiCopy?.showVehicles !== false && !uiCopy?.compactVehicleVitals ? (
                  <Input
                    name="nivel_combustivel"
                    defaultValue={os.nivel_combustivel ?? ""}
                    placeholder="Nível combustível"
                    disabled={pending}
                  />
                ) : null}
                <NativeSelect
                  name="prioridade"
                  defaultValue={os.prioridade}
                  disabled={pending}
                  className="h-10"
                >
                  <option value="baixa">Baixa</option>
                  <option value="normal">Normal</option>
                  <option value="alta">Alta</option>
                  <option value="urgente">Urgente</option>
                </NativeSelect>
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
                {uiCopy?.compactVehicleVitals && uiCopy.showVehicles !== false ? (
                  <details className="md:col-span-2 rounded-md border border-border/60 p-2">
                    <summary className="cursor-pointer text-xs text-muted-foreground">
                      Km e combustível (opcional)
                    </summary>
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                      <Input
                        name="quilometragem_entrada"
                        type="number"
                        min={0}
                        defaultValue={os.quilometragem_entrada ?? ""}
                        placeholder="Km entrada"
                        disabled={pending}
                      />
                      <Input
                        name="nivel_combustivel"
                        defaultValue={os.nivel_combustivel ?? ""}
                        placeholder="Nível combustível"
                        disabled={pending}
                      />
                    </div>
                  </details>
                ) : null}
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
            {uiCopy?.showVehicles !== false ? (
            <div>
              <dt className="text-muted-foreground">Km entrada</dt>
              <dd>{os.quilometragem_entrada ?? "—"}</dd>
            </div>
            ) : null}
            <div>
              <dt className="text-muted-foreground">Prioridade</dt>
              <dd>{os.prioridade}</dd>
            </div>
          </dl>

          {!os.venda_id && os.status !== "cancelado" && uiCopy?.showVehicles !== false ? (
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
                      variant: "outline",
                      size: "sm",
                    }),
                  )}
                  onClick={() => handleStatusChange(status)}
                >
                  → {statusCopy(status)}
                </button>
              ))
            )}
          </div>
        </ExecutiveSection>
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
        <ExecutiveSection
          title={uiCopy?.diagnosisSectionTitle ?? "Diagnóstico"}
          description={
            uiCopy?.diagnosisSectionDescription ??
            "Não gera movimentação financeira. Ao salvar a partir de Rascunho, a OS avança Rascunho → Aguardando diagnóstico → Diagnóstico concluído."
          }
          panel
        >
          {!canDiagnostico ? (
            <p className="mb-3 text-sm text-amber-700 dark:text-amber-400">
              {uiCopy && !uiCopy.automotiveWorkflow
                ? "Status atual não permite nova análise operacional."
                : "Status atual não permite novo diagnóstico operacional."}
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
                uiCopy?.diagnosisSavedMessage ?? "Diagnóstico salvo.",
              );
            }}
          >
            <Input name="sintoma_relatado" placeholder="Sintoma relatado" disabled={pending || !canDiagnostico} />
            <textarea
              name="diagnostico_tecnico"
              placeholder={uiCopy?.diagnosisPlaceholder ?? "Diagnóstico técnico"}
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
              <NativeSelect name="gravidade" disabled={pending || !canDiagnostico} className="h-10">
                <option value="">Gravidade</option>
                <option value="baixa">Baixa</option>
                <option value="media">Média</option>
                <option value="alta">Alta</option>
                <option value="critica">Crítica</option>
              </NativeSelect>
              <NativeSelect name="urgencia" disabled={pending || !canDiagnostico} className="h-10">
                <option value="">Urgência</option>
                <option value="baixa">Baixa</option>
                <option value="media">Média</option>
                <option value="alta">Alta</option>
              </NativeSelect>
            </div>
            <button
              type="submit"
              disabled={pending || !canDiagnostico}
              className={cn(buttonVariants({ size: "sm" }))}
            >
              {uiCopy && !uiCopy.automotiveWorkflow
                ? "Salvar análise"
                : "Salvar diagnóstico"}
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
        </ExecutiveSection>
      ) : null}

      {tab === "orcamento" ? (
        <ExecutiveSection
          title="Orçamento"
          description="Orçamento não gera receita nem baixa estoque. O primeiro item avança Diagnóstico concluído → Aguardando orçamento."
          panel
        >
          {!canOrcamento ? (
            <div className="space-y-3">
            <p className="text-sm text-amber-700 dark:text-amber-400">
              {requireDiagnosis
                ? "Conclua o diagnóstico antes de montar o orçamento."
                : "Status atual ainda não permite editar o orçamento."}
            </p>
            {requireDiagnosis && canEditOs(os) ? (
              <form
                className="space-y-2 rounded-lg border p-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  const fd = new FormData(e.currentTarget);
                  run(
                    () =>
                      skipDiagnosticoOrcamentoAction(tenantSlug, os.id, {
                        justificativa: String(fd.get("justificativa") ?? ""),
                      }),
                    "Orçamento liberado sem concluir diagnóstico.",
                  );
                }}
              >
                <p className="text-sm font-medium">
                  Montar orçamento sem concluir diagnóstico
                </p>
                <Input
                  name="justificativa"
                  required
                  minLength={8}
                  placeholder="Justificativa (obrigatória)"
                  disabled={pending}
                />
                <button type="submit" disabled={pending} className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
                  Liberar orçamento
                </button>
              </form>
            ) : null}
            </div>
          ) : null}
          <OsOrcamentoItensPanel
            tenantSlug={tenantSlug}
            os={os}
            canEdit={canEditOs(os) && canOrcamento}
            canAddPersonalizado={canAddPersonalizado}
            canConvertPersonalizado={canConvertPersonalizado}
            onDone={(msg) => {
              setSuccess(msg);
              setError(null);
              router.refresh();
            }}
            onError={(msg) => {
              setError(msg);
              setSuccess(null);
            }}
          />

          <InspecaoEnvioPanel
            tenantSlug={tenantSlug}
            osId={os.id}
            osNumero={os.numero}
            emailConfigured={emailConfigured}
            whatsappPhone={clientePhone}
            clienteEmail={clienteEmail}
            clienteNome={os.cliente_nome}
            valorTotal={os.valor_total}
            versoes={orcamentoVersoes}
            shares={compartilhamentos}
            onRefresh={() => router.refresh()}
            disabled={pending || !canOrcamento}
          />
          <div className="border-t pt-4">
            <h3 className="mb-2 text-sm font-medium">Desconto do orçamento</h3>
            <OsDescontoPanel
              tenantSlug={tenantSlug}
              osId={os.id}
              subtotal={os.subtotal}
              recorrencia={recorrencia}
              canApply={canApplyDesconto && canEditOs(os)}
            />
          </div>
        </ExecutiveSection>
      ) : null}

      {tab === "aprovacao" ? (
        <ExecutiveSection
          title="Aprovação do cliente"
          description={
            uiCopy && !uiCopy.automotiveWorkflow
              ? `Exige orçamento. O ${uiCopy.workOrder.toLowerCase()} avança para Aguardando aprovação e só então para Aprovado / Parcialmente aprovado.`
              : "Exige orçamento. A OS avança para Aguardando aprovação e só então para Aprovado / Parcialmente aprovado."
          }
          panel
        >
          {!canAprovar ? (
            <p className="text-sm text-amber-700 dark:text-amber-400">
              {approvalGate.reason ||
                "Publique o orçamento antes de solicitar aprovação."}
            </p>
          ) : null}
          <label className="block space-y-1 text-sm">
            <span className="text-muted-foreground">Canal</span>
            <GFSelect
              value={aprovacaoCanal}
              onValueChange={setAprovacaoCanal}
              disabled={pending}
              aria-label="Canal de aprovação"
              triggerClassName="h-10"
              options={OS_APROVACAO_CANAL_OPTIONS.map((canal) => ({
                value: canal.value,
                label: canal.label,
              }))}
            />
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
        </ExecutiveSection>
      ) : null}

      {tab === "execucao" ? (
        <ExecutiveSection
          title="Execução"
          description="Somente itens aprovados. Estoque físico não é baixado aqui."
          panel
        >
          {aprovados.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhum item aprovado para execução. Aprove o orçamento primeiro.
            </p>
          ) : null}
          {executionLocked ? (
            <p className="text-sm text-amber-700 dark:text-amber-400">
              Esta OS já foi encerrada. Histórico de execução permanece visível,
              sem novas ações.
            </p>
          ) : null}
          {aprovados.length > 0 ? (
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
                      disabled={pending || executionLocked}
                      className="h-8 w-28 text-xs"
                    />
                    <div className="flex flex-wrap gap-1">
                      {["em_execucao", "pausado", "concluido", "cancelado"].map(
                        (st) => (
                      <button
                        key={st}
                        type="button"
                        disabled={
                        pending ||
                        executionLocked ||
                        item.execucao_status === "cancelado"
                      }
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
          ) : null}
        </ExecutiveSection>
      ) : null}

      {tab === "financeiro" ? (
        <ExecutiveSection
          title="Faturamento"
          description="Reutiliza o motor de vendas. Estoque baixa uma única vez na fatura."
          panel
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
                        forma_pagamento_id: formaPagamentoFaturar,
                        data_venda: String(fd.get("data_venda")),
                      }),
                    uiCopy?.billedSuccessMessage ??
                      "OS faturada. Venda e Contas a Receber geradas pelo motor atual.",
                  );
                }}
              >
                <GFSelect
                  name="forma_pagamento_id"
                  required
                  disabled={pending || !canFaturar}
                  value={formaPagamentoFaturar || undefined}
                  onValueChange={setFormaPagamentoFaturar}
                  placeholder="Forma de pagamento"
                  emptyText={PAYMENT_METHODS_EMPTY_TEXT}
                  aria-label="Forma de pagamento"
                  triggerClassName="h-10"
                  options={formasPagamento.map((f) => ({
                    value: f.id,
                    label: f.nome,
                  }))}
                />
                {formasPagamento.length === 0 ? (
                  <FormasPagamentoEmptyHint
                    tenantSlug={tenantSlug}
                    canConfigure={canConfigureFormas}
                  />
                ) : null}
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
        </ExecutiveSection>
      ) : null}

      {tab === "entrega" ? (
        <ExecutiveSection title="Entrega" panel>
          {os.status === "pronto_para_entrega" && canFinalize ? (
            <button
              type="button"
              className={cn(buttonVariants({ size: "sm" }), "min-h-11")}
              disabled={pending}
              onClick={() =>
                run(
                  () => registerOsPickupAction(tenantSlug, { osId: os.id }),
                  uiCopy?.registerPickupLabel ?? "Retirada registrada.",
                )
              }
            >
              {uiCopy?.registerPickupLabel ?? "Registrar retirada"}
            </button>
          ) : null}
          {canOpenServiceReady ? (
          <ServiceReadyPanel
            tenantSlug={tenantSlug}
            osId={os.id}
            enabled={canOpenServiceReady}
            canFinalize={canFinalize}
            canNotify={canNotify}
            notifyReadyAuto={notifyReadyAuto}
            awaitingPickup={os.status === "pronto_para_entrega"}
            segment={tenantSegment}
            clienteNome={os.cliente_nome ?? ""}
            empresaNome={empresaNome}
            clientePhone={clientePhone}
            clienteEmail={clienteEmail}
            whatsappProviderConfigured={whatsappProviderConfigured}
            emailProviderConfigured={emailProviderConfigured}
            preview={{
              itens: os.itens,
              marca: os.marca,
              modelo: os.modelo,
              placa: os.placa,
            }}
            finalizeOnlyLabel={uiCopy?.finalizeOnlyLabel ?? "Finalizar serviço"}
            finalizeAndNotifyLabel={
              uiCopy?.finalizeAndNotifyLabel ?? "Finalizar e avisar cliente"
            }
            sheetTitle={uiCopy?.serviceReadySheetTitle ?? "Serviço concluído"}
          />
          ) : null}
          {entregaMode === "done" || entregaMode === "billed" ? (
            <div className="space-y-1 rounded-lg border p-3 text-sm">
              <p className="font-medium">Entrega concluída</p>
              {entregaMode === "billed" ? (
                <p className="text-muted-foreground">Esta OS já está faturada.</p>
              ) : null}
              <p className="text-muted-foreground">
                Aceite:{" "}
                {os.aceite_entrega_em
                  ? new Date(os.aceite_entrega_em).toLocaleString("pt-BR")
                  : "—"}
              </p>
              <p className="text-muted-foreground">
                Registrado por: {os.aceite_entrega_por ?? "—"}
              </p>
              <p className="text-muted-foreground">
                Km saída: {os.quilometragem_saida ?? "—"}
              </p>
              <p className="text-muted-foreground">
                Garantia: {os.garantia_dias != null ? `${os.garantia_dias} dias` : "—"}
              </p>
              {os.observacoes ? (
                <p className="text-muted-foreground">Obs.: {os.observacoes}</p>
              ) : null}
            </div>
          ) : null}
          {entregaMode === "legacy_billed" ? (
            <div className="space-y-1 rounded-lg border border-amber-300 p-3 text-sm">
              <p className="font-medium">OS faturada</p>
              <p className="text-amber-800 dark:text-amber-400">
                Entrega histórica inconsistente: não há aceite de retirada
                registrado. Nenhum aceite será inventado e a entrega não pode
                ser concluída novamente.
              </p>
              {os.venda_id ? (
                <p className="text-muted-foreground">Já faturada no financeiro.</p>
              ) : null}
            </div>
          ) : null}
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
          {entregaMode === "ready" ? (
            <>
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
              if (os.status !== "pronto_para_entrega") {
                setError(
                  "Finalize os serviços e marque o veículo como pronto para retirada antes de concluir a entrega.",
                );
                return;
              }
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
              disabled={pending || os.status !== "pronto_para_entrega"}
              className={cn(buttonVariants({ size: "sm" }))}
            >
              Concluir entrega
            </button>
          </form>
            </>
          ) : null}
        </ExecutiveSection>
      ) : null}

      {tab === "historico" ? (
        <ExecutiveSection title="Histórico" panel>
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
        </ExecutiveSection>
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
        <ExecutiveSection title="Retorno / garantia" panel>
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
            <NativeSelect
              name="tipo_retorno"
              disabled={pending}
              className="h-10"
            >
              <option value="garantia">Garantia</option>
              <option value="retrabalho">Retrabalho</option>
              <option value="novo_problema">Novo problema</option>
              <option value="cortesia">Cortesia</option>
              <option value="cobranca_adicional">Cobrança adicional</option>
            </NativeSelect>
            <NativeSelect
              name="tipo_cobertura"
              disabled={pending}
              className="h-10"
            >
              <option value="garantia">Cobertura garantia</option>
              <option value="pago">Pago</option>
            </NativeSelect>
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
          <div className="mt-4 space-y-2 border-t pt-4">
            <p className="text-sm font-medium">+ Programar retorno</p>
            <p className="text-xs text-muted-foreground">
              Data, km ou o que ocorrer primeiro.
            </p>
            <div className="flex flex-wrap gap-2">
              {AUTOMOTIVE_RETURN_PRESETS.map((preset) => (
                <button
                  key={preset.key}
                  type="button"
                  disabled={pending}
                  className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                  onClick={() =>
                    run(
                      () =>
                        createManualReturnAction(tenantSlug, {
                          clienteId: os.cliente_id,
                          presetDays: preset.presetDays,
                          intervalMonths: preset.intervalMonths,
                          mileageKm: preset.mileageKm,
                          lastKm: os.quilometragem_saida ?? os.quilometragem_entrada,
                          veiculoId: os.veiculo_id,
                          placa: os.placa,
                          veiculoLabel: [os.marca, os.modelo].filter(Boolean).join(" "),
                          motivo: "Retorno automotivo",
                        }),
                      `Retorno programado (${preset.label}).`,
                    )
                  }
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
        </ExecutiveSection>
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
