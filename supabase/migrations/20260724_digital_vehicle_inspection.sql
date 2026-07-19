-- =============================================================================
-- Sprint 13.19.3 — Inspeção Digital do Veículo
-- EXECUÇÃO MANUAL — aguardar aprovação formal do CTO antes de aplicar.
-- Não altera DRE / Fluxo / estoque / faturamento.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 0) Texto padrão de aviso (tenant)
-- -----------------------------------------------------------------------------
create table if not exists public.oficina_textos (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  chave text not null,
  conteudo text not null,
  versao integer not null default 1,
  ativo boolean not null default true,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, chave, versao)
);

alter table public.oficina_textos enable row level security;

drop policy if exists "Membros gerenciam textos oficina" on public.oficina_textos;
create policy "Membros gerenciam textos oficina"
  on public.oficina_textos for all
  using (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = oficina_textos.tenant_id and tm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = oficina_textos.tenant_id and tm.user_id = auth.uid()
    )
  );

comment on table public.oficina_textos is 'Textos editáveis da oficina (aviso de orçamento, WhatsApp, etc).';

insert into public.oficina_textos (tenant_id, chave, conteudo, versao)
select
  t.id,
  'aviso_orcamento_previo',
  'Este orçamento é uma estimativa baseada na inspeção inicial do veículo. Durante a desmontagem, execução do serviço ou análise técnica mais aprofundada, poderão ser identificados defeitos, peças danificadas ou necessidades adicionais que não eram visíveis inicialmente. Caso isso ocorra, a oficina entrará em contato e solicitará nova aprovação antes de executar qualquer serviço adicional.',
  1
from public.tenants t
where not exists (
  select 1 from public.oficina_textos ot
  where ot.tenant_id = t.id and ot.chave = 'aviso_orcamento_previo' and ot.versao = 1
);

-- -----------------------------------------------------------------------------
-- 1) Checklist digital — colunas novas + classificação
-- -----------------------------------------------------------------------------
alter table public.ordem_servico_checklist
  add column if not exists categoria text;

alter table public.ordem_servico_checklist
  add column if not exists classificacao text;

alter table public.ordem_servico_checklist
  add column if not exists etapa_inspecao text not null default 'entrada';

alter table public.ordem_servico_checklist
  add column if not exists quilometragem numeric(12, 1);

alter table public.ordem_servico_checklist
  add column if not exists ordem integer not null default 0;

-- Migração legado status → classificação
update public.ordem_servico_checklist
set classificacao = case status
  when 'ok' then 'bom'
  when 'atencao' then 'atencao'
  when 'danificado' then 'critico'
  when 'ausente' then 'critico'
  when 'na' then 'nao_aplicavel'
  else coalesce(classificacao, 'nao_verificado')
end
where classificacao is null;

update public.ordem_servico_checklist
set classificacao = 'nao_verificado'
where classificacao is null;

alter table public.ordem_servico_checklist
  alter column classificacao set default 'nao_verificado';

do $$
begin
  begin
    alter table public.ordem_servico_checklist
      alter column classificacao set not null;
  exception when others then null;
  end;

  if not exists (
    select 1 from pg_constraint where conname = 'ordem_servico_checklist_classificacao_check'
  ) then
    alter table public.ordem_servico_checklist
      add constraint ordem_servico_checklist_classificacao_check
      check (classificacao in ('bom', 'atencao', 'critico', 'nao_verificado', 'nao_aplicavel'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'ordem_servico_checklist_etapa_check'
  ) then
    alter table public.ordem_servico_checklist
      add constraint ordem_servico_checklist_etapa_check
      check (etapa_inspecao in ('entrada', 'diagnostico', 'desmontagem', 'saida', 'outro'));
  end if;
end $$;

-- Ampliar check de status legado para aceitar novos valores sem quebrar
do $$
begin
  if exists (
    select 1 from pg_constraint where conname = 'ordem_servico_checklist_status_check'
  ) then
    alter table public.ordem_servico_checklist drop constraint ordem_servico_checklist_status_check;
  end if;
  alter table public.ordem_servico_checklist
    add constraint ordem_servico_checklist_status_check
    check (status in (
      'ok', 'atencao', 'danificado', 'ausente', 'na',
      'bom', 'critico', 'nao_verificado', 'nao_aplicavel'
    ));
exception when others then null;
end $$;

create unique index if not exists uq_os_checklist_item_ativo
  on public.ordem_servico_checklist (ordem_servico_id, item_codigo)
  where deleted_at is null;

update public.ordem_servico_checklist c
set categoria = case
  when c.item_codigo in ('pneus', 'rodas', 'estepe') then 'rodagem'
  when c.item_codigo in ('freios') then 'freios'
  when c.item_codigo in ('suspensao') then 'suspensao'
  when c.item_codigo in ('direcao') then 'direcao'
  when c.item_codigo in ('motor', 'fluidos', 'vazamentos', 'bateria') then 'mecanica'
  when c.item_codigo in ('transmissao') then 'transmissao'
  when c.item_codigo in ('sistema_eletrico', 'iluminacao', 'lanternas', 'farois') then 'eletrica'
  when c.item_codigo in ('vidros', 'retrovisores') then 'vidros'
  when c.item_codigo in ('lataria', 'para_choques') then 'lataria'
  when c.item_codigo in ('interior', 'painel', 'ar_condicionado') then 'interior'
  when c.item_codigo in ('documentos') then 'documentacao'
  when c.item_codigo in ('ferramentas', 'macaco', 'chave_roda') then 'acessorios'
  else coalesce(c.categoria, 'geral')
end
where c.categoria is null;

-- -----------------------------------------------------------------------------
-- 2) Diagnóstico — observações para o cliente
-- -----------------------------------------------------------------------------
alter table public.ordem_servico_diagnosticos
  add column if not exists observacoes_cliente text;

-- -----------------------------------------------------------------------------
-- 3) Anexos — vínculo checklist/diagnóstico + legenda
-- -----------------------------------------------------------------------------
alter table public.ordem_servico_anexos
  add column if not exists checklist_item_id uuid;

alter table public.ordem_servico_anexos
  add column if not exists diagnostico_id uuid;

alter table public.ordem_servico_anexos
  add column if not exists legenda text;

alter table public.ordem_servico_anexos
  add column if not exists observacao text;

alter table public.ordem_servico_anexos
  add column if not exists ordem integer not null default 0;

alter table public.ordem_servico_anexos
  add column if not exists sha256 text;

alter table public.ordem_servico_anexos
  add column if not exists largura integer;

alter table public.ordem_servico_anexos
  add column if not exists altura integer;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'ordem_servico_anexos_checklist_item_id_fkey'
  ) then
    begin
      alter table public.ordem_servico_anexos
        add constraint ordem_servico_anexos_checklist_item_id_fkey
        foreign key (checklist_item_id) references public.ordem_servico_checklist (id) on delete set null;
    exception when others then null;
    end;
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'ordem_servico_anexos_diagnostico_id_fkey'
  ) then
    begin
      alter table public.ordem_servico_anexos
        add constraint ordem_servico_anexos_diagnostico_id_fkey
        foreign key (diagnostico_id) references public.ordem_servico_diagnosticos (id) on delete set null;
    exception when others then null;
    end;
  end if;
end $$;

-- Ampliar etapas de anexo
do $$
begin
  if exists (
    select 1 from pg_constraint where conname = 'ordem_servico_anexos_etapa_check'
  ) then
    alter table public.ordem_servico_anexos drop constraint ordem_servico_anexos_etapa_check;
  end if;
  alter table public.ordem_servico_anexos
    add constraint ordem_servico_anexos_etapa_check
    check (etapa in (
      'entrada', 'diagnostico', 'orcamento', 'execucao',
      'conclusao', 'entrega', 'retorno', 'garantia',
      'sintoma', 'causa', 'recomendacao', 'peca_danificada',
      'antes_desmontagem', 'depois_desmontagem', 'outro'
    ));
exception when others then null;
end $$;

create index if not exists idx_os_anexos_checklist
  on public.ordem_servico_anexos (checklist_item_id)
  where deleted_at is null and checklist_item_id is not null;

create index if not exists idx_os_anexos_diagnostico
  on public.ordem_servico_anexos (diagnostico_id)
  where deleted_at is null and diagnostico_id is not null;

-- -----------------------------------------------------------------------------
-- 4) Versionamento de orçamento
-- -----------------------------------------------------------------------------
create table if not exists public.ordem_servico_orcamento_versoes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  ordem_servico_id uuid not null references public.ordens_servico (id) on delete cascade,
  versao integer not null,
  status text not null default 'rascunho'
    check (status in (
      'rascunho', 'publicado', 'aguardando_aprovacao', 'aprovado',
      'parcialmente_aprovado', 'reprovado', 'supersedido', 'expirado'
    )),
  subtotal numeric(14, 2) not null default 0,
  desconto_total numeric(14, 2) not null default 0,
  acrescimo_total numeric(14, 2) not null default 0,
  valor_total numeric(14, 2) not null default 0,
  prazo_estimado_dias integer,
  aviso_texto text not null,
  aviso_versao integer not null default 1,
  validade_ate timestamptz,
  publicado_em timestamptz,
  publicado_por uuid,
  supersede_de uuid references public.ordem_servico_orcamento_versoes (id) on delete set null,
  justificativa_revisao text,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (ordem_servico_id, versao)
);

create table if not exists public.ordem_servico_orcamento_itens (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  versao_id uuid not null references public.ordem_servico_orcamento_versoes (id) on delete cascade,
  item_origem_id uuid references public.ordem_servico_itens (id) on delete set null,
  descricao text not null,
  tipo_item text not null,
  categoria_item text not null,
  quantidade numeric(14, 3) not null default 1,
  valor_unitario numeric(14, 2) not null default 0,
  desconto numeric(14, 2) not null default 0,
  acrescimo numeric(14, 2) not null default 0,
  valor_total numeric(14, 2) not null default 0,
  produto_id uuid,
  recomendacao text not null default 'recomendado'
    check (recomendacao in ('recomendado', 'obrigatorio', 'opcional')),
  prazo_peca text,
  disponibilidade text,
  ordem integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_os_orc_versoes_os
  on public.ordem_servico_orcamento_versoes (ordem_servico_id, versao desc)
  where deleted_at is null;

create index if not exists idx_os_orc_itens_versao
  on public.ordem_servico_orcamento_itens (versao_id);

alter table public.ordem_servico_orcamento_versoes enable row level security;
alter table public.ordem_servico_orcamento_itens enable row level security;

drop policy if exists "Membros gerenciam orcamento versoes" on public.ordem_servico_orcamento_versoes;
create policy "Membros gerenciam orcamento versoes"
  on public.ordem_servico_orcamento_versoes for all
  using (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = ordem_servico_orcamento_versoes.tenant_id and tm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = ordem_servico_orcamento_versoes.tenant_id and tm.user_id = auth.uid()
    )
  );

drop policy if exists "Membros gerenciam orcamento itens" on public.ordem_servico_orcamento_itens;
create policy "Membros gerenciam orcamento itens"
  on public.ordem_servico_orcamento_itens for all
  using (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = ordem_servico_orcamento_itens.tenant_id and tm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = ordem_servico_orcamento_itens.tenant_id and tm.user_id = auth.uid()
    )
  );

comment on table public.ordem_servico_orcamento_versoes is 'Snapshots imutáveis de orçamento prévio (v1, v2…). Não gera receita.';
comment on table public.ordem_servico_orcamento_itens is 'Itens do snapshot de orçamento — valores reais, sem inventar margem.';

-- -----------------------------------------------------------------------------
-- 5) Compartilhamento / tokens
-- -----------------------------------------------------------------------------
create table if not exists public.ordem_servico_compartilhamentos (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  ordem_servico_id uuid not null references public.ordens_servico (id) on delete cascade,
  versao_orcamento_id uuid references public.ordem_servico_orcamento_versoes (id) on delete set null,
  token_hash text not null unique,
  token_prefix text not null,
  canal text not null default 'link'
    check (canal in ('link', 'email', 'whatsapp', 'pdf', 'outro')),
  destinatario text,
  status text not null default 'ativo'
    check (status in ('ativo', 'revogado', 'expirado')),
  expira_em timestamptz not null,
  revogado_em timestamptz,
  visualizacoes integer not null default 0,
  ultima_visualizacao_em timestamptz,
  criado_por uuid,
  mensagem_template text,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ordem_servico_compartilhamento_views (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  compartilhamento_id uuid not null references public.ordem_servico_compartilhamentos (id) on delete cascade,
  ip_hash text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists idx_os_share_prefix
  on public.ordem_servico_compartilhamentos (token_prefix)
  where deleted_at is null;

create index if not exists idx_os_share_os
  on public.ordem_servico_compartilhamentos (ordem_servico_id)
  where deleted_at is null;

alter table public.ordem_servico_compartilhamentos enable row level security;
alter table public.ordem_servico_compartilhamento_views enable row level security;

drop policy if exists "Membros gerenciam compartilhamentos OS" on public.ordem_servico_compartilhamentos;
create policy "Membros gerenciam compartilhamentos OS"
  on public.ordem_servico_compartilhamentos for all
  using (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = ordem_servico_compartilhamentos.tenant_id and tm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = ordem_servico_compartilhamentos.tenant_id and tm.user_id = auth.uid()
    )
  );

drop policy if exists "Membros leem views compartilhamento" on public.ordem_servico_compartilhamento_views;
create policy "Membros leem views compartilhamento"
  on public.ordem_servico_compartilhamento_views for select
  using (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = ordem_servico_compartilhamento_views.tenant_id and tm.user_id = auth.uid()
    )
  );

comment on table public.ordem_servico_compartilhamentos is 'Links públicos de inspeção — token_hash, nunca o token em claro.';

-- -----------------------------------------------------------------------------
-- 6) Aprovações públicas (imutáveis por versão)
-- -----------------------------------------------------------------------------
create table if not exists public.ordem_servico_aprovacoes (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  ordem_servico_id uuid not null references public.ordens_servico (id) on delete cascade,
  versao_orcamento_id uuid not null references public.ordem_servico_orcamento_versoes (id) on delete restrict,
  compartilhamento_id uuid references public.ordem_servico_compartilhamentos (id) on delete set null,
  modo text not null check (modo in ('total', 'parcial', 'reprovar', 'contato')),
  canal text not null default 'link',
  nome_informado text,
  observacao_cliente text,
  aceite_aviso boolean not null default false,
  aviso_versao integer not null default 1,
  ip_hash text,
  user_agent text,
  created_at timestamptz not null default now()
);

create table if not exists public.ordem_servico_aprovacao_itens (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  aprovacao_id uuid not null references public.ordem_servico_aprovacoes (id) on delete cascade,
  orcamento_item_id uuid not null references public.ordem_servico_orcamento_itens (id) on delete restrict,
  item_origem_id uuid references public.ordem_servico_itens (id) on delete set null,
  decisao text not null check (decisao in ('aprovado', 'reprovado')),
  created_at timestamptz not null default now()
);

create index if not exists idx_os_aprovacoes_versao
  on public.ordem_servico_aprovacoes (versao_orcamento_id, created_at desc);

alter table public.ordem_servico_aprovacoes enable row level security;
alter table public.ordem_servico_aprovacao_itens enable row level security;

drop policy if exists "Membros leem aprovacoes OS" on public.ordem_servico_aprovacoes;
create policy "Membros leem aprovacoes OS"
  on public.ordem_servico_aprovacoes for select
  using (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = ordem_servico_aprovacoes.tenant_id and tm.user_id = auth.uid()
    )
  );

drop policy if exists "Membros inserem aprovacoes OS" on public.ordem_servico_aprovacoes;
create policy "Membros inserem aprovacoes OS"
  on public.ordem_servico_aprovacoes for insert
  with check (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = ordem_servico_aprovacoes.tenant_id and tm.user_id = auth.uid()
    )
  );

drop policy if exists "Membros leem aprovacao itens" on public.ordem_servico_aprovacao_itens;
create policy "Membros leem aprovacao itens"
  on public.ordem_servico_aprovacao_itens for select
  using (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = ordem_servico_aprovacao_itens.tenant_id and tm.user_id = auth.uid()
    )
  );

drop policy if exists "Membros inserem aprovacao itens" on public.ordem_servico_aprovacao_itens;
create policy "Membros inserem aprovacao itens"
  on public.ordem_servico_aprovacao_itens for insert
  with check (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = ordem_servico_aprovacao_itens.tenant_id and tm.user_id = auth.uid()
    )
  );

comment on table public.ordem_servico_aprovacoes is 'Aprovação imutável vinculada a uma versão de orçamento.';

-- -----------------------------------------------------------------------------
-- 7) Storage bucket privado
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'os-inspecao',
  'os-inspecao',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Path: {tenant_id}/os/{ordem_servico_id}/{file}
drop policy if exists "Membros leem fotos OS inspecao" on storage.objects;
create policy "Membros leem fotos OS inspecao"
  on storage.objects for select
  using (
    bucket_id = 'os-inspecao'
    and exists (
      select 1 from public.tenant_members tm
      where tm.user_id = auth.uid()
        and tm.tenant_id::text = (storage.foldername(name))[1]
    )
  );

drop policy if exists "Membros enviam fotos OS inspecao" on storage.objects;
create policy "Membros enviam fotos OS inspecao"
  on storage.objects for insert
  with check (
    bucket_id = 'os-inspecao'
    and exists (
      select 1 from public.tenant_members tm
      where tm.user_id = auth.uid()
        and tm.tenant_id::text = (storage.foldername(name))[1]
    )
  );

drop policy if exists "Membros atualizam fotos OS inspecao" on storage.objects;
create policy "Membros atualizam fotos OS inspecao"
  on storage.objects for update
  using (
    bucket_id = 'os-inspecao'
    and exists (
      select 1 from public.tenant_members tm
      where tm.user_id = auth.uid()
        and tm.tenant_id::text = (storage.foldername(name))[1]
    )
  );

drop policy if exists "Membros removem fotos OS inspecao" on storage.objects;
create policy "Membros removem fotos OS inspecao"
  on storage.objects for delete
  using (
    bucket_id = 'os-inspecao'
    and exists (
      select 1 from public.tenant_members tm
      where tm.user_id = auth.uid()
        and tm.tenant_id::text = (storage.foldername(name))[1]
    )
  );

-- -----------------------------------------------------------------------------
-- 8) RPCs públicas (SECURITY DEFINER) — sem vazar outros tenants
-- -----------------------------------------------------------------------------
create extension if not exists pgcrypto with schema extensions;

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

revoke all on function public.inspecao_publica_por_token(text) from public;
grant execute on function public.inspecao_publica_por_token(text) to anon, authenticated;

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

revoke all on function public.inspecao_publica_detalhes(text) from public;
grant execute on function public.inspecao_publica_detalhes(text) to anon, authenticated;

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
    -- Reprovado → volta para revisão de orçamento (status oficial)
    v_status_os := 'aguardando_orcamento';
  else
    -- parcial
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

  -- Status OS: apenas se origem for aguardando_aprovacao (evita saltos ilegais)
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

revoke all on function public.inspecao_publica_aprovar(text, text, text, text, boolean, jsonb, text, text) from public;
grant execute on function public.inspecao_publica_aprovar(text, text, text, text, boolean, jsonb, text, text) to anon, authenticated;

notify pgrst, 'reload schema';
