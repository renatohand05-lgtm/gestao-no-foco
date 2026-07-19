-- Sprint 13.22 — Importação inteligente de NF-e de entrada (Gate 1)
-- Execute MANUALMENTE no Supabase SQL Editor após auditoria do CTO.
-- NÃO altera regras de vendas/faturamento/DRE/Fluxo.
-- Entrada de estoque NÃO atualiza produtos.custo automaticamente (política pendente CTO).

-- ============================================================
-- Extensões
-- ============================================================
create extension if not exists pgcrypto with schema extensions;

-- ============================================================
-- Vínculo reutilizável fornecedor + código → produto ERP
-- ============================================================
create table if not exists public.fornecedor_produto_vinculos (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  fornecedor_id uuid not null references public.fornecedores (id) on delete cascade,
  codigo_fornecedor text not null,
  ean text,
  produto_id uuid not null references public.produtos (id) on delete restrict,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint fornecedor_produto_vinculos_codigo_nao_vazio
    check (length(trim(codigo_fornecedor)) > 0)
);

create unique index if not exists uq_fornecedor_produto_vinculos_ativos
  on public.fornecedor_produto_vinculos (tenant_id, fornecedor_id, codigo_fornecedor)
  where deleted_at is null;

create index if not exists idx_fornecedor_produto_vinculos_tenant
  on public.fornecedor_produto_vinculos (tenant_id)
  where deleted_at is null;

create index if not exists idx_fornecedor_produto_vinculos_ean
  on public.fornecedor_produto_vinculos (tenant_id, ean)
  where deleted_at is null and ean is not null;

alter table public.fornecedor_produto_vinculos enable row level security;

drop policy if exists "Membros gerenciam vinculos fornecedor produto"
  on public.fornecedor_produto_vinculos;
create policy "Membros gerenciam vinculos fornecedor produto"
  on public.fornecedor_produto_vinculos for all
  using (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = fornecedor_produto_vinculos.tenant_id
        and tm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = fornecedor_produto_vinculos.tenant_id
        and tm.user_id = auth.uid()
    )
  );

-- ============================================================
-- Nota fiscal de entrada
-- ============================================================
create table if not exists public.notas_fiscais_entrada (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  fornecedor_id uuid references public.fornecedores (id) on delete set null,
  chave_acesso text not null,
  xml_hash text not null,
  numero text,
  serie text,
  modelo text,
  data_emissao date,
  data_entrada date,
  natureza_operacao text,
  emitente_cnpj_cpf text,
  emitente_razao_social text,
  emitente_nome_fantasia text,
  emitente_ie text,
  emitente_endereco jsonb default '{}'::jsonb,
  valor_produtos numeric(15, 2) not null default 0,
  valor_frete numeric(15, 2) not null default 0,
  valor_seguro numeric(15, 2) not null default 0,
  valor_desconto numeric(15, 2) not null default 0,
  valor_outras_despesas numeric(15, 2) not null default 0,
  valor_impostos numeric(15, 2) not null default 0,
  valor_total numeric(15, 2) not null default 0,
  forma_pagamento text,
  duplicatas jsonb not null default '[]'::jsonb,
  informacoes_complementares text,
  protocolo_autorizacao text,
  status text not null default 'rascunho'
    check (status in (
      'rascunho',
      'aguardando_conferencia',
      'validada',
      'processando',
      'importada',
      'erro',
      'cancelada'
    )),
  gerar_conta_pagar boolean not null default false,
  conta_pagar_id uuid references public.contas_pagar (id) on delete set null,
  categoria_financeira_id uuid references public.categorias_financeiras (id) on delete set null,
  plano_conta_id uuid references public.plano_contas (id) on delete set null,
  centro_custo_id uuid references public.centros_custo (id) on delete set null,
  storage_path text,
  mime_type text,
  file_size_bytes integer,
  xml_original text,
  observacoes text,
  origem_importacao text not null default 'upload_xml',
  erro_mensagem text,
  processado_em timestamptz,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint notas_fiscais_entrada_chave_44
    check (chave_acesso ~ '^[0-9]{44}$')
);

create unique index if not exists uq_notas_fiscais_entrada_chave_ativa
  on public.notas_fiscais_entrada (tenant_id, chave_acesso)
  where deleted_at is null;

create unique index if not exists uq_notas_fiscais_entrada_xml_hash_ativa
  on public.notas_fiscais_entrada (tenant_id, xml_hash)
  where deleted_at is null;

create index if not exists idx_nfe_entrada_tenant_status
  on public.notas_fiscais_entrada (tenant_id, status)
  where deleted_at is null;

create index if not exists idx_nfe_entrada_fornecedor
  on public.notas_fiscais_entrada (tenant_id, fornecedor_id)
  where deleted_at is null;

alter table public.notas_fiscais_entrada enable row level security;

drop policy if exists "Membros gerenciam NF-e entrada" on public.notas_fiscais_entrada;
create policy "Membros gerenciam NF-e entrada"
  on public.notas_fiscais_entrada for all
  using (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = notas_fiscais_entrada.tenant_id
        and tm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = notas_fiscais_entrada.tenant_id
        and tm.user_id = auth.uid()
    )
  );

-- ============================================================
-- Itens da NF-e
-- ============================================================
create table if not exists public.notas_fiscais_entrada_itens (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  nota_fiscal_id uuid not null references public.notas_fiscais_entrada (id) on delete cascade,
  numero_item integer not null,
  codigo_fornecedor text,
  ean text,
  descricao_original text not null,
  produto_id uuid references public.produtos (id) on delete set null,
  ncm text,
  cest text,
  cfop text,
  unidade text,
  quantidade numeric(15, 4) not null check (quantidade >= 0),
  valor_unitario numeric(15, 6) not null default 0,
  valor_total numeric(15, 2) not null default 0,
  valor_desconto numeric(15, 2) not null default 0,
  valor_frete_rateado numeric(15, 2) not null default 0,
  valor_outras_despesas_rateado numeric(15, 2) not null default 0,
  valor_impostos numeric(15, 2) not null default 0,
  custo_unitario_final numeric(15, 6) not null default 0,
  custo_total_final numeric(15, 2) not null default 0,
  lote text,
  destino text not null default 'pendente'
    check (destino in ('estoque', 'os', 'misto', 'despesa', 'ignorar', 'pendente')),
  quantidade_estoque numeric(15, 4) not null default 0 check (quantidade_estoque >= 0),
  quantidade_os numeric(15, 4) not null default 0 check (quantidade_os >= 0),
  ordem_servico_id uuid references public.ordens_servico (id) on delete set null,
  ordem_servico_item_id uuid references public.ordem_servico_itens (id) on delete set null,
  estoque_movimentacao_id uuid references public.estoque_movimentacoes (id) on delete set null,
  status_vinculo text not null default 'pendente'
    check (status_vinculo in (
      'pendente',
      'sugerido',
      'vinculado',
      'criado',
      'despesa',
      'ignorado'
    )),
  motivo_ignorar text,
  dados_complementares jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint nfe_itens_destino_quantidade check (
    (destino = 'estoque' and quantidade_estoque = quantidade and quantidade_os = 0)
    or (destino = 'os' and quantidade_os = quantidade and quantidade_estoque = 0)
    or (destino = 'misto' and quantidade_estoque + quantidade_os = quantidade)
    or (destino in ('despesa', 'ignorar', 'pendente'))
  )
);

create unique index if not exists uq_nfe_itens_numero
  on public.notas_fiscais_entrada_itens (nota_fiscal_id, numero_item)
  where deleted_at is null;

create index if not exists idx_nfe_itens_nota
  on public.notas_fiscais_entrada_itens (tenant_id, nota_fiscal_id)
  where deleted_at is null;

create index if not exists idx_nfe_itens_produto
  on public.notas_fiscais_entrada_itens (tenant_id, produto_id)
  where deleted_at is null;

create index if not exists idx_nfe_itens_os
  on public.notas_fiscais_entrada_itens (tenant_id, ordem_servico_id)
  where deleted_at is null and ordem_servico_id is not null;

alter table public.notas_fiscais_entrada_itens enable row level security;

drop policy if exists "Membros gerenciam itens NF-e entrada"
  on public.notas_fiscais_entrada_itens;
create policy "Membros gerenciam itens NF-e entrada"
  on public.notas_fiscais_entrada_itens for all
  using (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = notas_fiscais_entrada_itens.tenant_id
        and tm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = notas_fiscais_entrada_itens.tenant_id
        and tm.user_id = auth.uid()
    )
  );

-- ============================================================
-- Eventos / auditoria
-- ============================================================
create table if not exists public.notas_fiscais_entrada_eventos (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  nota_fiscal_id uuid not null references public.notas_fiscais_entrada (id) on delete cascade,
  tipo text not null,
  descricao text not null,
  resultado text,
  referencia_tipo text,
  referencia_id uuid,
  payload jsonb not null default '{}'::jsonb,
  user_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_nfe_eventos_nota
  on public.notas_fiscais_entrada_eventos (tenant_id, nota_fiscal_id, created_at desc);

alter table public.notas_fiscais_entrada_eventos enable row level security;

drop policy if exists "Membros leem/escrevem eventos NF-e"
  on public.notas_fiscais_entrada_eventos;
create policy "Membros leem/escrevem eventos NF-e"
  on public.notas_fiscais_entrada_eventos for all
  using (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = notas_fiscais_entrada_eventos.tenant_id
        and tm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = notas_fiscais_entrada_eventos.tenant_id
        and tm.user_id = auth.uid()
    )
  );

-- ============================================================
-- Storage bucket privado (XML)
-- ============================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'nfe-entrada',
  'nfe-entrada',
  false,
  2097152, -- 2MB
  array['application/xml', 'text/xml']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "nfe_entrada_select_tenant" on storage.objects;
create policy "nfe_entrada_select_tenant"
  on storage.objects for select
  using (
    bucket_id = 'nfe-entrada'
    and exists (
      select 1 from public.tenant_members tm
      where tm.user_id = auth.uid()
        and tm.tenant_id::text = (storage.foldername(name))[1]
    )
  );

drop policy if exists "nfe_entrada_insert_tenant" on storage.objects;
create policy "nfe_entrada_insert_tenant"
  on storage.objects for insert
  with check (
    bucket_id = 'nfe-entrada'
    and exists (
      select 1 from public.tenant_members tm
      where tm.user_id = auth.uid()
        and tm.tenant_id::text = (storage.foldername(name))[1]
    )
  );

drop policy if exists "nfe_entrada_update_tenant" on storage.objects;
create policy "nfe_entrada_update_tenant"
  on storage.objects for update
  using (
    bucket_id = 'nfe-entrada'
    and exists (
      select 1 from public.tenant_members tm
      where tm.user_id = auth.uid()
        and tm.tenant_id::text = (storage.foldername(name))[1]
    )
  );

drop policy if exists "nfe_entrada_delete_tenant" on storage.objects;
create policy "nfe_entrada_delete_tenant"
  on storage.objects for delete
  using (
    bucket_id = 'nfe-entrada'
    and exists (
      select 1 from public.tenant_members tm
      where tm.user_id = auth.uid()
        and tm.tenant_id::text = (storage.foldername(name))[1]
    )
  );

comment on table public.notas_fiscais_entrada is
  'NF-e de entrada importadas por XML. Antiduplicidade: tenant_id+chave_acesso e tenant_id+xml_hash.';
comment on column public.notas_fiscais_entrada.xml_original is
  'XML armazenado de forma privada; nunca logar conteúdo completo.';
comment on table public.notas_fiscais_entrada_itens is
  'Itens da NF-e com destino estoque/OS/misto. Limite Gate 1: no máximo 1 OS por item.';
