-- Sprint 14 — CRM Enterprise (complemento: documentos + checklist)
-- Execute após 20260726_crm_enterprise.sql

/* ─── Checklist em tarefas ─────────────────────────────────── */

alter table public.cliente_tarefas
  add column if not exists checklist jsonb not null default '[]'::jsonb;

comment on column public.cliente_tarefas.checklist is
  'Array JSON [{ "id": "uuid", "label": "texto", "done": boolean }]';

/* ─── Documentos do cliente ────────────────────────────────── */

create table if not exists public.cliente_documentos (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  cliente_id uuid not null references public.clientes (id) on delete cascade,
  categoria text not null default 'outro'
    check (categoria in (
      'contrato', 'proposta', 'orcamento', 'os', 'identidade', 'outro'
    )),
  nome_arquivo text not null,
  descricao text,
  legenda text,
  storage_path text not null,
  mime_type text,
  tamanho_bytes bigint,
  sha256 text,
  referencia_tipo text,
  referencia_id uuid,
  uploaded_by uuid references public.profiles (id) on delete set null,
  deleted_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_cliente_documentos_cliente
  on public.cliente_documentos (tenant_id, cliente_id, created_at desc)
  where deleted_at is null;

alter table public.cliente_documentos enable row level security;

drop policy if exists "Membros gerenciam documentos CRM" on public.cliente_documentos;
create policy "Membros gerenciam documentos CRM"
  on public.cliente_documentos for all
  using (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = cliente_documentos.tenant_id and tm.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = cliente_documentos.tenant_id and tm.user_id = auth.uid()
    )
  );

comment on table public.cliente_documentos is 'Anexos e documentos vinculados ao cliente CRM';

/* ─── Storage bucket ─────────────────────────────────────────── */

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'cliente-documentos',
  'cliente-documentos',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']::text[]
)
on conflict (id) do update set
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

alter table public.cliente_agendamentos
  drop constraint if exists cliente_agendamentos_tipo_check;

alter table public.cliente_agendamentos
  add constraint cliente_agendamentos_tipo_check
  check (tipo in ('visita', 'ligacao', 'reuniao', 'whatsapp', 'cobranca', 'retorno', 'outro'));
