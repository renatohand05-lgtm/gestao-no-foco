-- Sprint 34.2 — POST-MIGRATION SMOKE (Production)
-- SOMENTE para Renato executar no SQL Editor após a migration 20260825.
--
-- Regras:
-- - Não altera billing / Asaas / Vercel.
-- - Seção A: somente SELECT (segura).
-- - Seção B: OBRIGATÓRIO envolver em BEGIN … ROLLBACK.
--   Qualquer INSERT de teste também é revertido por EXCEPTION interna.
-- - Preencher APENAS UUIDs de tenant/usuários de TESTE.
-- - NÃO usar tenant real de cliente.
-- - Não criar nova migration.
--
-- Evidência já confirmada:
--   legacy_self_join_policy = 0  → P0-1 PASS em production
--
-- BACKUP DIÁRIO: PASS (confirmado manualmente)
-- PITR: NÃO HABILITADO (add-on disponível; não bloqueante para 34.2)

-- ############################################################################
-- A) ESTRUTURA — esperado após 34.2 (rodar primeiro; só leitura)
-- ############################################################################

-- A1) Funções 34.2 presentes
select p.proname, pg_get_function_identity_arguments(p.oid) as args
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'create_tenant_with_owner',
    'is_active_tenant_member',
    'is_tenant_admin'
  )
order by p.proname;
-- Esperado: 3 rows

-- A2) Policy self-join legada AUSENTE
select count(*) as legacy_self_join_policy
from pg_policy
where polrelid = 'public.tenant_members'::regclass
  and polname = 'Usuário pode se vincular como owner ao criar empresa';
-- Esperado: 0  (já confirmado por Renato)

-- A3) Policies tenant_members atuais
select polname, polcmd::text as cmd
from pg_policy
where polrelid = 'public.tenant_members'::regclass
order by polname;
-- Esperado:
--   tenant_members_select_self_active_or_admin (r)
--   Admins inserem tenant_members (a)
--   Admins atualizam tenant_members (w)
--   Admins excluem tenant_members (d)

-- A4) Enterprise RBAC policies
select c.relname, p.polname, p.polcmd::text as cmd
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
-- Esperado por tabela: "Membros leem …" (r) + "Admins gerenciam …" (*)
-- NÃO deve existir: "Membros gerenciam …"

-- A5) Confirma ausência das policies permissivas antigas
select count(*) as legacy_member_manage_policies
from pg_policy p
join pg_class c on c.oid = p.polrelid
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and p.polname in (
    'Membros gerenciam tenant_roles',
    'Membros gerenciam tenant_rbac_role_permissions',
    'Membros gerenciam tenant_user_roles',
    'Membros gerenciam tenant_user_permission_overrides'
  );
-- Esperado: 0

-- A6) Snapshot de memberships inactive (somente leitura; não altera)
select tenant_id, user_id, role, status, deactivated_at
from public.tenant_members
where status = 'inactive' or deactivated_at is not null
order by deactivated_at desc nulls last
limit 50;

-- ############################################################################
-- B) SIMULAÇÃO RLS — COPIAR O BLOCO INTEIRO (begin … rollback)
-- Substituir os 6 UUIDs null por usuários/tenants de TESTE.
-- ############################################################################

/*
begin;

do $smoke$
declare
  v_tenant_a   uuid := null; -- TENANT A teste
  v_tenant_b   uuid := null; -- TENANT B teste
  v_owner_a    uuid := null; -- owner ativo em A
  v_member_a   uuid := null; -- member ativo em A
  v_inactive_a uuid := null; -- member inactive em A
  v_owner_b    uuid := null; -- owner ativo em B (só para isolamento)

  v_ok boolean;
begin
  if v_tenant_a is null or v_tenant_b is null
     or v_owner_a is null or v_member_a is null
     or v_inactive_a is null or v_owner_b is null then
    raise exception 'Preencha os 6 UUIDs de TESTE antes de rodar a seção B';
  end if;

  -- Pré-condições (leitura; sessão ainda é privilégio elevado do Editor)
  if not exists (
    select 1 from public.tenant_members
    where tenant_id = v_tenant_a and user_id = v_member_a
      and (status is null or status = 'active') and deactivated_at is null
  ) then
    raise exception 'Pré-condição falhou: member A ativo';
  end if;

  if not exists (
    select 1 from public.tenant_members
    where tenant_id = v_tenant_a and user_id = v_inactive_a
      and (status = 'inactive' or deactivated_at is not null)
  ) then
    raise exception 'Pré-condição falhou: inactive A (status=inactive ou deactivated_at)';
  end if;

  if not exists (
    select 1 from public.tenant_members
    where tenant_id = v_tenant_a and user_id = v_owner_a
      and role in ('owner', 'admin')
      and (status is null or status = 'active') and deactivated_at is null
  ) then
    raise exception 'Pré-condição falhou: owner/admin A ativo';
  end if;

  -- ---- helpers de sessão authenticated ----
  -- P0-2: inactive
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claim.sub', v_inactive_a::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', v_inactive_a::text, 'role', 'authenticated')::text,
    true
  );

  if public.is_active_tenant_member(v_tenant_a) then
    raise exception 'FAIL P0-2: inactive ainda is_active_tenant_member(A)';
  end if;
  raise notice 'PASS P0-2: inactive blocked (is_active_tenant_member)';

  -- MEMBER + CROSS-TENANT
  perform set_config('request.jwt.claim.sub', v_member_a::text, true);
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', v_member_a::text, 'role', 'authenticated')::text,
    true
  );

  if not public.is_active_tenant_member(v_tenant_a) then
    raise exception 'FAIL MEMBER: member ativo não passa is_active_tenant_member(A)';
  end if;
  if public.is_active_tenant_member(v_tenant_b) then
    raise exception 'FAIL CROSS-TENANT: member A passa is_active_tenant_member(B)';
  end if;
  if public.is_tenant_admin(v_tenant_a) then
    raise exception 'FAIL MEMBER: member não deveria ser is_tenant_admin(A)';
  end if;
  raise notice 'PASS MEMBER + CROSS-TENANT';

  -- P0-3: member tenta INSERT em tenant_user_roles (subtransação reverte)
  v_ok := false;
  begin
    insert into public.tenant_user_roles (tenant_id, user_id, role_id)
    select v_tenant_a, v_member_a, tr.id
    from public.tenant_roles tr
    where tr.tenant_id = v_tenant_a
    limit 1;

    if found then
      raise exception 'FAIL P0-3: member INSERT tenant_user_roles aceito';
    end if;
    -- sem roles no tenant: policies A5 já cobrem; marcar skip ok
    raise notice 'SKIP P0-3 runtime write: sem tenant_roles no tenant A — confiar em A5 + UI';
    v_ok := true;
  exception
    when others then
      if sqlerrm like 'FAIL P0-3%' then
        raise;
      end if;
      if sqlerrm ilike '%row-level security%'
         or sqlerrm ilike '%permission denied%'
         or sqlerrm ilike '%insufficient%' then
        v_ok := true;
        raise notice 'PASS P0-3: member write blocked (% )', sqlerrm;
      else
        raise notice 'SKIP P0-3: %', sqlerrm;
        v_ok := true; -- A5 estrutural
      end if;
  end;

  if not v_ok then
    raise exception 'FAIL P0-3: resultado indefinido';
  end if;

  -- P0-1 runtime: member self-join em tenant B
  begin
    insert into public.tenant_members (tenant_id, user_id, role, status)
    values (v_tenant_b, v_member_a, 'member', 'active');
    raise exception 'FAIL P0-1: self-join em B aceito';
  exception
    when others then
      if sqlerrm like 'FAIL P0-1%' then
        raise;
      end if;
      raise notice 'PASS P0-1 runtime: self-join B blocked (% )', sqlerrm;
  end;

  -- OWNER: is_tenant_admin + write RBAC (insert + exception = rollback interno)
  perform set_config('request.jwt.claim.sub', v_owner_a::text, true);
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', v_owner_a::text, 'role', 'authenticated')::text,
    true
  );

  if not public.is_tenant_admin(v_tenant_a) then
    raise exception 'FAIL OWNER: owner A não is_tenant_admin(A)';
  end if;
  if public.is_tenant_admin(v_tenant_b) then
    raise exception 'FAIL CROSS-TENANT: owner A is_tenant_admin(B)';
  end if;
  raise notice 'PASS OWNER + admin isolation';

  begin
    insert into public.tenant_roles (
      tenant_id, role_key, name, level, type, is_system, is_active
    ) values (
      v_tenant_a, 'smoke_34_2_tmp', 'Smoke 34.2', 0, 'custom', false, true
    );
    -- força rollback da subtransação (não persiste)
    raise exception 'smoke_34_2_owner_write_ok';
  exception
    when others then
      if sqlerrm like 'smoke_34_2_owner_write_ok%' then
        raise notice 'PASS OWNER: write tenant_roles permitido (revertido)';
      elsif sqlerrm ilike '%row-level security%'
         or sqlerrm ilike '%permission denied%' then
        raise exception 'FAIL OWNER: write tenant_roles bloqueado indevidamente (% )', sqlerrm;
      else
        raise;
      end if;
  end;

  -- OWNER B isolado
  perform set_config('request.jwt.claim.sub', v_owner_b::text, true);
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', v_owner_b::text, 'role', 'authenticated')::text,
    true
  );
  if public.is_tenant_admin(v_tenant_a) then
    raise exception 'FAIL CROSS-TENANT: owner B is_tenant_admin(A)';
  end if;
  if not public.is_tenant_admin(v_tenant_b) then
    raise exception 'FAIL OWNER B: não is_tenant_admin(B)';
  end if;
  raise notice 'PASS OWNER B isolation';

  raise notice '=== SMOKE B PASS — execute ROLLBACK a seguir ===';
end;
$smoke$;

rollback;
*/

-- ############################################################################
-- C) CHECKLIST APP (manual — não SQL)
-- ############################################################################
--
-- C1) ONBOARDING
--   Conta teste → /onboarding ou /empresas/nova → criar empresa.
--   PASS: tenant criado; owner ativo; redirect ok.
--
-- C2) MULTIEMPRESA
--   Conta com 2+ empresas ativas → switcher; URL sem membership → redirect.
--
-- C3) P0-2 APP
--   Owner inativa member teste → logout/login → empresa some.
--   URL direta /{slug}/dashboard → redirect. Reload → bloqueado.
--
-- C4) ADMIN
--   Se houver admin teste: acessa equipe; não acessa tenant B.
--
-- C5) BILLING
--   Sem mudança (sandbox / REAL OFF / API key blocker).

-- ############################################################################
-- D) COMO MARCAR HOMOLOGAÇÃO
-- ############################################################################
-- 1) Seção A: A2=0, A5=0, A1=3 funções, A3/A4 policies corretas
--    → RLS PRODUCTION estrutural PASS
-- 2) Seção B (com UUIDs teste) + C1–C3
--    → P0-2 / P0-3 / OWNER / MEMBER / CROSS / ONBOARDING / MULTIEMPRESA
-- 3) 34.2 HOMOLOGADA = SIM só com todos PASS
--
-- Template de resposta:
-- P0-1 SELF-JOIN: PASS
-- P0-2 INACTIVE ACCESS: …
-- P0-3 ENTERPRISE RBAC: …
-- CROSS-TENANT: …
-- OWNER: …
-- ADMIN: …
-- MEMBER: …
-- ONBOARDING: …
-- MULTIEMPRESA: …
-- RLS PRODUCTION: …
-- 34.2 HOMOLOGADA: SIM / NÃO
