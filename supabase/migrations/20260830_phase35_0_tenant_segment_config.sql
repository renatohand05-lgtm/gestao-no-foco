-- Sprint 35.0 — Segmentação de produto (aditivo / tenant-safe)
-- NÃO executar automaticamente em production — Renato aplica após revisão.
-- Não altera tenants.segment existentes (legado continua igual).

alter table public.tenants
  add column if not exists segment_version integer;

alter table public.tenants
  add column if not exists segment_config jsonb not null default '{}'::jsonb;

comment on column public.tenants.segment is
  'Modelo de negócio persistido (text). Pré-35.0: valores livres. 35.0: preferir ids de produto.';
comment on column public.tenants.segment_version is
  'Versão do motor de segmentação. NULL = comportamento legado (Sprint 35.0).';
comment on column public.tenants.segment_config is
  'Overrides tenant-safe (capabilities ligadas/desligadas). Nunca concede RBAC.';

-- Novos tenants passam a nascer com motor 35.0.
-- Assinatura da RPC permanece (text, text, text).
create or replace function public.create_tenant_with_owner(
  p_name text,
  p_slug text,
  p_segment text default null
)
returns table (out_tenant_id uuid, out_slug text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_tenant_id uuid;
  v_slug text;
  v_name text;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  v_name := trim(coalesce(p_name, ''));
  v_slug := lower(trim(coalesce(p_slug, '')));

  if v_name = '' or char_length(v_name) > 200 then
    raise exception 'invalid_tenant_name' using errcode = '22023';
  end if;

  if v_slug = '' or char_length(v_slug) > 80 or v_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' then
    raise exception 'invalid_tenant_slug' using errcode = '22023';
  end if;

  insert into public.tenants (name, slug, segment, segment_version, segment_config)
  values (
    v_name,
    v_slug,
    nullif(trim(coalesce(p_segment, '')), ''),
    1,
    '{}'::jsonb
  )
  returning id into v_tenant_id;

  insert into public.tenant_members (tenant_id, user_id, role, status)
  values (v_tenant_id, v_uid, 'owner', 'active');

  out_tenant_id := v_tenant_id;
  out_slug := v_slug;
  return next;
end;
$$;

comment on function public.create_tenant_with_owner(text, text, text) is
  'Sprint 34.2 + 35.0 — cria tenant + owner. segment_version=1 em empresas novas.';
