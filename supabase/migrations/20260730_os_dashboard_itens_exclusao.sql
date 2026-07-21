-- Sprint 14 Adendo Final — Dashboard OS, itens personalizados, exclusão controlada
-- Execute após 20260728 (e idealmente 20260729)

/* ─── Colunas itens personalizados ─────────────────────────── */

alter table public.ordem_servico_itens
  add column if not exists is_personalizado boolean not null default false;

alter table public.ordem_servico_itens
  add column if not exists personalizado_motivo text;

alter table public.ordem_servico_itens
  add column if not exists personalizado_criado_por uuid references auth.users (id) on delete set null;

alter table public.ordem_servico_itens
  add column if not exists personalizado_criado_em timestamptz;

alter table public.ordem_servico_itens
  add column if not exists personalizado_convertido_em timestamptz;

alter table public.ordem_servico_itens
  add column if not exists personalizado_convertido_por uuid references auth.users (id) on delete set null;

create index if not exists idx_os_itens_personalizado_desc
  on public.ordem_servico_itens (tenant_id, is_personalizado, lower(descricao))
  where deleted_at is null and is_personalizado = true;

/* ─── Arquivar OS ──────────────────────────────────────────── */

alter table public.ordens_servico
  add column if not exists arquivado_em timestamptz;

alter table public.ordens_servico
  add column if not exists arquivado_por uuid references auth.users (id) on delete set null;

alter table public.ordens_servico
  add column if not exists arquivado_motivo text;

create index if not exists idx_ordens_servico_arquivado
  on public.ordens_servico (tenant_id, arquivado_em)
  where deleted_at is null;

/* ─── Seed permissões OS (estende seed_role_permissions_padrao) ─ */

create or replace function public.seed_role_permissions_padrao(p_tenant_id uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  keys text[] := array[
    'venda_rapida.criar',
    'venda_rapida.sem_cliente',
    'desconto.aplicar',
    'desconto.aprovar',
    'desconto.abaixo_margem',
    'venda.cancelar',
    'venda.devolver',
    'estoque.estornar',
    'venda.editar_concluida',
    'dashboard.descontos.ver',
    'os.criar_cliente_forcado',
    'estoque.saldo_negativo',
    'os.visualizar_dashboard',
    'os.criar',
    'os.editar',
    'os.adicionar_item_personalizado',
    'os.converter_item_personalizado',
    'os.excluir_rascunho',
    'os.cancelar',
    'os.arquivar',
    'os.restaurar',
    'os.visualizar_canceladas'
  ];
  k text;
  member_keys text[] := array[
    'venda_rapida.criar',
    'venda_rapida.sem_cliente',
    'venda.cancelar',
    'os.visualizar_dashboard',
    'os.criar',
    'os.editar',
    'os.visualizar_canceladas'
  ];
begin
  perform public.assert_tenant_member(p_tenant_id);

  foreach k in array keys loop
    insert into public.tenant_role_permissions (tenant_id, role, permission_key, allowed)
    values (p_tenant_id, 'owner', k, true)
    on conflict (tenant_id, role, permission_key) do nothing;

    insert into public.tenant_role_permissions (tenant_id, role, permission_key, allowed)
    values (p_tenant_id, 'admin', k, true)
    on conflict (tenant_id, role, permission_key) do nothing;

    insert into public.tenant_role_permissions (tenant_id, role, permission_key, allowed)
    values (
      p_tenant_id, 'manager', k,
      k <> 'venda.editar_concluida'
    )
    on conflict (tenant_id, role, permission_key) do nothing;

    insert into public.tenant_role_permissions (tenant_id, role, permission_key, allowed)
    values (
      p_tenant_id, 'member', k,
      k = any (member_keys)
    )
    on conflict (tenant_id, role, permission_key) do nothing;
  end loop;
end;
$$;

/* ─── Helper: registrar evento OS ──────────────────────────── */

create or replace function public.os_registrar_evento(
  p_tenant_id uuid,
  p_ordem_id uuid,
  p_tipo text,
  p_descricao text,
  p_estado_anterior text default null,
  p_estado_posterior text default null,
  p_motivo text default null,
  p_entidade_tipo text default null,
  p_entidade_id uuid default null,
  p_user_id uuid default null
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  insert into public.ordem_servico_eventos (
    tenant_id, ordem_servico_id, tipo, descricao,
    estado_anterior, estado_posterior, motivo,
    entidade_tipo, entidade_id, user_id
  ) values (
    p_tenant_id, p_ordem_id, p_tipo, p_descricao,
    p_estado_anterior, p_estado_posterior, p_motivo,
    p_entidade_tipo, p_entidade_id, coalesce(p_user_id, auth.uid())
  );
end;
$$;

/* ─── Excluir rascunho (soft-delete) ───────────────────────── */

create or replace function public.os_excluir_rascunho_atomico(
  p_tenant_id uuid,
  p_ordem_id uuid,
  p_motivo text,
  p_user_id uuid default null
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_os public.ordens_servico%rowtype;
  v_uid uuid := coalesce(p_user_id, auth.uid());
begin
  perform public.assert_tenant_member(p_tenant_id);

  if p_motivo is null or length(trim(p_motivo)) < 3 then
    raise exception 'Informe o motivo da exclusão do rascunho.';
  end if;

  select * into v_os
  from public.ordens_servico
  where id = p_ordem_id and tenant_id = p_tenant_id and deleted_at is null
  for update;

  if not found then
    raise exception 'Ordem de serviço não encontrada.';
  end if;

  if v_os.status <> 'rascunho' then
    raise exception 'Somente rascunhos podem ser excluídos.';
  end if;

  if v_os.venda_id is not null then
    raise exception 'Não é possível excluir OS com faturamento vinculado.';
  end if;

  if exists (
    select 1 from public.ordem_servico_itens i
    where i.ordem_servico_id = p_ordem_id and i.tenant_id = p_tenant_id
      and i.deleted_at is null
      and i.estoque_status in ('reservado', 'separado', 'consumido')
  ) then
    raise exception 'Não é possível excluir: há movimentação/reserva de estoque.';
  end if;

  if exists (
    select 1 from public.ordem_servico_itens i
    where i.ordem_servico_id = p_ordem_id and i.tenant_id = p_tenant_id
      and i.deleted_at is null
      and i.aprovacao_status = 'aprovado'
  ) then
    raise exception 'Não é possível excluir: há itens aprovados pelo cliente.';
  end if;

  update public.ordens_servico
  set deleted_at = now(), updated_at = now()
  where id = p_ordem_id and tenant_id = p_tenant_id;

  update public.ordem_servico_itens
  set deleted_at = coalesce(deleted_at, now()), updated_at = now()
  where ordem_servico_id = p_ordem_id and tenant_id = p_tenant_id
    and deleted_at is null;

  perform public.os_registrar_evento(
    p_tenant_id, p_ordem_id, 'rascunho_excluido',
    'Rascunho excluído (soft-delete)',
    'rascunho', 'excluido', trim(p_motivo),
    'ordem_servico', p_ordem_id, v_uid
  );

  return p_ordem_id;
end;
$$;

/* ─── Cancelar OS ──────────────────────────────────────────── */

create or replace function public.os_cancelar_atomico(
  p_tenant_id uuid,
  p_ordem_id uuid,
  p_motivo text,
  p_user_id uuid default null
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_os public.ordens_servico%rowtype;
  v_uid uuid := coalesce(p_user_id, auth.uid());
  v_prev text;
begin
  perform public.assert_tenant_member(p_tenant_id);

  if p_motivo is null or length(trim(p_motivo)) < 3 then
    raise exception 'Informe o motivo do cancelamento.';
  end if;

  select * into v_os
  from public.ordens_servico
  where id = p_ordem_id and tenant_id = p_tenant_id and deleted_at is null
  for update;

  if not found then
    raise exception 'Ordem de serviço não encontrada.';
  end if;

  if v_os.status in ('cancelado', 'cancelada') then
    raise exception 'Esta OS já está cancelada.';
  end if;

  if v_os.status = 'faturado' or v_os.venda_id is not null then
    raise exception 'OS faturada não pode ser cancelada por aqui. Use o estorno da venda.';
  end if;

  if exists (
    select 1 from public.ordem_servico_itens i
    where i.ordem_servico_id = p_ordem_id and i.tenant_id = p_tenant_id
      and i.deleted_at is null
      and i.estoque_status = 'consumido'
  ) then
    raise exception 'Há itens com estoque já consumido. Estorne o estoque antes de cancelar.';
  end if;

  v_prev := v_os.status;

  -- libera reservas
  update public.ordem_servico_itens
  set
    estoque_status = case
      when estoque_status in ('reservado', 'separado') then 'devolvido'
      else estoque_status
    end,
    execucao_status = case
      when execucao_status not in ('concluido', 'cancelado') then 'cancelado'
      else execucao_status
    end,
    updated_at = now()
  where ordem_servico_id = p_ordem_id and tenant_id = p_tenant_id
    and deleted_at is null;

  update public.ordens_servico
  set
    status = 'cancelado',
    cancelamento_motivo = trim(p_motivo),
    cancelado_por = v_uid,
    cancelado_em = now(),
    updated_at = now()
  where id = p_ordem_id and tenant_id = p_tenant_id;

  perform public.os_registrar_evento(
    p_tenant_id, p_ordem_id, 'os_cancelada',
    'OS cancelada',
    v_prev, 'cancelado', trim(p_motivo),
    'ordem_servico', p_ordem_id, v_uid
  );

  return p_ordem_id;
end;
$$;

/* ─── Arquivar / restaurar ─────────────────────────────────── */

create or replace function public.os_arquivar_atomico(
  p_tenant_id uuid,
  p_ordem_id uuid,
  p_motivo text,
  p_user_id uuid default null
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_os public.ordens_servico%rowtype;
  v_uid uuid := coalesce(p_user_id, auth.uid());
begin
  perform public.assert_tenant_member(p_tenant_id);

  if p_motivo is null or length(trim(p_motivo)) < 2 then
    raise exception 'Informe o motivo do arquivamento.';
  end if;

  select * into v_os
  from public.ordens_servico
  where id = p_ordem_id and tenant_id = p_tenant_id and deleted_at is null
  for update;

  if not found then
    raise exception 'Ordem de serviço não encontrada.';
  end if;

  if v_os.arquivado_em is not null then
    raise exception 'Esta OS já está arquivada.';
  end if;

  update public.ordens_servico
  set
    arquivado_em = now(),
    arquivado_por = v_uid,
    arquivado_motivo = trim(p_motivo),
    updated_at = now()
  where id = p_ordem_id and tenant_id = p_tenant_id;

  perform public.os_registrar_evento(
    p_tenant_id, p_ordem_id, 'os_arquivada',
    'OS arquivada',
    v_os.status, v_os.status, trim(p_motivo),
    'ordem_servico', p_ordem_id, v_uid
  );

  return p_ordem_id;
end;
$$;

create or replace function public.os_restaurar_atomico(
  p_tenant_id uuid,
  p_ordem_id uuid,
  p_motivo text default null,
  p_user_id uuid default null
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_os public.ordens_servico%rowtype;
  v_uid uuid := coalesce(p_user_id, auth.uid());
begin
  perform public.assert_tenant_member(p_tenant_id);

  select * into v_os
  from public.ordens_servico
  where id = p_ordem_id and tenant_id = p_tenant_id and deleted_at is null
  for update;

  if not found then
    raise exception 'Ordem de serviço não encontrada.';
  end if;

  if v_os.arquivado_em is null then
    raise exception 'Esta OS não está arquivada.';
  end if;

  update public.ordens_servico
  set
    arquivado_em = null,
    arquivado_por = null,
    arquivado_motivo = null,
    updated_at = now()
  where id = p_ordem_id and tenant_id = p_tenant_id;

  perform public.os_registrar_evento(
    p_tenant_id, p_ordem_id, 'os_restaurada',
    'OS restaurada do arquivo',
    v_os.status, v_os.status, coalesce(nullif(trim(p_motivo), ''), 'Restauração'),
    'ordem_servico', p_ordem_id, v_uid
  );

  return p_ordem_id;
end;
$$;

grant execute on function public.os_registrar_evento(uuid, uuid, text, text, text, text, text, text, uuid, uuid) to authenticated;
grant execute on function public.os_excluir_rascunho_atomico(uuid, uuid, text, uuid) to authenticated;
grant execute on function public.os_cancelar_atomico(uuid, uuid, text, uuid) to authenticated;
grant execute on function public.os_arquivar_atomico(uuid, uuid, text, uuid) to authenticated;
grant execute on function public.os_restaurar_atomico(uuid, uuid, text, uuid) to authenticated;
grant execute on function public.seed_role_permissions_padrao(uuid) to authenticated;

comment on column public.ordem_servico_itens.is_personalizado is
  'Item avulso (não cadastrado no mestre); não movimenta estoque até conversão.';
comment on column public.ordens_servico.arquivado_em is
  'Arquivamento lógico; remove da visão principal sem apagar histórico.';
