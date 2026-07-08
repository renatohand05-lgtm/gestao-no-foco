-- Gestão no Foco — Schema inicial multi-tenant
-- Execute no SQL Editor do Supabase ou via CLI

-- Perfis de usuário (espelha auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  avatar_url text,
  email text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Empresas (tenants)
create table if not exists public.tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  segment text,
  logo_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Membros por empresa
create table if not exists public.tenant_members (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'admin', 'manager', 'member')),
  created_at timestamptz not null default now(),
  unique (tenant_id, user_id)
);

-- Índices
create index if not exists idx_tenant_members_user_id on public.tenant_members (user_id);
create index if not exists idx_tenant_members_tenant_id on public.tenant_members (tenant_id);
create index if not exists idx_tenants_slug on public.tenants (slug);

-- Trigger: criar perfil ao registrar usuário
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', '')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- RLS
alter table public.profiles enable row level security;
alter table public.tenants enable row level security;
alter table public.tenant_members enable row level security;

-- Profiles: usuário vê e edita o próprio perfil
create policy "Usuários podem ver o próprio perfil"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Usuários podem atualizar o próprio perfil"
  on public.profiles for update
  using (auth.uid() = id);

-- Tenants: membros veem empresas das quais fazem parte
create policy "Membros veem suas empresas"
  on public.tenants for select
  using (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = tenants.id and tm.user_id = auth.uid()
    )
  );

create policy "Usuários autenticados podem criar empresas"
  on public.tenants for insert
  with check (auth.uid() is not null);

create policy "Owners e admins atualizam empresas"
  on public.tenants for update
  using (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = tenants.id
        and tm.user_id = auth.uid()
        and tm.role in ('owner', 'admin')
    )
  );

-- Tenant members (sem policies recursivas)
create policy "Usuários veem seus vínculos"
  on public.tenant_members for select
  using (auth.uid() = user_id);

create policy "Usuário pode se vincular como owner ao criar empresa"
  on public.tenant_members for insert
  with check (auth.uid() = user_id);
