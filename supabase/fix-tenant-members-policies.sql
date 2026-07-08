-- Correção incremental: policies recursivas em tenant_members
-- Execute no Supabase SQL Editor (não recria o banco)

-- Remove policies que consultam tenant_members dentro de tenant_members
drop policy if exists "Membros veem colegas da mesma empresa" on public.tenant_members;
drop policy if exists "Owners gerenciam membros" on public.tenant_members;

-- SELECT: usuário autenticado vê apenas os próprios vínculos
drop policy if exists "Usuários veem seus vínculos" on public.tenant_members;
create policy "Usuários veem seus vínculos"
  on public.tenant_members for select
  using (auth.uid() = user_id);

-- INSERT: usuário autenticado cria o próprio vínculo (onboarding como owner)
drop policy if exists "Usuário pode se vincular como owner ao criar empresa" on public.tenant_members;
create policy "Usuário pode se vincular como owner ao criar empresa"
  on public.tenant_members for insert
  with check (auth.uid() = user_id);
