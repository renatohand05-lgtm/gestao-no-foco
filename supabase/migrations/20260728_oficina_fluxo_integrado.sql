-- Sprint 14 Adendo — Fluxo integrado oficina
-- OS com cliente/veículo atômico, venda balcão, descontos com alçada, permissões, auditoria
-- Execute manualmente no Supabase SQL Editor após 20260726/20260727.

/* ═══════════════════════════════════════════════════════════
   1) VENDAS — consumidor não identificado + metadados balcão
   ═══════════════════════════════════════════════════════════ */

alter table public.vendas
  add column if not exists consumidor_nao_identificado boolean not null default false,
  add column if not exists canal_venda text not null default 'padrao'
    check (canal_venda in ('padrao', 'balcao', 'os', 'ecommerce', 'outro')),
  add column if not exists vendedor_id uuid references public.profiles (id) on delete set null,
  add column if not exists desconto_percentual numeric(8, 4) not null default 0
    check (desconto_percentual >= 0 and desconto_percentual <= 100),
  add column if not exists desconto_motivo text,
  add column if not exists desconto_tipo text,
  add column if not exists desconto_autorizado_por uuid references public.profiles (id) on delete set null,
  add column if not exists cancelamento_motivo text,
  add column if not exists cancelado_por uuid references public.profiles (id) on delete set null,
  add column if not exists cancelado_em timestamptz;

create index if not exists idx_vendas_canal
  on public.vendas (tenant_id, canal_venda)
  where deleted_at is null;

create index if not exists idx_vendas_vendedor
  on public.vendas (tenant_id, vendedor_id)
  where deleted_at is null and vendedor_id is not null;

create index if not exists idx_vendas_consumidor_ni
  on public.vendas (tenant_id, consumidor_nao_identificado)
  where deleted_at is null;

comment on column public.vendas.consumidor_nao_identificado is
  'Venda de balcão sem cliente identificado (usa cliente sistema do tenant)';
comment on column public.vendas.canal_venda is 'Canal operacional da venda';

/* ═══════════════════════════════════════════════════════════
   2) OS — desconto orçamento com autorização
   ═══════════════════════════════════════════════════════════ */

alter table public.ordens_servico
  add column if not exists desconto_valor numeric(15, 2) not null default 0
    check (desconto_valor >= 0),
  add column if not exists desconto_percentual numeric(8, 4) not null default 0
    check (desconto_percentual >= 0 and desconto_percentual <= 100),
  add column if not exists desconto_motivo text,
  add column if not exists desconto_tipo text,
  add column if not exists desconto_cliente_recorrente boolean not null default false,
  add column if not exists desconto_solicitado_por uuid references public.profiles (id) on delete set null,
  add column if not exists desconto_autorizado_por uuid references public.profiles (id) on delete set null,
  add column if not exists desconto_autorizado_em timestamptz,
  add column if not exists desconto_status text not null default 'nenhum'
    check (desconto_status in (
      'nenhum', 'aprovado', 'pendente_aprovacao', 'rejeitado', 'bloqueado'
    )),
  add column if not exists desconto_observacao text,
  add column if not exists cancelamento_motivo text,
  add column if not exists cancelado_por uuid references public.profiles (id) on delete set null,
  add column if not exists cancelado_em timestamptz;

/* ═══════════════════════════════════════════════════════════
   3) Política de alçada de desconto
   ═══════════════════════════════════════════════════════════ */

create table if not exists public.desconto_alcadas (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  cargo text not null
    check (cargo in (
      'membro', 'supervisor_operacao', 'gerente_operacao', 'admin', 'owner'
    )),
  limite_percentual numeric(8, 4) not null default 0
    check (limite_percentual >= 0 and limite_percentual <= 100),
  limite_valor numeric(15, 2),
  margem_minima_percentual numeric(8, 4) not null default 0,
  pode_aprovar_acima boolean not null default false,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, cargo)
);

alter table public.desconto_alcadas enable row level security;

drop policy if exists "Membros leem alçadas desconto" on public.desconto_alcadas;
create policy "Membros leem alçadas desconto"
  on public.desconto_alcadas for select
  using (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = desconto_alcadas.tenant_id and tm.user_id = auth.uid()
    )
  );

drop policy if exists "Admins gerenciam alçadas desconto" on public.desconto_alcadas;
create policy "Admins gerenciam alçadas desconto"
  on public.desconto_alcadas for all
  using (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = desconto_alcadas.tenant_id
        and tm.user_id = auth.uid()
        and tm.role in ('owner', 'admin')
    )
  )
  with check (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = desconto_alcadas.tenant_id
        and tm.user_id = auth.uid()
        and tm.role in ('owner', 'admin')
    )
  );

/* ═══════════════════════════════════════════════════════════
   4) Auditoria de descontos
   ═══════════════════════════════════════════════════════════ */

create table if not exists public.desconto_eventos (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  entidade_tipo text not null check (entidade_tipo in ('os', 'venda')),
  entidade_id uuid not null,
  cliente_id uuid references public.clientes (id) on delete set null,
  unidade text,
  solicitante_id uuid references public.profiles (id) on delete set null,
  autorizador_id uuid references public.profiles (id) on delete set null,
  cargo_autorizador text,
  valor_original numeric(15, 2) not null,
  valor_desconto numeric(15, 2) not null,
  percentual numeric(8, 4) not null default 0,
  valor_final numeric(15, 2) not null,
  margem_antes numeric(15, 2),
  margem_depois numeric(15, 2),
  tipo_desconto text,
  motivo text not null,
  status text not null default 'aprovado'
    check (status in ('aprovado', 'pendente', 'rejeitado', 'bloqueado', 'estornado')),
  observacao text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_desconto_eventos_tenant_created
  on public.desconto_eventos (tenant_id, created_at desc);

create index if not exists idx_desconto_eventos_entidade
  on public.desconto_eventos (tenant_id, entidade_tipo, entidade_id);

create index if not exists idx_desconto_eventos_cliente
  on public.desconto_eventos (tenant_id, cliente_id, created_at desc)
  where cliente_id is not null;

alter table public.desconto_eventos enable row level security;

drop policy if exists "Membros gerenciam eventos desconto" on public.desconto_eventos;
create policy "Membros gerenciam eventos desconto"
  on public.desconto_eventos for all
  using (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = desconto_eventos.tenant_id and tm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = desconto_eventos.tenant_id and tm.user_id = auth.uid()
    )
  );

/* ═══════════════════════════════════════════════════════════
   5) Devoluções de venda
   ═══════════════════════════════════════════════════════════ */

create table if not exists public.venda_devolucoes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  venda_id uuid not null references public.vendas (id) on delete restrict,
  motivo text not null,
  observacao text,
  valor_total numeric(15, 2) not null default 0,
  status text not null default 'concluida'
    check (status in ('concluida', 'cancelada')),
  autorizado_por uuid references public.profiles (id) on delete set null,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.venda_devolucao_itens (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  devolucao_id uuid not null references public.venda_devolucoes (id) on delete cascade,
  venda_item_id uuid not null references public.venda_itens (id) on delete restrict,
  produto_id uuid references public.produtos (id) on delete set null,
  quantidade numeric(15, 3) not null check (quantidade > 0),
  valor_unitario numeric(15, 2) not null default 0,
  total numeric(15, 2) not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_venda_devolucoes_venda
  on public.venda_devolucoes (tenant_id, venda_id);

alter table public.venda_devolucoes enable row level security;
alter table public.venda_devolucao_itens enable row level security;

drop policy if exists "Membros gerenciam devolucoes" on public.venda_devolucoes;
create policy "Membros gerenciam devolucoes"
  on public.venda_devolucoes for all
  using (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = venda_devolucoes.tenant_id and tm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = venda_devolucoes.tenant_id and tm.user_id = auth.uid()
    )
  );

drop policy if exists "Membros gerenciam devolucao itens" on public.venda_devolucao_itens;
create policy "Membros gerenciam devolucao itens"
  on public.venda_devolucao_itens for all
  using (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = venda_devolucao_itens.tenant_id and tm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = venda_devolucao_itens.tenant_id and tm.user_id = auth.uid()
    )
  );

/* ═══════════════════════════════════════════════════════════
   6) Permissões por cargo (chaves granulares)
   ═══════════════════════════════════════════════════════════ */

create table if not exists public.tenant_role_permissions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  role text not null
    check (role in ('owner', 'admin', 'manager', 'member')),
  permission_key text not null,
  allowed boolean not null default true,
  created_at timestamptz not null default now(),
  unique (tenant_id, role, permission_key)
);

create index if not exists idx_tenant_role_permissions_lookup
  on public.tenant_role_permissions (tenant_id, role, permission_key);

alter table public.tenant_role_permissions enable row level security;

drop policy if exists "Membros leem permissoes" on public.tenant_role_permissions;
create policy "Membros leem permissoes"
  on public.tenant_role_permissions for select
  using (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = tenant_role_permissions.tenant_id and tm.user_id = auth.uid()
    )
  );

drop policy if exists "Owners admins gerenciam permissoes" on public.tenant_role_permissions;
create policy "Owners admins gerenciam permissoes"
  on public.tenant_role_permissions for all
  using (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = tenant_role_permissions.tenant_id
        and tm.user_id = auth.uid()
        and tm.role in ('owner', 'admin')
    )
  )
  with check (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = tenant_role_permissions.tenant_id
        and tm.user_id = auth.uid()
        and tm.role in ('owner', 'admin')
    )
  );

/* ═══════════════════════════════════════════════════════════
   7) Seed helpers — consumidor balcão + alçadas + permissões
   ═══════════════════════════════════════════════════════════ */

create or replace function public.ensure_consumidor_balcao(p_tenant_id uuid)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_id uuid;
begin
  perform public.assert_tenant_member(p_tenant_id);

  select id into v_id
  from public.clientes
  where tenant_id = p_tenant_id
    and deleted_at is null
    and origem = 'sistema_balcao'
  order by created_at
  limit 1;

  if v_id is not null then
    return v_id;
  end if;

  insert into public.clientes (
    tenant_id, nome, tipo_pessoa, origem, estagio_funil, ativo, observacoes
  ) values (
    p_tenant_id,
    'Consumidor não identificado',
    'pf',
    'sistema_balcao',
    'fechado',
    true,
    'Cliente sistema para vendas de balcão sem identificação.'
  )
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.seed_desconto_alcadas_padrao(p_tenant_id uuid)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  perform public.assert_tenant_member(p_tenant_id);

  insert into public.desconto_alcadas (tenant_id, cargo, limite_percentual, margem_minima_percentual, pode_aprovar_acima)
  values
    (p_tenant_id, 'membro', 0, 15, false),
    (p_tenant_id, 'supervisor_operacao', 5, 10, true),
    (p_tenant_id, 'gerente_operacao', 15, 5, true),
    (p_tenant_id, 'admin', 30, 0, true),
    (p_tenant_id, 'owner', 100, 0, true)
  on conflict (tenant_id, cargo) do nothing;
end;
$$;

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
    'estoque.saldo_negativo'
  ];
  k text;
begin
  perform public.assert_tenant_member(p_tenant_id);

  foreach k in array keys loop
    -- owner / admin: tudo
    insert into public.tenant_role_permissions (tenant_id, role, permission_key, allowed)
    values (p_tenant_id, 'owner', k, true)
    on conflict (tenant_id, role, permission_key) do nothing;

    insert into public.tenant_role_permissions (tenant_id, role, permission_key, allowed)
    values (p_tenant_id, 'admin', k, true)
    on conflict (tenant_id, role, permission_key) do nothing;

    -- manager: quase tudo, sem editar concluída
    insert into public.tenant_role_permissions (tenant_id, role, permission_key, allowed)
    values (
      p_tenant_id, 'manager', k,
      k <> 'venda.editar_concluida'
    )
    on conflict (tenant_id, role, permission_key) do nothing;

    -- member: operacional básico
    insert into public.tenant_role_permissions (tenant_id, role, permission_key, allowed)
    values (
      p_tenant_id, 'member', k,
      k in (
        'venda_rapida.criar',
        'venda_rapida.sem_cliente',
        'venda.cancelar'
      )
    )
    on conflict (tenant_id, role, permission_key) do nothing;
  end loop;
end;
$$;

/* ═══════════════════════════════════════════════════════════
   8) RPC atômica — abrir OS com cliente/veículo novos
   ═══════════════════════════════════════════════════════════ */

create or replace function public.abrir_os_com_cliente_atomico(
  p_tenant_id uuid,
  p_payload jsonb,
  p_created_by uuid default null,
  p_force_create boolean default false
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_cliente_id uuid;
  v_veiculo_id uuid;
  v_os_id uuid;
  v_mode text;
  v_cliente jsonb;
  v_veiculo jsonb;
  v_os jsonb;
  v_doc text;
  v_tel text;
  v_whats text;
  v_email text;
  v_placa text;
  v_nome text;
  v_dup jsonb := '[]'::jsonb;
  v_row record;
begin
  perform public.assert_tenant_member(p_tenant_id);

  v_mode := coalesce(p_payload->>'mode', 'existente');
  v_os := coalesce(p_payload->'os', '{}'::jsonb);
  v_cliente := coalesce(p_payload->'cliente', '{}'::jsonb);
  v_veiculo := coalesce(p_payload->'veiculo', '{}'::jsonb);

  if v_mode = 'existente' then
    v_cliente_id := nullif(p_payload->>'cliente_id', '')::uuid;
    v_veiculo_id := nullif(p_payload->>'veiculo_id', '')::uuid;

    if v_cliente_id is null then
      raise exception 'Selecione o cliente.';
    end if;
    if v_veiculo_id is null then
      raise exception 'Selecione ou cadastre um veículo.';
    end if;

    if not exists (
      select 1 from public.clientes c
      where c.id = v_cliente_id and c.tenant_id = p_tenant_id and c.deleted_at is null
    ) then
      raise exception 'Cliente não encontrado.';
    end if;

    if not exists (
      select 1 from public.veiculos v
      where v.id = v_veiculo_id
        and v.tenant_id = p_tenant_id
        and v.cliente_id = v_cliente_id
        and v.deleted_at is null
    ) then
      raise exception 'Veículo não pertence ao cliente selecionado.';
    end if;
  else
    -- modo novo_cliente
    v_nome := nullif(trim(coalesce(v_cliente->>'nome', '')), '');
    v_doc := nullif(regexp_replace(coalesce(v_cliente->>'documento', ''), '\D', '', 'g'), '');
    v_tel := nullif(regexp_replace(coalesce(v_cliente->>'telefone', ''), '\D', '', 'g'), '');
    v_whats := nullif(regexp_replace(coalesce(v_cliente->>'whatsapp', ''), '\D', '', 'g'), '');
    v_email := nullif(lower(trim(coalesce(v_cliente->>'email', ''))), '');
    v_placa := nullif(upper(regexp_replace(coalesce(v_veiculo->>'placa', ''), '\s+', '', 'g')), '');

    if v_nome is null then
      raise exception 'Informe o nome do cliente.';
    end if;
    if v_tel is null and v_whats is null then
      raise exception 'Informe telefone ou WhatsApp.';
    end if;
    if v_placa is null then
      raise exception 'Informe a placa do veículo.';
    end if;

    -- antiduplicidade
    for v_row in
      select c.id, c.nome, 'documento'::text as matched_on
      from public.clientes c
      where c.tenant_id = p_tenant_id and c.deleted_at is null
        and v_doc is not null
        and regexp_replace(coalesce(c.documento, ''), '\D', '', 'g') = v_doc
      union all
      select c.id, c.nome, 'telefone'
      from public.clientes c
      where c.tenant_id = p_tenant_id and c.deleted_at is null
        and v_tel is not null
        and (
          regexp_replace(coalesce(c.telefone, ''), '\D', '', 'g') = v_tel
          or regexp_replace(coalesce(c.whatsapp, ''), '\D', '', 'g') = v_tel
        )
      union all
      select c.id, c.nome, 'whatsapp'
      from public.clientes c
      where c.tenant_id = p_tenant_id and c.deleted_at is null
        and v_whats is not null
        and (
          regexp_replace(coalesce(c.whatsapp, ''), '\D', '', 'g') = v_whats
          or regexp_replace(coalesce(c.telefone, ''), '\D', '', 'g') = v_whats
        )
      union all
      select c.id, c.nome, 'email'
      from public.clientes c
      where c.tenant_id = p_tenant_id and c.deleted_at is null
        and v_email is not null
        and lower(coalesce(c.email, '')) = v_email
      union all
      select c.id, c.nome, 'nome_telefone'
      from public.clientes c
      where c.tenant_id = p_tenant_id and c.deleted_at is null
        and lower(trim(c.nome)) = lower(v_nome)
        and v_tel is not null
        and regexp_replace(coalesce(c.telefone, ''), '\D', '', 'g') = v_tel
    loop
      v_dup := v_dup || jsonb_build_object(
        'id', v_row.id,
        'nome', v_row.nome,
        'matched_on', v_row.matched_on
      );
    end loop;

    -- placa existente
    for v_row in
      select v.id as veiculo_id, v.cliente_id, c.nome as cliente_nome, v.placa
      from public.veiculos v
      join public.clientes c on c.id = v.cliente_id
      where v.tenant_id = p_tenant_id
        and v.deleted_at is null
        and lower(coalesce(v.placa, '')) = lower(v_placa)
    loop
      v_dup := v_dup || jsonb_build_object(
        'id', v_row.cliente_id,
        'nome', v_row.cliente_nome,
        'matched_on', 'placa',
        'veiculo_id', v_row.veiculo_id,
        'placa', v_row.placa
      );
    end loop;

    if jsonb_array_length(v_dup) > 0 and not p_force_create then
      return jsonb_build_object(
        'ok', false,
        'code', 'DUPLICATE',
        'duplicates', v_dup
      );
    end if;

    insert into public.clientes (
      tenant_id, nome, telefone, whatsapp, email, documento, tipo_pessoa,
      origem, estagio_funil, ativo
    ) values (
      p_tenant_id,
      v_nome,
      coalesce(v_cliente->>'telefone', v_tel),
      coalesce(v_cliente->>'whatsapp', v_whats),
      nullif(v_cliente->>'email', ''),
      nullif(v_cliente->>'documento', ''),
      coalesce(nullif(v_cliente->>'tipo_pessoa', ''), 'pf'),
      coalesce(nullif(v_cliente->>'origem', ''), 'ordem_de_servico'),
      'lead',
      true
    )
    returning id into v_cliente_id;

    insert into public.veiculos (
      tenant_id, cliente_id, placa, marca, modelo, ano, quilometragem, ativo
    ) values (
      p_tenant_id,
      v_cliente_id,
      v_placa,
      nullif(v_veiculo->>'marca', ''),
      nullif(v_veiculo->>'modelo', ''),
      nullif(v_veiculo->>'ano', '')::int,
      nullif(v_veiculo->>'quilometragem', '')::numeric,
      true
    )
    returning id into v_veiculo_id;

    -- timeline CRM
    begin
      insert into public.cliente_eventos (
        tenant_id, cliente_id, tipo, titulo, descricao,
        referencia_tipo, referencia_id, payload, user_id
      ) values (
        p_tenant_id, v_cliente_id, 'cadastro',
        'Cliente criado na OS',
        'Cadastro simplificado na abertura da ordem de serviço.',
        'cliente', v_cliente_id,
        jsonb_build_object('origem', 'ordem_de_servico'),
        p_created_by
      );

      insert into public.cliente_eventos (
        tenant_id, cliente_id, tipo, titulo, descricao,
        referencia_tipo, referencia_id, payload, user_id
      ) values (
        p_tenant_id, v_cliente_id, 'veiculo',
        'Veículo vinculado',
        format('Placa %s cadastrada com o cliente.', v_placa),
        'veiculo', v_veiculo_id,
        jsonb_build_object('placa', v_placa),
        p_created_by
      );
    exception when others then
      null; -- timeline best-effort se migration CRM ausente
    end;
  end if;

  insert into public.ordens_servico (
    tenant_id, cliente_id, veiculo_id, status,
    quilometragem_entrada, reclamacao_cliente, observacoes,
    nivel_combustivel, objetos_deixados, danos_aparentes,
    origem_atendimento, prioridade, previsao_entrega,
    data_hora_entrada
  ) values (
    p_tenant_id,
    v_cliente_id,
    v_veiculo_id,
    'rascunho',
    nullif(v_os->>'quilometragem_entrada', '')::numeric,
    nullif(v_os->>'reclamacao_cliente', ''),
    nullif(v_os->>'observacoes', ''),
    nullif(v_os->>'nivel_combustivel', ''),
    nullif(v_os->>'objetos_deixados', ''),
    nullif(v_os->>'danos_aparentes', ''),
    coalesce(nullif(v_os->>'origem_atendimento', ''), 'balcao'),
    coalesce(nullif(v_os->>'prioridade', ''), 'normal'),
    nullif(v_os->>'previsao_entrega', '')::timestamptz,
    now()
  )
  returning id into v_os_id;

  -- checklist seed (best-effort — app também faz seed se falhar)
  begin
    insert into public.ordem_servico_checklist (
      tenant_id, ordem_servico_id, item_codigo, item_label, status, responsavel_id
    )
    select p_tenant_id, v_os_id, x.codigo, x.label, 'ok', p_created_by
    from (values
      ('docs', 'Documentos / chave'),
      ('combustivel', 'Nível de combustível'),
      ('pneus', 'Pneus / estepe'),
      ('lataria', 'Lataria / pintura'),
      ('interior', 'Interior / objetos')
    ) as x(codigo, label);
  exception when others then
    null;
  end;

  begin
    insert into public.ordem_servico_eventos (
      tenant_id, ordem_servico_id, tipo, descricao, estado_posterior, user_id
    ) values (
      p_tenant_id, v_os_id, 'abertura', 'OS aberta', 'rascunho', p_created_by
    );
  exception when others then
    null;
  end;

  begin
    insert into public.cliente_eventos (
      tenant_id, cliente_id, tipo, titulo, descricao,
      referencia_tipo, referencia_id, payload, user_id
    ) values (
      p_tenant_id, v_cliente_id, 'os',
      'OS aberta',
      'Ordem de serviço criada.',
      'os', v_os_id,
      jsonb_build_object('origem', coalesce(v_os->>'origem_atendimento', 'balcao')),
      p_created_by
    );
  exception when others then
    null;
  end;

  return jsonb_build_object(
    'ok', true,
    'os_id', v_os_id,
    'cliente_id', v_cliente_id,
    'veiculo_id', v_veiculo_id,
    'created_cliente', v_mode = 'novo_cliente'
  );
end;
$$;

grant execute on function public.ensure_consumidor_balcao(uuid) to authenticated;
grant execute on function public.seed_desconto_alcadas_padrao(uuid) to authenticated;
grant execute on function public.seed_role_permissions_padrao(uuid) to authenticated;
grant execute on function public.abrir_os_com_cliente_atomico(uuid, jsonb, uuid, boolean) to authenticated;

comment on function public.abrir_os_com_cliente_atomico is
  'Cria cliente+veículo+OS atomicamente com antiduplicidade (force_create exige permissão na app)';
