"use server";

import { actionOk, actionOkWith, type ActionResult, type ActionResultWith } from "@/types/action-result";

import { atualizar, executar, lojaVisivel } from "./acao-base";
import { lerEntrada, uuid } from "./acao-comum";
import { exigirEdicao, type RedeContexto } from "./acesso";
import { normalizar } from "./csv";
import { hojeDoTenant } from "./loader";
import { erroRh, lerImportacaoColaboradores } from "./rh";
import {
  colaboradorSchema,
  desligamentoSchema,
  importacaoRhSchema,
  mesRhSchema,
  ocorrenciaSchema,
  previstoSchema,
  type ColaboradorEntrada,
  type DesligamentoEntrada,
  type ImportacaoRhEntrada,
  type MesRhEntrada,
  type OcorrenciaEntrada,
  type PrevistoEntrada,
} from "./schemas-rh";

/** Roda a ação traduzindo as restrições do banco de RH para frases claras. */
function rodar<T extends ActionResult | ActionResultWith<Record<string, unknown>>>(padrao: string, fn: () => Promise<T>) {
  return executar(padrao, async () => {
    try {
      return await fn();
    } catch (e) {
      const msg = erroRh(e);
      if (msg) throw new Error(msg);
      throw e;
    }
  });
}

const doMes = (mes: string) => `${mes}-01`;

type LinhaColab = { id: string; loja_id: string; nome: string; status: string; data_admissao: string; data_desligamento: string | null };

async function lerColaborador(ctx: RedeContexto, id: string): Promise<LinhaColab> {
  const { data, error } = await ctx.db
    .from("rede_rh_colaboradores")
    .select("id,loja_id,nome,status,data_admissao,data_desligamento")
    .eq("id", id)
    .eq("tenant_id", ctx.tenant.id)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Colaborador não encontrado ou sem permissão.");
  return data as LinhaColab;
}

/** Nomes (ativos) da loja, para recusar duas pessoas com o mesmo nome (sem diferenciar maiúsculas e acentos). */
async function nomesAtivos(ctx: RedeContexto, lojaId: string, ignorar?: string): Promise<string[]> {
  const { data, error } = await ctx.db.from("rede_rh_colaboradores").select("id,nome").eq("loja_id", lojaId).eq("tenant_id", ctx.tenant.id).eq("status", "ativo").limit(2000);
  if (error) throw error;
  return ((data ?? []) as { id: string; nome: string }[]).filter((c) => c.id !== ignorar).map((c) => c.nome);
}

const MSG_NOME_REPETIDO = "Já existe um colaborador ativo com esse nome nesta loja. Se for outra pessoa, acrescente o sobrenome ou uma inicial.";
const nomeJaAtivo = (nomes: string[], nome: string) => nomes.some((n) => normalizar(n) === normalizar(nome));

/* ------------------------------------------------------------------ cadastro de colaboradores */

/** Sem `id`: cadastra (ativo). Com `id`: corrige nome, cargo, admissão, observações e a loja (só se a pessoa não tem ocorrências). */
export async function salvarColaboradorAction(slug: string, entrada: ColaboradorEntrada, id?: string | null): Promise<ActionResult> {
  return rodar("Não foi possível salvar o colaborador.", async () => {
    const ctx = await exigirEdicao(slug, "rh_quadro");
    const c = lerEntrada(colaboradorSchema, entrada);
    const rid = id ? lerEntrada(uuid, id) : null;
    if (c.dataAdmissao > hojeDoTenant()) throw new Error("A data de admissão não pode ser futura.");
    const loja = await lojaVisivel(ctx, c.lojaId);
    const valores = { tenant_id: ctx.tenant.id, loja_id: c.lojaId, nome: c.nome, cargo: c.cargo, data_admissao: c.dataAdmissao, observacoes: c.observacoes };

    if (rid) {
      const atual = await lerColaborador(ctx, rid);
      if (atual.status === "desligado" && atual.data_desligamento && c.dataAdmissao > atual.data_desligamento.slice(0, 10)) {
        throw new Error("A admissão não pode ser depois da data de desligamento.");
      }
      if (atual.status === "ativo" && nomeJaAtivo(await nomesAtivos(ctx, c.lojaId, rid), c.nome)) throw new Error(MSG_NOME_REPETIDO);
      const { data, error } = await ctx.db.from("rede_rh_colaboradores").update(valores).eq("id", rid).eq("tenant_id", ctx.tenant.id).select("id");
      if (error) throw error;
      if (!data || data.length === 0) throw new Error("Colaborador não encontrado ou sem permissão.");
      atualizar(slug);
      return actionOk(rid);
    }

    if (loja.status === "inativa") throw new Error("A loja está inativa.");
    if (nomeJaAtivo(await nomesAtivos(ctx, c.lojaId), c.nome)) throw new Error(MSG_NOME_REPETIDO);
    const { data, error } = await ctx.db.from("rede_rh_colaboradores").insert({ ...valores, status: "ativo", origem: "manual" }).select("id").single();
    if (error) throw error;
    atualizar(slug);
    return actionOk((data as { id: string }).id);
  });
}

/** Desliga a pessoa: sai do quadro ativo, mas o histórico (e as ocorrências) ficam. */
export async function desligarColaboradorAction(slug: string, id: string, entrada: DesligamentoEntrada): Promise<ActionResult> {
  return rodar("Não foi possível desligar o colaborador.", async () => {
    const ctx = await exigirEdicao(slug, "rh_quadro");
    const rid = lerEntrada(uuid, id);
    const d = lerEntrada(desligamentoSchema, entrada);
    if (d.data > hojeDoTenant()) throw new Error("A data de desligamento não pode ser futura.");
    const atual = await lerColaborador(ctx, rid);
    if (atual.status === "desligado") throw new Error("Este colaborador já está desligado.");
    if (d.data < atual.data_admissao.slice(0, 10)) throw new Error("A data de desligamento não pode ser anterior à admissão.");
    const { data, error } = await ctx.db
      .from("rede_rh_colaboradores")
      .update({ status: "desligado", data_desligamento: d.data, motivo_desligamento: d.motivo })
      .eq("id", rid)
      .eq("tenant_id", ctx.tenant.id)
      .select("id");
    if (error) throw error;
    if (!data || data.length === 0) throw new Error("Colaborador não encontrado ou sem permissão.");
    atualizar(slug);
    return actionOk(rid);
  });
}

/** Volta a pessoa para o quadro ativo (desligamento lançado por engano, recontratação). */
export async function reativarColaboradorAction(slug: string, id: string): Promise<ActionResult> {
  return rodar("Não foi possível reativar o colaborador.", async () => {
    const ctx = await exigirEdicao(slug, "rh_quadro");
    const rid = lerEntrada(uuid, id);
    const atual = await lerColaborador(ctx, rid);
    if (atual.status === "ativo") throw new Error("Este colaborador já está ativo.");
    const loja = await lojaVisivel(ctx, atual.loja_id);
    if (loja.status === "inativa") throw new Error("A loja está inativa.");
    if (nomeJaAtivo(await nomesAtivos(ctx, atual.loja_id, rid), atual.nome)) throw new Error(MSG_NOME_REPETIDO);
    const { data, error } = await ctx.db
      .from("rede_rh_colaboradores")
      .update({ status: "ativo", data_desligamento: null, motivo_desligamento: null })
      .eq("id", rid)
      .eq("tenant_id", ctx.tenant.id)
      .select("id");
    if (error) throw error;
    if (!data || data.length === 0) throw new Error("Colaborador não encontrado ou sem permissão.");
    atualizar(slug);
    return actionOk(rid);
  });
}

/** Exclui um cadastro feito por engano. Quem tem ocorrências não pode ser excluído (o banco recusa): use "Desligar". */
export async function excluirColaboradorAction(slug: string, id: string): Promise<ActionResult> {
  return rodar("Não foi possível excluir o colaborador.", async () => {
    const ctx = await exigirEdicao(slug, "rh_quadro");
    const rid = lerEntrada(uuid, id);
    const { data, error } = await ctx.db.from("rede_rh_colaboradores").delete().eq("id", rid).eq("tenant_id", ctx.tenant.id).select("id");
    if (error) throw error;
    if (!data || data.length === 0) throw new Error("Colaborador não encontrado ou sem permissão.");
    atualizar(slug);
    return actionOk();
  });
}

/** Cola uma lista (Nome ; Cargo ; Admissão) e cadastra todo mundo de uma vez — se alguma linha tiver erro, nada é gravado. */
export async function importarColaboradoresAction(slug: string, entrada: ImportacaoRhEntrada): Promise<ActionResultWith<{ importados: number }>> {
  return rodar("Não foi possível importar a lista.", async () => {
    const ctx = await exigirEdicao(slug, "rh_quadro");
    const i = lerEntrada(importacaoRhSchema, entrada);
    const loja = await lojaVisivel(ctx, i.lojaId);
    if (loja.status === "inativa") throw new Error("A loja está inativa.");
    const r = lerImportacaoColaboradores(i.texto, hojeDoTenant(), await nomesAtivos(ctx, i.lojaId));
    if (r.erros.length > 0) {
      const mostrados = r.erros.slice(0, 5).map((e) => `linha ${e.linha}: ${e.mensagem}`);
      const resto = r.erros.length > 5 ? ` (e mais ${r.erros.length - 5})` : "";
      throw new Error(`Nada foi importado. Corrija e cole de novo — ${mostrados.join(" · ")}${resto}`);
    }
    if (r.linhas.length === 0) throw new Error("Nenhuma pessoa na lista. Use: Nome ; Cargo ; Admissão.");
    const { error } = await ctx.db.from("rede_rh_colaboradores").insert(
      r.linhas.map((l) => ({ tenant_id: ctx.tenant.id, loja_id: i.lojaId, nome: l.nome, cargo: l.cargo, data_admissao: l.dataAdmissao, status: "ativo", origem: "manual" })),
    );
    if (error) throw error;
    atualizar(slug);
    return actionOkWith({ importados: r.linhas.length });
  });
}

/* ------------------------------------------------------------------ quadro previsto */

/** Quantas pessoas a loja deve ter em cada cargo. Um único envio grava os cinco cargos. */
export async function salvarPrevistoAction(slug: string, entrada: PrevistoEntrada): Promise<ActionResult> {
  return rodar("Não foi possível salvar o quadro previsto.", async () => {
    const ctx = await exigirEdicao(slug, "rh_quadro");
    const p = lerEntrada(previstoSchema, entrada);
    await lojaVisivel(ctx, p.lojaId);
    const linhas = (Object.keys(p.previstos) as (keyof typeof p.previstos)[]).map((cargo) => ({ tenant_id: ctx.tenant.id, loja_id: p.lojaId, cargo, previsto: p.previstos[cargo] }));
    const { error } = await ctx.db.from("rede_rh_quadro_previsto").upsert(linhas, { onConflict: "loja_id,cargo" });
    if (error) throw error;
    atualizar(slug);
    return actionOk();
  });
}

/* ------------------------------------------------------------------ lançamento mensal (turnover e absenteísmo) */

/**
 * Grava o mês de uma loja. Se o mês já existia, ele é substituído (como no painel original) e a resposta avisa.
 * Só as contagens são gravadas: turnover e absenteísmo são calculados quando aparecem.
 */
export async function salvarMesAction(slug: string, entrada: MesRhEntrada): Promise<ActionResultWith<{ substituido: boolean }>> {
  return rodar("Não foi possível salvar o mês.", async () => {
    const ctx = await exigirEdicao(slug, "rh_movimentos");
    const m = lerEntrada(mesRhSchema, entrada);
    if (m.mes > hojeDoTenant().slice(0, 7)) throw new Error("Não é possível lançar um mês futuro.");
    if (m.mes < "2020-01") throw new Error("Mês anterior a 2020 não é aceito.");
    const loja = await lojaVisivel(ctx, m.lojaId);
    const { data: existente, error: erroLeitura } = await ctx.db.from("rede_rh_mensal").select("id").eq("loja_id", m.lojaId).eq("mes", doMes(m.mes)).eq("tenant_id", ctx.tenant.id).limit(1);
    if (erroLeitura) throw erroLeitura;
    const substituido = Array.isArray(existente) && existente.length > 0;
    if (!substituido && loja.status === "inativa") throw new Error("A loja está inativa.");
    const { error } = await ctx.db.from("rede_rh_mensal").upsert(
      {
        tenant_id: ctx.tenant.id,
        loja_id: m.lojaId,
        mes: doMes(m.mes),
        headcount_medio: m.headcount,
        admissoes: m.admissoes,
        desligamentos: m.desligamentos,
        dias_falta: m.faltas,
        dias_previstos: m.diasPrevistos,
        origem: "manual",
      },
      { onConflict: "loja_id,mes" },
    );
    if (error) throw error;
    atualizar(slug);
    return actionOkWith({ substituido });
  });
}

export async function excluirMesAction(slug: string, id: string): Promise<ActionResult> {
  return rodar("Não foi possível excluir o lançamento.", async () => {
    const ctx = await exigirEdicao(slug, "rh_movimentos");
    const rid = lerEntrada(uuid, id);
    const { data, error } = await ctx.db.from("rede_rh_mensal").delete().eq("id", rid).eq("tenant_id", ctx.tenant.id).select("id");
    if (error) throw error;
    if (!data || data.length === 0) throw new Error("Lançamento não encontrado ou sem permissão.");
    atualizar(slug);
    return actionOk();
  });
}

/* ------------------------------------------------------------------ ocorrências e advertências */

const lerOcorrencia = (entrada: OcorrenciaEntrada) => lerEntrada(ocorrenciaSchema, entrada);
type Ocorrencia = ReturnType<typeof lerOcorrencia>;

async function conferirOcorrencia(ctx: RedeContexto, o: Ocorrencia) {
  if (o.data > hojeDoTenant()) throw new Error("A data da ocorrência não pode ser futura.");
  await lojaVisivel(ctx, o.lojaId);
  const colab = await lerColaborador(ctx, o.colaboradorId);
  if (colab.loja_id !== o.lojaId) throw new Error("Este colaborador não é desta loja.");
  const adm = colab.data_admissao.slice(0, 10);
  if (o.data < adm) throw new Error(`A ocorrência não pode ser anterior à admissão do colaborador (${adm.slice(8, 10)}/${adm.slice(5, 7)}/${adm.slice(0, 4)}).`);
}

const linhaOcorrencia = (o: Ocorrencia, tenantId: string) => ({
  tenant_id: tenantId,
  loja_id: o.lojaId,
  colaborador_id: o.colaboradorId,
  tipo: o.tipo,
  data: o.data,
  status: o.status,
  motivo: o.motivo,
  responsavel: o.responsavel,
  observacoes: o.observacoes,
});

export async function registrarOcorrenciaAction(slug: string, entrada: OcorrenciaEntrada): Promise<ActionResult> {
  return rodar("Não foi possível registrar a ocorrência.", async () => {
    const ctx = await exigirEdicao(slug, "rh_ocorrencias");
    const o = lerOcorrencia(entrada);
    await conferirOcorrencia(ctx, o);
    const { data, error } = await ctx.db.from("rede_rh_ocorrencias").insert({ ...linhaOcorrencia(o, ctx.tenant.id), origem: "manual" }).select("id").single();
    if (error) throw error;
    atualizar(slug);
    return actionOk((data as { id: string }).id);
  });
}

export async function atualizarOcorrenciaAction(slug: string, id: string, entrada: OcorrenciaEntrada): Promise<ActionResult> {
  return rodar("Não foi possível salvar a ocorrência.", async () => {
    const ctx = await exigirEdicao(slug, "rh_ocorrencias");
    const rid = lerEntrada(uuid, id);
    const o = lerOcorrencia(entrada);
    await conferirOcorrencia(ctx, o);
    const { data, error } = await ctx.db.from("rede_rh_ocorrencias").update(linhaOcorrencia(o, ctx.tenant.id)).eq("id", rid).eq("tenant_id", ctx.tenant.id).select("id");
    if (error) throw error;
    if (!data || data.length === 0) throw new Error("Ocorrência não encontrada ou sem permissão.");
    atualizar(slug);
    return actionOk(rid);
  });
}

export async function excluirOcorrenciaAction(slug: string, id: string): Promise<ActionResult> {
  return rodar("Não foi possível excluir a ocorrência.", async () => {
    const ctx = await exigirEdicao(slug, "rh_ocorrencias");
    const rid = lerEntrada(uuid, id);
    const { data, error } = await ctx.db.from("rede_rh_ocorrencias").delete().eq("id", rid).eq("tenant_id", ctx.tenant.id).select("id");
    if (error) throw error;
    if (!data || data.length === 0) throw new Error("Ocorrência não encontrada ou sem permissão.");
    atualizar(slug);
    return actionOk();
  });
}
