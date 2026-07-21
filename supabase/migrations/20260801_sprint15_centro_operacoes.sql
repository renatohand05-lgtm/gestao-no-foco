-- Sprint 15 — Centro de Operações, recursos, alertas, preferências e índices
-- Idempotente. Não reaplicar lógica financeira.

/* ─── Recursos físicos da oficina ─────────────────────────── */

create table if not exists public.oficina_recursos (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  nome text not null,
  tipo text not null check (tipo in ('elevador', 'rampa', 'box', 'equipamento')),
  status text not null default 'disponivel'
    check (status in ('disponivel', 'ocupado', 'reservado', 'manutencao', 'bloqueado')),
  ordem_servico_id uuid references public.ordens_servico (id) on delete set null,
  observacoes text,
  ativo boolean not null default true,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_oficina_recursos_tenant
  on public.oficina_recursos (tenant_id)
  where deleted_at is null;

create index if not exists idx_oficina_recursos_status
  on public.oficina_recursos (tenant_id, status)
  where deleted_at is null and ativo = true;

alter table public.oficina_recursos enable row level security;

drop policy if exists "Membros leem recursos oficina" on public.oficina_recursos;
create policy "Membros leem recursos oficina"
  on public.oficina_recursos for select
  using (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = oficina_recursos.tenant_id and tm.user_id = auth.uid()
    )
  );

drop policy if exists "Membros gerenciam recursos oficina" on public.oficina_recursos;
create policy "Membros gerenciam recursos oficina"
  on public.oficina_recursos for all
  using (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = oficina_recursos.tenant_id
        and tm.user_id = auth.uid()
        and tm.role in ('owner', 'admin', 'manager')
    )
  )
  with check (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = oficina_recursos.tenant_id
        and tm.user_id = auth.uid()
        and tm.role in ('owner', 'admin', 'manager')
    )
  );

/* ─── Vínculo OS → recurso ────────────────────────────────── */

alter table public.ordens_servico
  add column if not exists recurso_id uuid references public.oficina_recursos (id) on delete set null;

create index if not exists idx_ordens_servico_recurso
  on public.ordens_servico (tenant_id, recurso_id)
  where deleted_at is null and recurso_id is not null;

/* ─── Alertas operacionais ────────────────────────────────── */

create table if not exists public.operacao_alertas (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  tipo text not null,
  severidade text not null default 'medio'
    check (severidade in ('critico', 'alto', 'medio', 'informativo')),
  titulo text not null,
  descricao text,
  origem_tipo text,
  origem_id uuid,
  responsavel_id uuid references public.profiles (id) on delete set null,
  tratado boolean not null default false,
  tratado_em timestamptz,
  tratado_por uuid references public.profiles (id) on delete set null,
  observacao text,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_operacao_alertas_abertos
  on public.operacao_alertas (tenant_id, severidade, created_at desc)
  where deleted_at is null and tratado = false;

alter table public.operacao_alertas enable row level security;

drop policy if exists "Membros leem alertas" on public.operacao_alertas;
create policy "Membros leem alertas"
  on public.operacao_alertas for select
  using (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = operacao_alertas.tenant_id and tm.user_id = auth.uid()
    )
  );

drop policy if exists "Membros gerenciam alertas" on public.operacao_alertas;
create policy "Membros gerenciam alertas"
  on public.operacao_alertas for all
  using (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = operacao_alertas.tenant_id and tm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = operacao_alertas.tenant_id and tm.user_id = auth.uid()
    )
  );

/* ─── Preferências de dashboard por usuário ───────────────── */

create table if not exists public.dashboard_usuario_preferencias (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  dashboard_tipo text not null,
  modo text not null default 'normal'
    check (modo in ('normal', 'executivo', 'comercial')),
  layout jsonb not null default '{}'::jsonb,
  cards_visiveis text[] not null default '{}',
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (tenant_id, user_id, dashboard_tipo)
);

alter table public.dashboard_usuario_preferencias enable row level security;

drop policy if exists "Usuario le suas preferencias dashboard" on public.dashboard_usuario_preferencias;
create policy "Usuario le suas preferencias dashboard"
  on public.dashboard_usuario_preferencias for select
  using (
    user_id = auth.uid()
    and exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = dashboard_usuario_preferencias.tenant_id
        and tm.user_id = auth.uid()
    )
  );

drop policy if exists "Usuario gerencia suas preferencias dashboard" on public.dashboard_usuario_preferencias;
create policy "Usuario gerencia suas preferencias dashboard"
  on public.dashboard_usuario_preferencias for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

/* ─── Índices de performance (dashboards / centro) ────────── */

create index if not exists idx_ordens_servico_tenant_status_abertas
  on public.ordens_servico (tenant_id, status, data_abertura desc)
  where deleted_at is null;

create index if not exists idx_ordens_servico_previsao
  on public.ordens_servico (tenant_id, previsao_entrega)
  where deleted_at is null and previsao_entrega is not null;

create index if not exists idx_ordens_servico_mecanico
  on public.ordens_servico (tenant_id, mecanico_id)
  where deleted_at is null and mecanico_id is not null;

create index if not exists idx_vendas_tenant_data_status
  on public.vendas (tenant_id, data_venda, status)
  where deleted_at is null;

create index if not exists idx_produtos_estoque_alerta
  on public.produtos (tenant_id, estoque_atual, estoque_minimo)
  where deleted_at is null and ativo = true;

/* ─── Permissões Sprint 15 ────────────────────────────────── */

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
    'os.visualizar_canceladas',
    'vendas.visualizar_dashboard',
    'dashboard.visualizar_executivo',
    'dashboard.visualizar_financeiro',
    'dashboard.visualizar_comercial',
    'dashboard.visualizar_estoque',
    'dashboard.visualizar_mecanicos',
    'dashboard.personalizar',
    'centro_operacoes.visualizar',
    'centro_operacoes.alterar_status',
    'centro_operacoes.ver_alertas'
  ];
  k text;
  member_keys text[] := array[
    'venda_rapida.criar',
    'venda_rapida.sem_cliente',
    'venda.cancelar',
    'os.visualizar_dashboard',
    'os.criar',
    'os.editar',
    'os.visualizar_canceladas',
    'vendas.visualizar_dashboard',
    'dashboard.visualizar_executivo',
    'centro_operacoes.visualizar',
    'centro_operacoes.ver_alertas'
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

grant execute on function public.seed_role_permissions_padrao(uuid) to authenticated;

-- Seed idempotente para todos os tenants existentes
do $$
declare
  r record;
begin
  for r in select id from public.tenants loop
    begin
      -- seed exige membro; aplica via insert direto das novas chaves
      insert into public.tenant_role_permissions (tenant_id, role, permission_key, allowed)
      select r.id, role, key, true
      from (values
        ('owner'), ('admin'), ('manager')
      ) as roles(role)
      cross join (values
        ('dashboard.visualizar_executivo'),
        ('dashboard.visualizar_financeiro'),
        ('dashboard.visualizar_comercial'),
        ('dashboard.visualizar_estoque'),
        ('dashboard.visualizar_mecanicos'),
        ('dashboard.personalizar'),
        ('centro_operacoes.visualizar'),
        ('centro_operacoes.alterar_status'),
        ('centro_operacoes.ver_alertas'),
        ('vendas.visualizar_dashboard')
      ) as keys(key)
      on conflict (tenant_id, role, permission_key) do nothing;

      insert into public.tenant_role_permissions (tenant_id, role, permission_key, allowed)
      select r.id, 'member', key, true
      from (values
        ('dashboard.visualizar_executivo'),
        ('centro_operacoes.visualizar'),
        ('centro_operacoes.ver_alertas'),
        ('vendas.visualizar_dashboard')
      ) as keys(key)
      on conflict (tenant_id, role, permission_key) do nothing;
    exception when others then
      raise notice 'seed perms tenant %: %', r.id, sqlerrm;
    end;
  end loop;
end;
$$;

notify pgrst, 'reload schema';
