-- =============================================================================
-- Fase 28.4 — Ordem de Trabalho Universal (tipo_ordem + templates)
-- Idempotente · NÃO executar automaticamente
-- =============================================================================

alter table if exists public.ordens_servico
  add column if not exists tipo_ordem text not null default 'oficina';

alter table if exists public.ordens_servico
  add column if not exists template_key text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'ordens_servico_tipo_ordem_check'
  ) then
    alter table public.ordens_servico
      add constraint ordens_servico_tipo_ordem_check
      check (tipo_ordem in (
        'oficina',
        'assistencia_tecnica',
        'manutencao',
        'instalacao',
        'consultoria',
        'servicos_gerais',
        'producao_leve',
        'estetica',
        'lava_rapido'
      ));
  end if;
end $$;

comment on column public.ordens_servico.tipo_ordem is
  'Fase 28.4 — template operacional; oficina permanece default.';

create table if not exists public.ordem_trabalho_templates (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  key text not null,
  nome text not null,
  tipo_ordem text not null,
  campos_json jsonb not null default '{}'::jsonb,
  checklist_json jsonb not null default '[]'::jsonb,
  etapas_json jsonb not null default '[]'::jsonb,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (tenant_id, key)
);

create index if not exists idx_ot_templates_tenant
  on public.ordem_trabalho_templates (tenant_id)
  where deleted_at is null;

alter table public.ordem_trabalho_templates enable row level security;

drop policy if exists ot_templates_tenant_all on public.ordem_trabalho_templates;
create policy ot_templates_tenant_all on public.ordem_trabalho_templates
  for all using (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = ordem_trabalho_templates.tenant_id
        and tm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = ordem_trabalho_templates.tenant_id
        and tm.user_id = auth.uid()
    )
  );
