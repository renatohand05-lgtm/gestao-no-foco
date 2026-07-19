-- =============================================================================
-- Sprint 13.19.3 — Fix RPCs públicas de inspeção
-- EXECUÇÃO MANUAL — não alterar DRE / Fluxo / estoque / faturamento.
--
-- Causa: funções criadas com `set search_path = public` não resolvem
-- `digest()` do pgcrypto (schema `extensions` no Supabase), gerando
-- ERROR 42883: function digest(text, unknown) does not exist.
-- PostgREST enxerga a RPC, mas a execução falha; o preflight antigo
-- interpretava "does not exist" como RPC ausente.
-- =============================================================================

create extension if not exists pgcrypto with schema extensions;

-- -----------------------------------------------------------------------------
-- 1) inspecao_publica_por_token(p_token text) → jsonb
-- -----------------------------------------------------------------------------
create or replace function public.inspecao_publica_por_token(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_hash text;
  v_share public.ordem_servico_compartilhamentos%rowtype;
  v_os public.ordens_servico%rowtype;
  v_cliente record;
  v_veiculo record;
  v_tenant record;
  v_versao public.ordem_servico_orcamento_versoes%rowtype;
  v_placa_mask text;
begin
  if p_token is null or length(p_token) < 32 then
    return jsonb_build_object('ok', false, 'error', 'token_invalido');
  end if;

  -- Hash estável (SHA-256 hex). extensions.digest exige bytea.
  v_hash := encode(extensions.digest(convert_to(p_token, 'UTF8'), 'sha256'), 'hex');

  select * into v_share
  from public.ordem_servico_compartilhamentos
  where token_hash = v_hash
    and deleted_at is null
  limit 1;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'token_invalido');
  end if;

  if v_share.status = 'revogado' or v_share.revogado_em is not null then
    return jsonb_build_object('ok', false, 'error', 'token_revogado');
  end if;

  if v_share.expira_em < now() then
    update public.ordem_servico_compartilhamentos
      set status = 'expirado', updated_at = now()
    where id = v_share.id and status = 'ativo';
    return jsonb_build_object('ok', false, 'error', 'token_expirado');
  end if;

  update public.ordem_servico_compartilhamentos
    set visualizacoes = visualizacoes + 1,
        ultima_visualizacao_em = now(),
        updated_at = now()
  where id = v_share.id;

  select * into v_os from public.ordens_servico where id = v_share.ordem_servico_id;
  select id, name, slug, logo_url into v_tenant from public.tenants where id = v_share.tenant_id;
  select id, nome into v_cliente from public.clientes where id = v_os.cliente_id;
  select id, placa, modelo, marca, ano, cor into v_veiculo from public.veiculos where id = v_os.veiculo_id;

  v_placa_mask := case
    when v_veiculo.placa is null then null
    when length(v_veiculo.placa) <= 3 then '***'
    else left(v_veiculo.placa, 3) || '****'
  end;

  if v_share.versao_orcamento_id is not null then
    select * into v_versao from public.ordem_servico_orcamento_versoes where id = v_share.versao_orcamento_id;
  end if;

  -- Projeção segura: sem custos, margem ou observações internas.
  return jsonb_build_object(
    'ok', true,
    'oficina', jsonb_build_object(
      'nome', v_tenant.name,
      'logo_url', v_tenant.logo_url
    ),
    'os', jsonb_build_object(
      'numero', v_os.numero,
      'reclamacao', v_os.reclamacao_cliente,
      'quilometragem', v_os.quilometragem_entrada,
      'status', v_os.status
    ),
    'cliente', jsonb_build_object('nome', v_cliente.nome),
    'veiculo', jsonb_build_object(
      'placa_mascarada', v_placa_mask,
      'modelo', v_veiculo.modelo,
      'marca', v_veiculo.marca,
      'ano', v_veiculo.ano,
      'cor', v_veiculo.cor
    ),
    'compartilhamento', jsonb_build_object(
      'id', v_share.id,
      'expira_em', v_share.expira_em,
      'versao_orcamento_id', v_share.versao_orcamento_id
    ),
    'orcamento', case when v_versao.id is null then null else jsonb_build_object(
      'versao', v_versao.versao,
      'status', v_versao.status,
      'valor_total', v_versao.valor_total,
      'subtotal', v_versao.subtotal,
      'desconto_total', v_versao.desconto_total,
      'acrescimo_total', v_versao.acrescimo_total,
      'aviso_texto', v_versao.aviso_texto,
      'aviso_versao', v_versao.aviso_versao,
      'validade_ate', v_versao.validade_ate,
      'prazo_estimado_dias', v_versao.prazo_estimado_dias
    ) end
  );
end;
$$;

comment on function public.inspecao_publica_por_token(text) is
  'Inspeção digital (13.19.3): carrega resumo público por token. SECURITY DEFINER; sem custos/margem/obs internas.';

revoke all on function public.inspecao_publica_por_token(text) from public;
grant execute on function public.inspecao_publica_por_token(text) to anon, authenticated;

-- -----------------------------------------------------------------------------
-- 2) inspecao_publica_detalhes(p_token text) → jsonb
-- -----------------------------------------------------------------------------
create or replace function public.inspecao_publica_detalhes(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_hash text;
  v_share public.ordem_servico_compartilhamentos%rowtype;
  v_checklist jsonb;
  v_diagnosticos jsonb;
  v_itens jsonb;
  v_anexos jsonb;
begin
  if p_token is null or length(p_token) < 32 then
    return jsonb_build_object('ok', false, 'error', 'token_invalido');
  end if;

  v_hash := encode(extensions.digest(convert_to(p_token, 'UTF8'), 'sha256'), 'hex');

  select * into v_share
  from public.ordem_servico_compartilhamentos
  where token_hash = v_hash and deleted_at is null and status = 'ativo' and expira_em >= now()
  limit 1;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'token_invalido');
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', c.id,
    'categoria', c.categoria,
    'item_codigo', c.item_codigo,
    'item_label', c.item_label,
    'classificacao', coalesce(c.classificacao, 'nao_verificado'),
    'observacao', c.observacao,
    'ordem', c.ordem
  ) order by c.ordem, c.item_label), '[]'::jsonb)
  into v_checklist
  from public.ordem_servico_checklist c
  where c.ordem_servico_id = v_share.ordem_servico_id
    and c.tenant_id = v_share.tenant_id
    and c.deleted_at is null;

  -- Sem observacoes_internas — somente campos seguros ao cliente.
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', d.id,
    'sintoma_relatado', d.sintoma_relatado,
    'diagnostico_tecnico', d.diagnostico_tecnico,
    'causa_provavel', d.causa_provavel,
    'recomendacao', d.recomendacao,
    'gravidade', d.gravidade,
    'urgencia', d.urgencia,
    'observacoes_cliente', d.observacoes_cliente,
    'registrado_em', d.registrado_em
  ) order by d.registrado_em desc), '[]'::jsonb)
  into v_diagnosticos
  from public.ordem_servico_diagnosticos d
  where d.ordem_servico_id = v_share.ordem_servico_id
    and d.tenant_id = v_share.tenant_id
    and d.deleted_at is null;

  if v_share.versao_orcamento_id is not null then
    select coalesce(jsonb_agg(jsonb_build_object(
      'id', i.id,
      'descricao', i.descricao,
      'tipo_item', i.tipo_item,
      'categoria_item', i.categoria_item,
      'quantidade', i.quantidade,
      'valor_unitario', i.valor_unitario,
      'desconto', i.desconto,
      'acrescimo', i.acrescimo,
      'valor_total', i.valor_total,
      'recomendacao', i.recomendacao,
      'prazo_peca', i.prazo_peca,
      'disponibilidade', i.disponibilidade,
      'ordem', i.ordem
    ) order by i.ordem), '[]'::jsonb)
    into v_itens
    from public.ordem_servico_orcamento_itens i
    where i.versao_id = v_share.versao_orcamento_id
      and i.tenant_id = v_share.tenant_id;
  else
    v_itens := '[]'::jsonb;
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', a.id,
    'etapa', a.etapa,
    'tipo', a.tipo,
    'legenda', coalesce(a.legenda, a.descricao),
    'checklist_item_id', a.checklist_item_id,
    'diagnostico_id', a.diagnostico_id,
    'ordem', a.ordem
  ) order by a.ordem, a.created_at), '[]'::jsonb)
  into v_anexos
  from public.ordem_servico_anexos a
  where a.ordem_servico_id = v_share.ordem_servico_id
    and a.tenant_id = v_share.tenant_id
    and a.deleted_at is null
    and a.tipo = 'foto';

  return jsonb_build_object(
    'ok', true,
    'checklist', v_checklist,
    'diagnosticos', v_diagnosticos,
    'itens', v_itens,
    'anexos', v_anexos
  );
end;
$$;

comment on function public.inspecao_publica_detalhes(text) is
  'Inspeção digital (13.19.3): checklist/diagnósticos/itens/anexos públicos por token.';

revoke all on function public.inspecao_publica_detalhes(text) from public;
grant execute on function public.inspecao_publica_detalhes(text) to anon, authenticated;

-- -----------------------------------------------------------------------------
-- 3) inspecao_publica_aprovar(...) → jsonb
-- -----------------------------------------------------------------------------
create or replace function public.inspecao_publica_aprovar(
  p_token text,
  p_modo text,
  p_nome text,
  p_observacao text,
  p_aceite_aviso boolean,
  p_itens jsonb,
  p_ip_hash text default null,
  p_user_agent text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_hash text;
  v_share public.ordem_servico_compartilhamentos%rowtype;
  v_versao public.ordem_servico_orcamento_versoes%rowtype;
  v_aprovacao_id uuid;
  v_item jsonb;
  v_decisao text;
  v_orc_item_id uuid;
  v_item_origem uuid;
  v_aprovados int := 0;
  v_reprovados int := 0;
  v_status_versao text;
  v_status_os text;
begin
  if p_token is null or length(p_token) < 32 then
    return jsonb_build_object('ok', false, 'error', 'token_invalido');
  end if;
  if p_modo not in ('total', 'parcial', 'reprovar', 'contato') then
    return jsonb_build_object('ok', false, 'error', 'modo_invalido');
  end if;
  if coalesce(p_aceite_aviso, false) is not true and p_modo <> 'contato' then
    return jsonb_build_object('ok', false, 'error', 'aceite_aviso_obrigatorio');
  end if;

  v_hash := encode(extensions.digest(convert_to(p_token, 'UTF8'), 'sha256'), 'hex');

  select * into v_share
  from public.ordem_servico_compartilhamentos
  where token_hash = v_hash and deleted_at is null and status = 'ativo' and expira_em >= now()
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'token_invalido');
  end if;

  if v_share.versao_orcamento_id is null then
    return jsonb_build_object('ok', false, 'error', 'sem_orcamento');
  end if;

  select * into v_versao
  from public.ordem_servico_orcamento_versoes
  where id = v_share.versao_orcamento_id
    and tenant_id = v_share.tenant_id
    and deleted_at is null
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'versao_nao_encontrada');
  end if;

  if v_versao.status in ('aprovado', 'parcialmente_aprovado', 'reprovado', 'supersedido') then
    return jsonb_build_object('ok', false, 'error', 'versao_ja_decidida');
  end if;

  insert into public.ordem_servico_aprovacoes (
    tenant_id, ordem_servico_id, versao_orcamento_id, compartilhamento_id,
    modo, canal, nome_informado, observacao_cliente, aceite_aviso, aviso_versao,
    ip_hash, user_agent
  ) values (
    v_share.tenant_id, v_share.ordem_servico_id, v_versao.id, v_share.id,
    p_modo, coalesce(v_share.canal, 'link'), nullif(trim(p_nome), ''), nullif(trim(p_observacao), ''),
    coalesce(p_aceite_aviso, false), v_versao.aviso_versao,
    p_ip_hash, left(coalesce(p_user_agent, ''), 500)
  ) returning id into v_aprovacao_id;

  if p_modo = 'contato' then
    return jsonb_build_object('ok', true, 'aprovacao_id', v_aprovacao_id, 'modo', 'contato');
  end if;

  if p_modo = 'total' then
    for v_item in
      select jsonb_build_object('id', i.id, 'item_origem_id', i.item_origem_id, 'decisao', 'aprovado')
      from public.ordem_servico_orcamento_itens i
      where i.versao_id = v_versao.id and i.tenant_id = v_share.tenant_id
    loop
      v_orc_item_id := (v_item->>'id')::uuid;
      v_item_origem := nullif(v_item->>'item_origem_id', '')::uuid;
      insert into public.ordem_servico_aprovacao_itens (
        tenant_id, aprovacao_id, orcamento_item_id, item_origem_id, decisao
      ) values (
        v_share.tenant_id, v_aprovacao_id, v_orc_item_id, v_item_origem, 'aprovado'
      );
      if v_item_origem is not null then
        update public.ordem_servico_itens
          set aprovacao_status = 'aprovado', updated_at = now()
        where id = v_item_origem and tenant_id = v_share.tenant_id and deleted_at is null;
      end if;
      v_aprovados := v_aprovados + 1;
    end loop;
    v_status_versao := 'aprovado';
    v_status_os := 'aprovado';
  elsif p_modo = 'reprovar' then
    for v_item in
      select jsonb_build_object('id', i.id, 'item_origem_id', i.item_origem_id, 'decisao', 'reprovado')
      from public.ordem_servico_orcamento_itens i
      where i.versao_id = v_versao.id and i.tenant_id = v_share.tenant_id
    loop
      v_orc_item_id := (v_item->>'id')::uuid;
      v_item_origem := nullif(v_item->>'item_origem_id', '')::uuid;
      insert into public.ordem_servico_aprovacao_itens (
        tenant_id, aprovacao_id, orcamento_item_id, item_origem_id, decisao
      ) values (
        v_share.tenant_id, v_aprovacao_id, v_orc_item_id, v_item_origem, 'reprovado'
      );
      if v_item_origem is not null then
        update public.ordem_servico_itens
          set aprovacao_status = 'reprovado', updated_at = now()
        where id = v_item_origem and tenant_id = v_share.tenant_id and deleted_at is null;
      end if;
      v_reprovados := v_reprovados + 1;
    end loop;
    v_status_versao := 'reprovado';
    v_status_os := 'aguardando_orcamento';
  else
    if p_itens is null or jsonb_typeof(p_itens) <> 'array' or jsonb_array_length(p_itens) = 0 then
      return jsonb_build_object('ok', false, 'error', 'itens_obrigatorios');
    end if;
    for v_item in select * from jsonb_array_elements(p_itens)
    loop
      v_orc_item_id := (v_item->>'id')::uuid;
      v_decisao := v_item->>'decisao';
      if v_decisao not in ('aprovado', 'reprovado') then
        return jsonb_build_object('ok', false, 'error', 'decisao_invalida');
      end if;
      select i.item_origem_id into v_item_origem
      from public.ordem_servico_orcamento_itens i
      where i.id = v_orc_item_id and i.versao_id = v_versao.id and i.tenant_id = v_share.tenant_id;
      if not found then
        return jsonb_build_object('ok', false, 'error', 'item_invalido');
      end if;
      insert into public.ordem_servico_aprovacao_itens (
        tenant_id, aprovacao_id, orcamento_item_id, item_origem_id, decisao
      ) values (
        v_share.tenant_id, v_aprovacao_id, v_orc_item_id, v_item_origem, v_decisao
      );
      if v_item_origem is not null then
        update public.ordem_servico_itens
          set aprovacao_status = v_decisao, updated_at = now()
        where id = v_item_origem and tenant_id = v_share.tenant_id and deleted_at is null;
      end if;
      if v_decisao = 'aprovado' then v_aprovados := v_aprovados + 1; else v_reprovados := v_reprovados + 1; end if;
    end loop;
    if v_aprovados = 0 then
      v_status_versao := 'reprovado';
      v_status_os := 'aguardando_orcamento';
    elsif v_reprovados = 0 then
      v_status_versao := 'aprovado';
      v_status_os := 'aprovado';
    else
      v_status_versao := 'parcialmente_aprovado';
      v_status_os := 'parcialmente_aprovado';
    end if;
  end if;

  update public.ordem_servico_orcamento_versoes
    set status = v_status_versao, updated_at = now()
  where id = v_versao.id;

  update public.ordens_servico
    set status = v_status_os, updated_at = now()
  where id = v_share.ordem_servico_id
    and tenant_id = v_share.tenant_id
    and deleted_at is null
    and status = 'aguardando_aprovacao';

  insert into public.ordem_servico_eventos (
    tenant_id, ordem_servico_id, tipo, descricao, estado_anterior, estado_posterior, motivo
  ) values (
    v_share.tenant_id,
    v_share.ordem_servico_id,
    'aprovacao_publica',
    format('Cliente decidiu via link (%s): %s aprovado(s), %s reprovado(s)', p_modo, v_aprovados, v_reprovados),
    'aguardando_aprovacao',
    v_status_os,
    format('aprovacao_id=%s;versao=%s;modo=%s', v_aprovacao_id, v_versao.id, p_modo)
  );

  return jsonb_build_object(
    'ok', true,
    'aprovacao_id', v_aprovacao_id,
    'status_versao', v_status_versao,
    'status_os', v_status_os,
    'aprovados', v_aprovados,
    'reprovados', v_reprovados
  );
end;
$$;

comment on function public.inspecao_publica_aprovar(text, text, text, text, boolean, jsonb, text, text) is
  'Inspeção digital (13.19.3): aprovação pública imutável por versão de orçamento.';

revoke all on function public.inspecao_publica_aprovar(text, text, text, text, boolean, jsonb, text, text) from public;
grant execute on function public.inspecao_publica_aprovar(text, text, text, text, boolean, jsonb, text, text) to anon, authenticated;

notify pgrst, 'reload schema';
