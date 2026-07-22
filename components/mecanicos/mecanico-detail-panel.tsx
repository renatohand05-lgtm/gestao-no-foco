"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  atualizarClassificacaoCustoAction,
  criarCustoVigenciaAction,
  gerarObrigacaoMecanicoAction,
  updateMecanicoAction,
} from "@/lib/mecanicos/actions";
import { assertClassificacaoCustoIds } from "@/lib/mecanicos/classificacao";
import {
  MECANICO_DISPONIBILIDADE,
  MECANICO_DISPONIBILIDADE_LABELS,
  MECANICO_ESPECIALIDADE_LABELS,
  MECANICO_ESPECIALIDADES,
  MECANICO_VINCULO_LABELS,
  MECANICO_VINCULOS,
  calcCustoHora,
  calcCustoMensal,
  type MecanicoDisponibilidade,
  type MecanicoEspecialidade,
  type MecanicoVinculo,
} from "@/lib/mecanicos/constants";
import { vigenciaSobrepoeCompetencia } from "@/lib/mecanicos/vigencia";
import type { MecanicoCompetencia } from "@/lib/mecanicos/competencia-service";
import type { MecanicoCusto } from "@/lib/mecanicos/custo-service";
import type { Mecanico, MecanicoAuditoria } from "@/lib/mecanicos/mecanico-service";
import { FeedbackMessage } from "@/components/ui/feedback-message";
import { SectionCard } from "@/components/ui/section-card";
import { buttonVariants } from "@/components/ui/button";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

type Centro = { id: string; nome: string };
type Cat = { id: string; nome: string };
type Plano = { id: string; nome: string; codigo?: string | null };

type Props = {
  tenantSlug: string;
  mecanico: Mecanico;
  custos: MecanicoCusto[];
  competencias: MecanicoCompetencia[];
  auditoria: MecanicoAuditoria[];
  canEdit: boolean;
  canVerCusto: boolean;
  canEditarCusto: boolean;
  canGerarFolha: boolean;
  centros: Centro[];
  categorias: Cat[];
  planos: Plano[];
};

function preferId(
  current: string | null | undefined,
  fallback: string | null | undefined,
): string {
  return current || fallback || "";
}

export function MecanicoDetailPanel({
  tenantSlug,
  mecanico,
  custos,
  competencias,
  auditoria,
  canEdit,
  canVerCusto,
  canEditarCusto,
  canGerarFolha,
  centros,
  categorias,
  planos,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const vigenteAberto = custos.find((c) => c.vigencia_fim == null) ?? custos[0];

  const [nome, setNome] = useState(mecanico.nome_completo);
  const [cpf, setCpf] = useState(mecanico.cpf ?? "");
  const [telefone, setTelefone] = useState(mecanico.telefone ?? "");
  const [email, setEmail] = useState(mecanico.email ?? "");
  const [especialidade, setEspecialidade] = useState(mecanico.especialidade);
  const [vinculo, setVinculo] = useState(mecanico.tipo_vinculo);
  const [disponibilidade, setDisponibilidade] = useState(
    mecanico.disponibilidade,
  );
  const [centroCustoId, setCentroCustoId] = useState(
    mecanico.centro_custo_id ?? "",
  );

  const [salarioBase, setSalarioBase] = useState("0");
  const [encargos, setEncargos] = useState("0");
  const [beneficios, setBeneficios] = useState("0");
  const [bonus, setBonus] = useState("0");
  const [descontos, setDescontos] = useState("0");
  const [horasBase, setHorasBase] = useState(
    String(mecanico.horas_mensais_contratadas || 176),
  );
  const [vigenciaInicio, setVigenciaInicio] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [catId, setCatId] = useState(
    preferId(vigenteAberto?.categoria_financeira_id, null),
  );
  const [planoId, setPlanoId] = useState(
    preferId(vigenteAberto?.plano_conta_id, null),
  );
  const [ccCustoId, setCcCustoId] = useState(
    preferId(
      vigenteAberto?.centro_custo_id,
      mecanico.centro_custo_id,
    ),
  );
  const [editCustoId, setEditCustoId] = useState<string | null>(
    vigenteAberto &&
      (!vigenteAberto.categoria_financeira_id ||
        !vigenteAberto.plano_conta_id ||
        !vigenteAberto.centro_custo_id)
      ? vigenteAberto.id
      : null,
  );
  const [competencia, setCompetencia] = useState(
    new Date().toISOString().slice(0, 7),
  );

  const previewMensal = calcCustoMensal({
    salario_base: Number(salarioBase) || 0,
    encargos: Number(encargos) || 0,
    beneficios: Number(beneficios) || 0,
    bonus: Number(bonus) || 0,
    descontos: Number(descontos) || 0,
  });
  const previewHora = calcCustoHora(previewMensal, Number(horasBase) || 176);

  function saveCadastro() {
    setError(null);
    setOk(null);
    startTransition(async () => {
      const result = await updateMecanicoAction(tenantSlug, mecanico.id, {
        nome_completo: nome,
        cpf: cpf || null,
        telefone: telefone || null,
        email: email || null,
        especialidade: especialidade as MecanicoEspecialidade,
        tipo_vinculo: vinculo as MecanicoVinculo,
        disponibilidade: disponibilidade as MecanicoDisponibilidade,
        centro_custo_id: centroCustoId || null,
      });
      if (!result.success) {
        setError(result.error ?? "Falha.");
        return;
      }
      setOk("Cadastro atualizado.");
      router.refresh();
    });
  }

  function saveCusto() {
    setError(null);
    setOk(null);
    try {
      assertClassificacaoCustoIds({
        categoria_financeira_id: catId,
        plano_conta_id: planoId,
        centro_custo_id: ccCustoId,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Classificação incompleta.");
      return;
    }
    startTransition(async () => {
      const result = await criarCustoVigenciaAction(tenantSlug, mecanico.id, {
        vigencia_inicio: vigenciaInicio,
        salario_base: Number(salarioBase) || 0,
        encargos: Number(encargos) || 0,
        beneficios: Number(beneficios) || 0,
        bonus: Number(bonus) || 0,
        descontos: Number(descontos) || 0,
        horas_base_calculo: Number(horasBase) || 176,
        categoria_financeira_id: catId,
        plano_conta_id: planoId,
        centro_custo_id: ccCustoId,
      });
      if (!result.success) {
        setError(result.error ?? "Falha.");
        return;
      }
      setOk("Nova vigência de custo criada (histórico preservado).");
      router.refresh();
    });
  }

  function saveClassificacao(custoId: string) {
    setError(null);
    setOk(null);
    try {
      assertClassificacaoCustoIds({
        categoria_financeira_id: catId,
        plano_conta_id: planoId,
        centro_custo_id: ccCustoId,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Classificação incompleta.");
      return;
    }
    startTransition(async () => {
      const result = await atualizarClassificacaoCustoAction(
        tenantSlug,
        mecanico.id,
        custoId,
        {
          categoria_financeira_id: catId,
          plano_conta_id: planoId,
          centro_custo_id: ccCustoId,
        },
        "correcao_classificacao_ui",
      );
      if (!result.success) {
        setError(result.error ?? "Falha.");
        return;
      }
      setEditCustoId(null);
      setOk("Classificação financeira atualizada na vigência.");
      router.refresh();
    });
  }

  function gerarFolha() {
    setError(null);
    setOk(null);
    startTransition(async () => {
      const result = await gerarObrigacaoMecanicoAction(
        tenantSlug,
        mecanico.id,
        competencia,
      );
      if (!result.success) {
        setError(result.error ?? "Falha.");
        return;
      }
      setOk("Obrigação gerada em contas a pagar (competência).");
      router.refresh();
    });
  }

  function planoLabel(p: Plano) {
    return p.codigo ? `${p.codigo} — ${p.nome}` : p.nome;
  }

  function classifLabel(c: MecanicoCusto) {
    const okCat = Boolean(c.categoria_financeira_id);
    const okPlano = Boolean(c.plano_conta_id);
    const okCc = Boolean(c.centro_custo_id);
    if (okCat && okPlano && okCc) return "Completa";
    const miss: string[] = [];
    if (!okCat) miss.push("categoria");
    if (!okPlano) miss.push("plano");
    if (!okCc) miss.push("centro");
    return `Incompleta (${miss.join(", ")})`;
  }

  return (
    <div className="space-y-6">
      {error ? <FeedbackMessage variant="error">{error}</FeedbackMessage> : null}
      {ok ? <FeedbackMessage variant="success">{ok}</FeedbackMessage> : null}

      <SectionCard title="Dados cadastrais">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1 text-sm">
            <span>Nome</span>
            <input
              className="h-9 w-full rounded-md border px-2"
              value={nome}
              disabled={!canEdit}
              onChange={(e) => setNome(e.target.value)}
            />
          </label>
          <label className="space-y-1 text-sm">
            <span>CPF</span>
            <input
              className="h-9 w-full rounded-md border px-2"
              value={cpf}
              disabled={!canEdit}
              onChange={(e) => setCpf(e.target.value)}
            />
          </label>
          <label className="space-y-1 text-sm">
            <span>Telefone</span>
            <input
              className="h-9 w-full rounded-md border px-2"
              value={telefone}
              disabled={!canEdit}
              onChange={(e) => setTelefone(e.target.value)}
            />
          </label>
          <label className="space-y-1 text-sm">
            <span>E-mail</span>
            <input
              className="h-9 w-full rounded-md border px-2"
              value={email}
              disabled={!canEdit}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label className="space-y-1 text-sm">
            <span>Especialidade</span>
            <select
              className="h-9 w-full rounded-md border px-2"
              value={especialidade}
              disabled={!canEdit}
              onChange={(e) =>
                setEspecialidade(e.target.value as MecanicoEspecialidade)
              }
            >
              {MECANICO_ESPECIALIDADES.map((e) => (
                <option key={e} value={e}>
                  {MECANICO_ESPECIALIDADE_LABELS[e]}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-sm">
            <span>Vínculo</span>
            <select
              className="h-9 w-full rounded-md border px-2"
              value={vinculo}
              disabled={!canEdit}
              onChange={(e) => setVinculo(e.target.value as MecanicoVinculo)}
            >
              {MECANICO_VINCULOS.map((v) => (
                <option key={v} value={v}>
                  {MECANICO_VINCULO_LABELS[v]}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-sm">
            <span>Disponibilidade</span>
            <select
              className="h-9 w-full rounded-md border px-2"
              value={disponibilidade}
              disabled={!canEdit}
              onChange={(e) =>
                setDisponibilidade(e.target.value as MecanicoDisponibilidade)
              }
            >
              {MECANICO_DISPONIBILIDADE.map((d) => (
                <option key={d} value={d}>
                  {MECANICO_DISPONIBILIDADE_LABELS[d]}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-sm">
            <span>Centro de custo</span>
            <select
              className="h-9 w-full rounded-md border px-2"
              value={centroCustoId}
              disabled={!canEdit}
              onChange={(e) => setCentroCustoId(e.target.value)}
            >
              <option value="">—</option>
              {centros.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>
          </label>
        </div>
        {canEdit ? (
          <button
            type="button"
            disabled={pending}
            className={cn(buttonVariants({ size: "sm" }), "mt-3")}
            onClick={saveCadastro}
          >
            Salvar cadastro
          </button>
        ) : null}
      </SectionCard>

      {canVerCusto ? (
        <SectionCard title="Custo e vigências">
          <p className="mb-3 text-xs text-muted-foreground">
            Histórico por vigência — alteração salarial não sobrescreve o
            passado. Obrigação mensal usa sobreposição com o mês da competência
            (valor integral; proporcionalidade futura). Fluxo: competência →
            contas a pagar → DRE.
          </p>

          <label className="mb-3 flex w-fit flex-col gap-1 text-sm">
            <span>Competência de referência</span>
            <input
              type="month"
              className="h-9 rounded-md border px-2"
              value={competencia}
              onChange={(e) => setCompetencia(e.target.value)}
            />
          </label>

          {custos.length > 0 ? (
            <div className="mb-4 overflow-x-auto rounded border">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-xs text-muted-foreground">
                  <tr>
                    <th className="px-2 py-1.5 text-left">Vigência</th>
                    <th className="px-2 py-1.5 text-right">Mensal</th>
                    <th className="px-2 py-1.5 text-right">R$/h</th>
                    <th className="px-2 py-1.5 text-left">Competência sel.</th>
                    <th className="px-2 py-1.5 text-left">Classificação</th>
                    <th className="px-2 py-1.5 text-left">Geração</th>
                    <th className="px-2 py-1.5 text-left" />
                  </tr>
                </thead>
                <tbody>
                  {custos.map((c) => {
                    const cobre = vigenciaSobrepoeCompetencia(c, competencia);
                    const incompleta =
                      !c.categoria_financeira_id ||
                      !c.plano_conta_id ||
                      !c.centro_custo_id;
                    return (
                      <tr key={c.id} className="border-t">
                        <td className="px-2 py-1.5">
                          {c.vigencia_inicio}
                          {c.vigencia_fim ? ` → ${c.vigencia_fim}` : " → atual"}
                        </td>
                        <td className="px-2 py-1.5 text-right">
                          {formatCurrency(c.custo_mensal_total)}
                        </td>
                        <td className="px-2 py-1.5 text-right">
                          {formatCurrency(c.custo_hora)}
                        </td>
                        <td className="px-2 py-1.5">
                          {cobre ? (
                            <span className="text-emerald-700 dark:text-emerald-400">
                              Cobre {competencia}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">
                              Fora de {competencia}
                            </span>
                          )}
                        </td>
                        <td
                          className={cn(
                            "px-2 py-1.5",
                            incompleta && "text-amber-700 dark:text-amber-400",
                          )}
                        >
                          {classifLabel(c)}
                        </td>
                        <td className="px-2 py-1.5">
                          {c.geracao_pausada
                            ? "Pausada"
                            : c.gerar_automatico
                              ? "Auto"
                              : "Manual"}
                        </td>
                        <td className="px-2 py-1.5">
                          {canEditarCusto ? (
                            <button
                              type="button"
                              className={cn(
                                buttonVariants({ variant: "ghost", size: "sm" }),
                              )}
                              onClick={() => {
                                setEditCustoId(c.id);
                                setCatId(c.categoria_financeira_id ?? "");
                                setPlanoId(c.plano_conta_id ?? "");
                                setCcCustoId(
                                  c.centro_custo_id ??
                                    mecanico.centro_custo_id ??
                                    "",
                                );
                              }}
                            >
                              {incompleta ? "Completar" : "Editar classif."}
                            </button>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="mb-3 text-sm text-muted-foreground">
              Sem vigência de custo.
            </p>
          )}

          {canEditarCusto ? (
            <div className="grid gap-3 sm:grid-cols-3 rounded-lg border p-3">
              <label className="space-y-1 text-sm">
                <span>Vigência início</span>
                <input
                  type="date"
                  className="h-9 w-full rounded-md border px-2"
                  value={vigenciaInicio}
                  onChange={(e) => setVigenciaInicio(e.target.value)}
                />
              </label>
              <label className="space-y-1 text-sm">
                <span>Salário base</span>
                <input
                  type="number"
                  step="0.01"
                  className="h-9 w-full rounded-md border px-2"
                  value={salarioBase}
                  onChange={(e) => setSalarioBase(e.target.value)}
                />
              </label>
              <label className="space-y-1 text-sm">
                <span>Encargos</span>
                <input
                  type="number"
                  step="0.01"
                  className="h-9 w-full rounded-md border px-2"
                  value={encargos}
                  onChange={(e) => setEncargos(e.target.value)}
                />
              </label>
              <label className="space-y-1 text-sm">
                <span>Benefícios</span>
                <input
                  type="number"
                  step="0.01"
                  className="h-9 w-full rounded-md border px-2"
                  value={beneficios}
                  onChange={(e) => setBeneficios(e.target.value)}
                />
              </label>
              <label className="space-y-1 text-sm">
                <span>Bônus</span>
                <input
                  type="number"
                  step="0.01"
                  className="h-9 w-full rounded-md border px-2"
                  value={bonus}
                  onChange={(e) => setBonus(e.target.value)}
                />
              </label>
              <label className="space-y-1 text-sm">
                <span>Descontos</span>
                <input
                  type="number"
                  step="0.01"
                  className="h-9 w-full rounded-md border px-2"
                  value={descontos}
                  onChange={(e) => setDescontos(e.target.value)}
                />
              </label>
              <label className="space-y-1 text-sm">
                <span>Horas base / mês</span>
                <input
                  type="number"
                  className="h-9 w-full rounded-md border px-2"
                  value={horasBase}
                  onChange={(e) => setHorasBase(e.target.value)}
                />
              </label>
              <label className="space-y-1 text-sm">
                <span>Categoria financeira *</span>
                <select
                  required
                  className="h-9 w-full rounded-md border px-2"
                  value={catId}
                  onChange={(e) => setCatId(e.target.value)}
                >
                  <option value="">Selecione…</option>
                  {categorias.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1 text-sm">
                <span>Conta contábil *</span>
                <select
                  required
                  className="h-9 w-full rounded-md border px-2"
                  value={planoId}
                  onChange={(e) => setPlanoId(e.target.value)}
                >
                  <option value="">Selecione…</option>
                  {planos.map((p) => (
                    <option key={p.id} value={p.id}>
                      {planoLabel(p)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1 text-sm">
                <span>Centro de custo *</span>
                <select
                  required
                  className="h-9 w-full rounded-md border px-2"
                  value={ccCustoId}
                  onChange={(e) => setCcCustoId(e.target.value)}
                >
                  <option value="">Selecione…</option>
                  {centros.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome}
                    </option>
                  ))}
                </select>
              </label>
              <div className="sm:col-span-3 flex flex-wrap items-center gap-3 text-sm">
                <span>
                  Previsto: <strong>{formatCurrency(previewMensal)}</strong> /{" "}
                  <strong>{formatCurrency(previewHora)}/h</strong>
                </span>
                <button
                  type="button"
                  disabled={pending}
                  className={cn(buttonVariants({ size: "sm" }))}
                  onClick={saveCusto}
                >
                  Criar vigência
                </button>
                {editCustoId ? (
                  <button
                    type="button"
                    disabled={pending}
                    className={cn(buttonVariants({ size: "sm", variant: "outline" }))}
                    onClick={() => saveClassificacao(editCustoId)}
                  >
                    Salvar classificação na vigência selecionada
                  </button>
                ) : null}
              </div>
              <p className="sm:col-span-3 text-xs text-muted-foreground">
                Os campos marcados com * gravam o UUID da opção selecionada
                (não o nome). Obrigatórios para gerar obrigação → CAP → DRE.
              </p>
            </div>
          ) : null}
        </SectionCard>
      ) : (
        <SectionCard title="Custo">
          <p className="text-sm text-muted-foreground">
            Sem permissão para ver dados salariais.
          </p>
        </SectionCard>
      )}

      {canGerarFolha ? (
        <SectionCard title="Obrigação mensal (contas a pagar)">
          <div className="flex flex-wrap items-end gap-2">
            <label className="space-y-1 text-sm">
              <span>Competência</span>
              <input
                type="month"
                className="h-9 rounded-md border px-2"
                value={competencia}
                onChange={(e) => setCompetencia(e.target.value)}
              />
            </label>
            <button
              type="button"
              disabled={pending}
              className={cn(buttonVariants({ size: "sm" }))}
              onClick={gerarFolha}
            >
              Gerar obrigação
            </button>
          </div>
          {competencias.length > 0 ? (
            <ul className="mt-3 space-y-1 text-sm">
              {competencias.slice(0, 12).map((c) => (
                <li key={c.id} className="flex justify-between gap-2 border-b py-1">
                  <span>
                    {c.competencia.slice(0, 7)} · {c.tipo_obrigacao} ·{" "}
                    {c.status}
                  </span>
                  <span>{formatCurrency(c.valor)}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </SectionCard>
      ) : null}

      <SectionCard title="Histórico / auditoria">
        {auditoria.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sem eventos.</p>
        ) : (
          <ul className="space-y-1 text-xs">
            {auditoria.slice(0, 30).map((a) => (
              <li key={a.id} className="border-b py-1.5">
                <span className="text-muted-foreground">
                  {new Date(a.created_at).toLocaleString("pt-BR")}
                </span>{" "}
                · <strong>{a.acao}</strong>
                {a.motivo ? ` — ${a.motivo}` : null}
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}
