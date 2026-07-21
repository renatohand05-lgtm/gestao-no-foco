-- Sprint 15 Gate 2 — recursos completos, reservas, alertas com histórico
-- Idempotente.

/* ─── Extensão oficina_recursos ───────────────────────────── */

alter table public.oficina_recursos
  add column if not exists codigo text,
  add column if not exists centro_custo_id uuid references public.centros_custo (id) on delete set null,
  add column if not exists capacidade numeric(12,2),
  add column if not exists data_manutencao date,
  add column if not exists proxima_manutencao date,
  add column if not exists responsavel_id uuid references public.profiles (id) on delete set null,
  add column if not exists arquivado_em timestamptz,
  add column if not exists utilizado boolean not null default false;

create unique index if not exists uq_oficina_recursos_tenant_codigo
  on public.oficina_recursos (tenant_id, codigo)
  where codigo is not null and deleted_at is null;

/* ─── Eventos / timeline de recurso ───────────────────────── */

create table if not exists public.oficina_recurso_eventos (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  recurso_id uuid not null references public.oficina_recursos (id) on delete cascade,
  ordem_servico_id uuid references public.ordens_servico (id) on delete set null,
  tipo text not null,
  descricao text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_oficina_recurso_eventos_recurso
  on public.oficina_recurso_eventos (tenant_id, recurso_id, created_at desc);

alter table public.oficina_recurso_eventos enable row level security;

drop policy if exists "Membros leem eventos recurso" on public.oficina_recurso_eventos;
create policy "Membros leem eventos recurso"
  on public.oficina_recurso_eventos for select
  using (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = oficina_recurso_eventos.tenant_id and tm.user_id = auth.uid()
    )
  );

drop policy if exists "Membros inserem eventos recurso" on public.oficina_recurso_eventos;
create policy "Membros inserem eventos recurso"
  on public.oficina_recurso_eventos for insert
  with check (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = oficina_recurso_eventos.tenant_id and tm.user_id = auth.uid()
    )
  );

/* ─── Histórico de alertas ────────────────────────────────── */

create table if not exists public.operacao_alerta_eventos (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  alerta_id uuid not null references public.operacao_alertas (id) on delete cascade,
  tipo text not null,
  descricao text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_operacao_alerta_eventos_alerta
  on public.operacao_alerta_eventos (tenant_id, alerta_id, created_at desc);

alter table public.operacao_alerta_eventos enable row level security;

drop policy if exists "Membros leem eventos alerta" on public.operacao_alerta_eventos;
create policy "Membros leem eventos alerta"
  on public.operacao_alerta_eventos for select
  using (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = operacao_alerta_eventos.tenant_id and tm.user_id = auth.uid()
    )
  );

drop policy if exists "Membros inserem eventos alerta" on public.operacao_alerta_eventos;
create policy "Membros inserem eventos alerta"
  on public.operacao_alerta_eventos for insert
  with check (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = operacao_alerta_eventos.tenant_id and tm.user_id = auth.uid()
    )
  );

/* chave natural para upsert de alertas derivados */
alter table public.operacao_alertas
  add column if not exists chave_unica text;

create unique index if not exists uq_operacao_alertas_chave
  on public.operacao_alertas (tenant_id, chave_unica)
  where deleted_at is null and chave_unica is not null;

/* ─── RPC: vincular OS a recurso (com conflito) ───────────── */

create or replace function public.os_vincular_recurso_atomico(
  p_tenant_id uuid,
  p_ordem_id uuid,
  p_recurso_id uuid,
  p_modo text default 'ocupar', -- ocupar | reservar | liberar
  p_created_by uuid default null
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_os public.ordens_servico%rowtype;
  v_rec public.oficina_recursos%rowtype;
  v_outro uuid;
begin
  perform public.assert_tenant_member(p_tenant_id);

  if p_modo not in ('ocupar', 'reservar', 'liberar') then
    raise exception 'Modo inválido.';
  end if;

  select * into v_os
  from public.ordens_servico
  where id = p_ordem_id and tenant_id = p_tenant_id and deleted_at is null
  for update;

  if not found then
    raise exception 'OS não encontrada.';
  end if;

  if p_modo = 'liberar' then
    if v_os.recurso_id is not null then
      update public.oficina_recursos
      set status = 'disponivel',
          ordem_servico_id = null,
          updated_at = now()
      where id = v_os.recurso_id
        and tenant_id = p_tenant_id
        and (ordem_servico_id is null or ordem_servico_id = p_ordem_id);

      insert into public.oficina_recurso_eventos (
        tenant_id, recurso_id, ordem_servico_id, tipo, descricao, created_by
      ) values (
        p_tenant_id, v_os.recurso_id, p_ordem_id, 'liberacao',
        'Recurso liberado da OS #' || v_os.numero, p_created_by
      );
    end if;

    update public.ordens_servico
    set recurso_id = null, updated_at = now()
    where id = p_ordem_id and tenant_id = p_tenant_id;

    return p_ordem_id;
  end if;

  if p_recurso_id is null then
    raise exception 'Informe o recurso.';
  end if;

  select * into v_rec
  from public.oficina_recursos
  where id = p_recurso_id and tenant_id = p_tenant_id
    and deleted_at is null and arquivado_em is null and ativo = true
  for update;

  if not found then
    raise exception 'Recurso não encontrado ou inativo.';
  end if;

  if v_rec.status in ('manutencao', 'bloqueado') then
    raise exception 'Recurso indisponível (manutenção/bloqueado).';
  end if;

  -- conflito: outro OS no mesmo recurso
  if v_rec.ordem_servico_id is not null and v_rec.ordem_servico_id <> p_ordem_id then
    raise exception 'CONFLITO: recurso já ocupado por outra OS.';
  end if;

  select id into v_outro
  from public.ordens_servico
  where tenant_id = p_tenant_id
    and recurso_id = p_recurso_id
    and id <> p_ordem_id
    and deleted_at is null
  limit 1;

  if v_outro is not null then
    raise exception 'CONFLITO: recurso já vinculado a outra OS.';
  end if;

  -- liberar recurso anterior da OS
  if v_os.recurso_id is not null and v_os.recurso_id <> p_recurso_id then
    update public.oficina_recursos
    set status = 'disponivel',
        ordem_servico_id = null,
        updated_at = now()
    where id = v_os.recurso_id and tenant_id = p_tenant_id;

    insert into public.oficina_recurso_eventos (
      tenant_id, recurso_id, ordem_servico_id, tipo, descricao, created_by
    ) values (
      p_tenant_id, v_os.recurso_id, p_ordem_id, 'liberacao',
      'Troca de recurso na OS #' || v_os.numero, p_created_by
    );
  end if;

  update public.ordens_servico
  set recurso_id = p_recurso_id, updated_at = now()
  where id = p_ordem_id and tenant_id = p_tenant_id;

  update public.oficina_recursos
  set status = case when p_modo = 'reservar' then 'reservado' else 'ocupado' end,
      ordem_servico_id = p_ordem_id,
      utilizado = true,
      updated_at = now()
  where id = p_recurso_id and tenant_id = p_tenant_id;

  insert into public.oficina_recurso_eventos (
    tenant_id, recurso_id, ordem_servico_id, tipo, descricao, created_by
  ) values (
    p_tenant_id, p_recurso_id, p_ordem_id,
    case when p_modo = 'reservar' then 'reserva' else 'ocupacao' end,
    'OS #' || v_os.numero || ' vinculada ao recurso', p_created_by
  );

  return p_ordem_id;
end;
$$;

grant execute on function public.os_vincular_recurso_atomico(uuid, uuid, uuid, text, uuid) to authenticated;

notify pgrst, 'reload schema';
