"use server";

import { actionOk, type ActionResult } from "@/types/action-result";

import { atualizar, executar, lojaVisivel } from "./acao-base";
import { lerEntrada, uuid } from "./acao-comum";
import { exigirEdicao } from "./acesso";
import { hojeDoTenant } from "./loader";
import { COLUNAS_PLANO, mapPlano, mapRespostas } from "./mapeadores-qualidade";
import { podeEditar } from "./permissoes";
import { prazoValido, rotuloStatusPlano } from "./planos";
import { desviosDaVisita, limparRespostas, resumirVisita, respostasParaBanco, rotuloOrigemQualidade } from "./qualidade";
import { visitaSchema, type VisitaEntrada } from "./schemas-qualidade";

const MSG_VISITA_REPETIDA = "Já existe uma visita desta loja, neste dia, com este avaliador. Abra a visita no histórico para corrigi-la.";

/**
 * Grava a visita de qualidade e, na mesma transação do banco, um plano de ação por item "Não".
 * Sem `id`: visita nova. Com `id`: corrige a visita (a loja não muda); os planos acompanham — item que deixou de
 * ser "Não" tem o plano removido (se nunca saiu do papel) ou cancelado (se já tinha ação), e plano concluído não é mexido.
 */
export async function salvarVisitaAction(slug: string, entrada: VisitaEntrada, id?: string | null): Promise<ActionResult> {
  return executar("Não foi possível salvar a visita.", async () => {
    const ctx = await exigirEdicao(slug, "qualidade");
    const v = lerEntrada(visitaSchema, entrada);
    const rid = id ? lerEntrada(uuid, id) : null;
    const hoje = hojeDoTenant();
    if (v.data > hoje) throw new Error("A data da visita não pode ser futura.");

    const respostas = limparRespostas(v.respostas);
    if (resumirVisita(respostas).aplicaveis === 0) throw new Error("Avalie pelo menos um item antes de salvar.");
    const loja = await lojaVisivel(ctx, v.lojaId);

    // A visita que está sendo corrigida: confere a loja e vê se já tinha desvios (e, com eles, planos).
    let desviosAntes = 0;
    const planosAtuais = new Map<string, { acao: string | null; responsavel: string | null; prazo: string | null; prioridade: string; status: string }>();
    if (rid) {
      const { data: orig, error } = await ctx.db.from("rede_qualidade_visitas").select("id,loja_id,respostas").eq("id", rid).eq("tenant_id", ctx.tenant.id).maybeSingle();
      if (error) throw error;
      if (!orig) throw new Error("Visita não encontrada ou sem permissão.");
      if (String(orig.loja_id) !== v.lojaId) throw new Error("A loja de uma visita não pode ser alterada. Registre uma nova visita para a outra loja.");
      desviosAntes = desviosDaVisita(mapRespostas(orig.respostas)).length;
      const { data: planos, error: erroPlanos } = await ctx.db.from("rede_planos_acao").select(COLUNAS_PLANO).eq("origem_tipo", "qualidade").eq("origem_id", rid).limit(100);
      if (erroPlanos) throw erroPlanos;
      for (const l of (planos ?? []) as Record<string, unknown>[]) {
        const p = mapPlano(l);
        if (p.origemRef) planosAtuais.set(p.origemRef, { acao: p.acao, responsavel: p.responsavel, prazo: p.prazo, prioridade: p.prioridade, status: p.status });
      }
    } else if (loja.status === "inativa") {
      throw new Error("A loja está inativa.");
    }

    const desvios = desviosDaVisita(respostas);
    if ((desvios.length > 0 || desviosAntes > 0) && !podeEditar(ctx.perfil, "planos_acao")) {
      throw new Error('Esta visita tem (ou tinha) itens com "Não", que geram planos de ação, e o seu perfil não pode criar ou alterar planos. Peça ao administrador para liberar "Planos de ação".');
    }

    // Um plano por desvio. O que a pessoa não mexeu mantém o que o plano já tem (nunca volta ao padrão).
    const acoes: Record<string, unknown> = {};
    for (const d of desvios) {
      const atual = planosAtuais.get(d.chave);
      const enviado = v.acoes[d.chave];
      const acao = enviado ? enviado.acao : (atual?.acao ?? null);
      const responsavel = enviado ? enviado.responsavel : (atual?.responsavel ?? null);
      const prazo = enviado ? enviado.prazo : (atual?.prazo ?? null);
      const prioridade = enviado ? enviado.prioridade : (atual?.prioridade ?? "media");
      const status = enviado ? enviado.status : (atual?.status ?? "pendente");
      if ((status === "em_andamento" || status === "concluido") && !acao) {
        throw new Error(`Informe a ação do desvio "${d.titulo}" antes de marcá-lo como ${rotuloStatusPlano(status).toLowerCase()}.`);
      }
      if (prazo && prazo !== atual?.prazo && !prazoValido(prazo, hoje)) throw new Error(`O prazo do desvio "${d.titulo}" não pode estar no passado.`);
      acoes[d.chave] = { descricao: d.titulo, rotulo: rotuloOrigemQualidade(v.data, d.secao), acao, responsavel, prazo, prioridade, status };
    }

    const { data, error } = await ctx.db.rpc("rede_qualidade_salvar", {
      p_id: rid,
      p_loja: v.lojaId,
      p_data: v.data,
      p_avaliador: v.avaliador,
      p_gerente: v.gerente,
      p_respostas: respostasParaBanco(respostas),
      p_acoes: acoes,
    });
    if (error) {
      if ((error as { code?: string }).code === "23505") throw new Error(MSG_VISITA_REPETIDA);
      throw error;
    }
    atualizar(slug);
    return actionOk(typeof data === "string" ? data : undefined);
  });
}

/**
 * Exclui a visita. Os planos que ainda não saíram do papel (pendentes e sem ação) somem junto; os que já têm
 * trabalho feito ficam na lista de planos de ação, sem o vínculo. A exclusão fica no histórico de alterações.
 */
export async function excluirVisitaAction(slug: string, id: string): Promise<ActionResult> {
  return executar("Não foi possível excluir a visita.", async () => {
    const ctx = await exigirEdicao(slug, "qualidade");
    const rid = lerEntrada(uuid, id);
    const { data, error } = await ctx.db.from("rede_qualidade_visitas").delete().eq("id", rid).eq("tenant_id", ctx.tenant.id).select("id");
    if (error) throw error;
    if (!data || data.length === 0) throw new Error("Visita não encontrada ou sem permissão.");
    atualizar(slug);
    return actionOk();
  });
}
