-- Sprint 34.2 — queries de diagnóstico (somente leitura)
-- Executar no SQL Editor ANTES/DEPOIS da migration.
-- NÃO altera dados.

-- 1) Policies atuais de tenant_members
select polname, polcmd, polpermissive, pg_get_expr(polqual, polrelid) as using_expr,
       pg_get_expr(polwithcheck, polrelid) as with_check
from pg_policy
where polrelid = 'public.tenant_members'::regclass
order by polname;

-- 2) Memberships inactive / deactivated
select tenant_id, user_id, role, status, deactivated_at, created_at
from public.tenant_members
where status = 'inactive'
   or deactivated_at is not null
order by deactivated_at desc nulls last
limit 200;

-- 3) Usuários com múltiplos tenants
select user_id, count(*) as tenants, count(*) filter (where status is null or status = 'active') as active_tenants
from public.tenant_members
group by user_id
having count(*) > 1
order by tenants desc
limit 100;

-- 4) Múltiplos owners por tenant
select tenant_id, count(*) as owners
from public.tenant_members
where role = 'owner'
  and (status is null or status = 'active')
  and deactivated_at is null
group by tenant_id
having count(*) > 1
order by owners desc;

-- 5) Roles inesperadas
select role, count(*)
from public.tenant_members
group by role
order by count(*) desc;

-- 6) Enterprise RBAC policies
select c.relname, p.polname, p.polcmd
from pg_policy p
join pg_class c on c.oid = p.polrelid
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in (
    'tenant_roles',
    'tenant_rbac_role_permissions',
    'tenant_user_roles',
    'tenant_user_permission_overrides'
  )
order by c.relname, p.polname;

-- 7) Funções 34.2 presentes?
select p.proname, pg_get_function_identity_arguments(p.oid) as args
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('create_tenant_with_owner', 'is_active_tenant_member', 'is_tenant_admin')
order by p.proname;

-- 8) Policy permissiva antiga ainda existe? (deve ser 0 após 34.2)
select count(*) as legacy_self_join_policy
from pg_policy
where polrelid = 'public.tenant_members'::regclass
  and polname = 'Usuário pode se vincular como owner ao criar empresa';
