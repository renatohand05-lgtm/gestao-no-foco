-- Migration: Sprint 21.6 / RC3 — RPCs Enterprise
-- Outbox mutações: SECURITY DEFINER (RLS bloqueia UPDATE de members) + assert_tenant_member
-- Save definitions / idempotency: DEFINER com validação de tenant
-- Approval decision: INVOKER (tabelas permitem insert/update a members)
--
-- search_path fixo em todas. REVOKE PUBLIC. GRANT authenticated.
--
-- RC3: guarda de pré-requisitos (tabelas das migrations 1–6) antes de CREATE FUNCTION.
-- Save_* retorna jsonb (evita "type X does not exist" se order errada / apply parcial).

do $$
begin
  if to_regclass('public.audit_events') is null then
    raise exception 'RC3: aplique 20260807_enterprise_audit.sql antes de enterprise_rpc.';
  end if;
  if to_regclass('public.workflow_definitions') is null then
    raise exception 'RC3: aplique 20260807_enterprise_workflow.sql antes de enterprise_rpc (workflow_definitions ausente).';
  end if;
  if to_regclass('public.approval_definitions') is null then
    raise exception 'RC3: aplique 20260807_enterprise_approval.sql antes de enterprise_rpc.';
  end if;
  if to_regclass('public.notification_templates') is null then
    raise exception 'RC3: aplique 20260807_enterprise_notifications.sql antes de enterprise_rpc.';
  end if;
  if to_regclass('public.enterprise_outbox') is null
     or to_regclass('public.enterprise_idempotency_keys') is null then
    raise exception 'RC3: aplique 20260807_enterprise_outbox_idempotency.sql antes de enterprise_rpc.';
  end if;
  if to_regprocedure('public.assert_tenant_member(uuid)') is null then
    raise exception 'RC3: assert_tenant_member(uuid) ausente (migration 20260708).';
  end if;
end;
$$;

-- ═══════════════════════════════════════════════════════════════
-- OUTBOX — claim / complete / fail / release
-- ═══════════════════════════════════════════════════════════════

create or replace function public.enterprise_claim_outbox_batch(
  p_tenant_id uuid,
  p_processor_id text,
  p_limit integer default 10,
  p_lock_ttl_seconds integer default 60
)
returns setof public.enterprise_outbox
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if p_processor_id is null or char_length(trim(p_processor_id)) = 0 then
    raise exception 'processor_id obrigatório.';
  end if;

  perform public.assert_tenant_member(p_tenant_id);

  update public.enterprise_outbox
  set status = 'pending',
      locked_at = null,
      locked_by = null,
      updated_at = now()
  where tenant_id = p_tenant_id
    and status = 'processing'
    and locked_at is not null
    and locked_at < now() - make_interval(secs => greatest(coalesce(p_lock_ttl_seconds, 60), 1));

  return query
  with picked as (
    select e.id
    from public.enterprise_outbox e
    where e.tenant_id = p_tenant_id
      and e.status = 'pending'
      and e.available_at <= now()
    order by e.created_at asc
    for update skip locked
    limit greatest(coalesce(p_limit, 10), 1)
  )
  update public.enterprise_outbox o
  set status = 'processing',
      locked_at = now(),
      locked_by = trim(p_processor_id),
      attempts = o.attempts + 1,
      updated_at = now()
  from picked
  where o.id = picked.id
    and o.tenant_id = p_tenant_id
    and o.status = 'pending'
  returning o.*;
end;
$$;

create or replace function public.enterprise_complete_outbox_event(
  p_tenant_id uuid,
  p_event_id uuid,
  p_processor_id text
)
returns public.enterprise_outbox
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_row public.enterprise_outbox;
begin
  if p_processor_id is null or char_length(trim(p_processor_id)) = 0 then
    raise exception 'processor_id obrigatório.';
  end if;
  perform public.assert_tenant_member(p_tenant_id);

  update public.enterprise_outbox
  set status = 'completed',
      processed_at = now(),
      locked_at = null,
      locked_by = null,
      updated_at = now(),
      last_error = null
  where id = p_event_id
    and tenant_id = p_tenant_id
    and status = 'processing'
    and locked_by = trim(p_processor_id)
  returning * into v_row;

  if not found then
    raise exception 'Outbox event não encontrado, não está processing ou lock pertence a outro processor.';
  end if;
  return v_row;
end;
$$;

create or replace function public.enterprise_fail_outbox_event(
  p_tenant_id uuid,
  p_event_id uuid,
  p_processor_id text,
  p_error text,
  p_retry boolean default true
)
returns public.enterprise_outbox
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_cur public.enterprise_outbox;
  v_row public.enterprise_outbox;
  v_status text;
  v_available timestamptz;
begin
  if p_processor_id is null or char_length(trim(p_processor_id)) = 0 then
    raise exception 'processor_id obrigatório.';
  end if;
  perform public.assert_tenant_member(p_tenant_id);

  select * into v_cur
  from public.enterprise_outbox
  where id = p_event_id and tenant_id = p_tenant_id
  for update;

  if not found then
    raise exception 'Outbox event não encontrado.';
  end if;
  if v_cur.status <> 'processing' or v_cur.locked_by is distinct from trim(p_processor_id) then
    raise exception 'Somente o processor detentor do lock pode falhar o evento.';
  end if;

  if p_retry and v_cur.attempts < v_cur.max_attempts then
    v_status := 'pending';
    v_available := now() + make_interval(mins => greatest(v_cur.attempts, 1));
  elsif v_cur.attempts >= v_cur.max_attempts then
    v_status := 'dead';
    v_available := v_cur.available_at;
  else
    v_status := 'failed';
    v_available := v_cur.available_at;
  end if;

  update public.enterprise_outbox
  set status = v_status,
      last_error = left(coalesce(p_error, 'error'), 2000),
      locked_at = null,
      locked_by = null,
      available_at = v_available,
      updated_at = now()
  where id = p_event_id and tenant_id = p_tenant_id
  returning * into v_row;

  return v_row;
end;
$$;

create or replace function public.enterprise_release_outbox_locks(
  p_tenant_id uuid,
  p_lock_ttl_seconds integer default 60
)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_count integer;
begin
  perform public.assert_tenant_member(p_tenant_id);

  update public.enterprise_outbox
  set status = 'pending',
      locked_at = null,
      locked_by = null,
      updated_at = now()
  where tenant_id = p_tenant_id
    and status = 'processing'
    and locked_at is not null
    and locked_at < now() - make_interval(secs => greatest(coalesce(p_lock_ttl_seconds, 60), 1));

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- ═══════════════════════════════════════════════════════════════
-- IDEMPOTENCY — resolução atómica
-- ═══════════════════════════════════════════════════════════════

create or replace function public.enterprise_resolve_idempotency(
  p_tenant_id uuid,
  p_idempotency_key text,
  p_operation text,
  p_request_hash text,
  p_response_snapshot jsonb default null,
  p_ttl_minutes integer default 1440
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_row public.enterprise_idempotency_keys;
  v_now timestamptz := now();
begin
  perform public.assert_tenant_member(p_tenant_id);

  if p_idempotency_key is null or char_length(trim(p_idempotency_key)) = 0 then
    raise exception 'idempotency_key obrigatória.';
  end if;

  select * into v_row
  from public.enterprise_idempotency_keys
  where tenant_id = p_tenant_id
    and idempotency_key = trim(p_idempotency_key)
    and operation = trim(p_operation)
  for update;

  if found then
    if v_row.expires_at is not null and v_row.expires_at < v_now then
      delete from public.enterprise_idempotency_keys where id = v_row.id;
    elsif v_row.request_hash <> p_request_hash then
      return jsonb_build_object(
        'status', 'conflict',
        'hit', true,
        'conflict', true,
        'record_id', v_row.id
      );
    elsif v_row.status = 'completed' and v_row.response_snapshot is not null then
      return jsonb_build_object(
        'status', 'replay',
        'hit', true,
        'conflict', false,
        'response_snapshot', v_row.response_snapshot,
        'record_id', v_row.id
      );
    elsif v_row.status = 'processing' then
      return jsonb_build_object(
        'status', 'in_flight',
        'hit', true,
        'conflict', false,
        'record_id', v_row.id
      );
    end if;
  end if;

  if p_response_snapshot is null then
    insert into public.enterprise_idempotency_keys (
      tenant_id, idempotency_key, operation, request_hash, status, expires_at
    ) values (
      p_tenant_id, trim(p_idempotency_key), trim(p_operation), p_request_hash,
      'processing', v_now + make_interval(mins => greatest(p_ttl_minutes, 1))
    )
    on conflict (tenant_id, idempotency_key, operation) do nothing
    returning * into v_row;

    if not found then
      -- race: another worker inserted
      select * into v_row
      from public.enterprise_idempotency_keys
      where tenant_id = p_tenant_id
        and idempotency_key = trim(p_idempotency_key)
        and operation = trim(p_operation);
      if v_row.request_hash <> p_request_hash then
        return jsonb_build_object('status', 'conflict', 'hit', true, 'conflict', true);
      end if;
      if v_row.status = 'completed' then
        return jsonb_build_object(
          'status', 'replay', 'hit', true, 'conflict', false,
          'response_snapshot', v_row.response_snapshot
        );
      end if;
      return jsonb_build_object('status', 'in_flight', 'hit', true, 'conflict', false);
    end if;

    return jsonb_build_object(
      'status', 'proceed',
      'hit', false,
      'conflict', false,
      'record_id', v_row.id
    );
  end if;

  insert into public.enterprise_idempotency_keys (
    tenant_id, idempotency_key, operation, request_hash,
    response_snapshot, status, expires_at
  ) values (
    p_tenant_id, trim(p_idempotency_key), trim(p_operation), p_request_hash,
    p_response_snapshot, 'completed',
    v_now + make_interval(mins => greatest(p_ttl_minutes, 1))
  )
  on conflict (tenant_id, idempotency_key, operation) do update
  set response_snapshot = excluded.response_snapshot,
      status = 'completed',
      request_hash = excluded.request_hash,
      updated_at = now(),
      expires_at = excluded.expires_at
  where enterprise_idempotency_keys.request_hash = excluded.request_hash
  returning * into v_row;

  if not found then
    return jsonb_build_object('status', 'conflict', 'hit', true, 'conflict', true);
  end if;

  return jsonb_build_object(
    'status', 'stored',
    'hit', false,
    'conflict', false,
    'record_id', v_row.id,
    'response_snapshot', v_row.response_snapshot
  );
end;
$$;

-- ═══════════════════════════════════════════════════════════════
-- SAVE DEFINITIONS (tenant-scoped) — sem upsert genérico PostgREST
-- Retorno jsonb (RC3): não depende do composite type no CREATE FUNCTION
-- ═══════════════════════════════════════════════════════════════

drop function if exists public.enterprise_save_workflow_definition(uuid, text, text, text, jsonb, text, text, boolean);

create or replace function public.enterprise_save_workflow_definition(
  p_tenant_id uuid,
  p_workflow_key text,
  p_version text,
  p_name text,
  p_definition jsonb,
  p_description text default null,
  p_status text default 'active',
  p_is_active boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_row public.workflow_definitions%rowtype;
begin
  if p_tenant_id is null then
    raise exception 'Definições globais não são graváveis via RPC autenticada. Use seed SQL / service role.';
  end if;
  perform public.assert_tenant_member(p_tenant_id);

  select * into v_row
  from public.workflow_definitions
  where tenant_id = p_tenant_id
    and workflow_key = trim(p_workflow_key)
    and version = trim(p_version)
  for update;

  if found then
    update public.workflow_definitions
    set name = p_name,
        description = p_description,
        definition = coalesce(p_definition, '{}'::jsonb),
        status = coalesce(p_status, 'active'),
        is_active = coalesce(p_is_active, true),
        updated_at = now()
    where id = v_row.id
    returning * into v_row;
  else
    insert into public.workflow_definitions (
      tenant_id, workflow_key, version, name, description, definition, status, is_active
    ) values (
      p_tenant_id, trim(p_workflow_key), trim(p_version), p_name, p_description,
      coalesce(p_definition, '{}'::jsonb), coalesce(p_status, 'active'), coalesce(p_is_active, true)
    )
    returning * into v_row;
  end if;
  return to_jsonb(v_row);
end;
$$;

drop function if exists public.enterprise_save_approval_definition(uuid, text, text, text, jsonb, text, text, boolean);

create or replace function public.enterprise_save_approval_definition(
  p_tenant_id uuid,
  p_approval_key text,
  p_version text,
  p_name text,
  p_definition jsonb,
  p_description text default null,
  p_status text default 'active',
  p_is_active boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_row public.approval_definitions%rowtype;
begin
  if p_tenant_id is null then
    raise exception 'Definições globais não são graváveis via RPC autenticada. Use seed SQL / service role.';
  end if;
  perform public.assert_tenant_member(p_tenant_id);

  select * into v_row
  from public.approval_definitions
  where tenant_id = p_tenant_id
    and approval_key = trim(p_approval_key)
    and version = trim(p_version)
  for update;

  if found then
    update public.approval_definitions
    set name = p_name,
        description = p_description,
        definition = coalesce(p_definition, '{}'::jsonb),
        status = coalesce(p_status, 'active'),
        is_active = coalesce(p_is_active, true),
        updated_at = now()
    where id = v_row.id
    returning * into v_row;
  else
    insert into public.approval_definitions (
      tenant_id, approval_key, version, name, description, definition, status, is_active
    ) values (
      p_tenant_id, trim(p_approval_key), trim(p_version), p_name, p_description,
      coalesce(p_definition, '{}'::jsonb), coalesce(p_status, 'active'), coalesce(p_is_active, true)
    )
    returning * into v_row;
  end if;
  return to_jsonb(v_row);
end;
$$;

drop function if exists public.enterprise_save_notification_template(uuid, text, text, text, text, text, text, jsonb, jsonb, jsonb, boolean);

create or replace function public.enterprise_save_notification_template(
  p_tenant_id uuid,
  p_template_key text,
  p_version text,
  p_event text,
  p_category text,
  p_title_template text,
  p_message_template text,
  p_supported_channels jsonb default '[]'::jsonb,
  p_variables_schema jsonb default '[]'::jsonb,
  p_metadata jsonb default '{}'::jsonb,
  p_is_active boolean default true
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_row public.notification_templates%rowtype;
begin
  if p_tenant_id is null then
    raise exception 'Templates globais não são graváveis via RPC autenticada. Use seed SQL / service role.';
  end if;
  perform public.assert_tenant_member(p_tenant_id);

  select * into v_row
  from public.notification_templates
  where tenant_id = p_tenant_id
    and template_key = trim(p_template_key)
    and version = trim(p_version)
  for update;

  if found then
    update public.notification_templates
    set event = p_event,
        category = p_category,
        title_template = p_title_template,
        message_template = p_message_template,
        supported_channels = coalesce(p_supported_channels, '[]'::jsonb),
        variables_schema = coalesce(p_variables_schema, '[]'::jsonb),
        metadata = coalesce(p_metadata, '{}'::jsonb),
        is_active = coalesce(p_is_active, true),
        updated_at = now()
    where id = v_row.id
    returning * into v_row;
  else
    insert into public.notification_templates (
      tenant_id, template_key, version, event, category,
      supported_channels, title_template, message_template,
      variables_schema, metadata, is_active
    ) values (
      p_tenant_id, trim(p_template_key), trim(p_version), p_event, p_category,
      coalesce(p_supported_channels, '[]'::jsonb), p_title_template, p_message_template,
      coalesce(p_variables_schema, '[]'::jsonb), coalesce(p_metadata, '{}'::jsonb),
      coalesce(p_is_active, true)
    )
    returning * into v_row;
  end if;
  return to_jsonb(v_row);
end;
$$;

-- ═══════════════════════════════════════════════════════════════
-- APPROVAL DECISION (INVOKER — policies de insert/update existem)
-- ═══════════════════════════════════════════════════════════════

create or replace function public.enterprise_commit_approval_decision(
  p_tenant_id uuid,
  p_approval_request_id uuid,
  p_approver_actor_type text,
  p_approver_id uuid,
  p_approver_system_key text,
  p_decision text,
  p_reason text default null,
  p_level_id text default null,
  p_approver_role text default null,
  p_correlation_id text default null,
  p_request_id text default null,
  p_new_status text default null
)
returns jsonb
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_req public.approval_requests%rowtype;
  v_status text;
  v_decision_id uuid;
  v_outbox_id uuid;
  v_actor_type text := coalesce(p_approver_actor_type, 'user');
begin
  perform public.assert_tenant_member(p_tenant_id);

  if v_actor_type = 'user' then
    if p_approver_id is distinct from auth.uid() then
      raise exception 'approver_id deve coincidir com o usuário autenticado.';
    end if;
    if p_approver_system_key is not null then
      raise exception 'approver user não pode ter system_key.';
    end if;
  else
    if p_approver_id is not null then
      raise exception 'approver não-humano deve ter approver_id null.';
    end if;
    if p_approver_system_key is null or char_length(trim(p_approver_system_key)) = 0 then
      raise exception 'approver não-humano exige system_key.';
    end if;
  end if;

  select * into v_req
  from public.approval_requests
  where id = p_approval_request_id and tenant_id = p_tenant_id
  for update;

  if not found then
    raise exception 'Approval request não encontrada.';
  end if;

  v_status := coalesce(
    p_new_status,
    case
      when p_decision = 'APPROVE' then 'approved'
      when p_decision = 'REJECT' then 'rejected'
      else v_req.status
    end
  );

  insert into public.approval_decisions (
    tenant_id, approval_request_id, level_id,
    approver_actor_type, approver_id, approver_system_key, approver_role,
    decision, reason, metadata, correlation_id, request_id
  ) values (
    p_tenant_id, p_approval_request_id, p_level_id,
    v_actor_type, p_approver_id, p_approver_system_key, p_approver_role,
    p_decision, p_reason, '{}'::jsonb, p_correlation_id, p_request_id
  )
  returning id into v_decision_id;

  update public.approval_requests
  set status = v_status,
      completed_at = case when v_status in ('approved', 'rejected', 'cancelled', 'expired') then now() else completed_at end,
      updated_at = now()
  where id = p_approval_request_id and tenant_id = p_tenant_id;

  insert into public.approval_history (
    tenant_id, approval_request_id, previous_status, new_status, event,
    actor_type, actor_id, system_actor_key, reason, metadata
  ) values (
    p_tenant_id, p_approval_request_id, v_req.status, v_status, p_decision,
    v_actor_type, p_approver_id, p_approver_system_key, p_reason, '{}'::jsonb
  );

  insert into public.audit_events (
    tenant_id, user_id, actor_type, system_actor_key, event, category, severity,
    target_type, target_id, module, description, metadata,
    correlation_id, request_id, origin
  ) values (
    p_tenant_id,
    case when v_actor_type = 'user' then p_approver_id else null end,
    v_actor_type,
    case when v_actor_type = 'user' then null else p_approver_system_key end,
    'APPROVAL_DECIDED', 'approval', 'info',
    'approval_request', p_approval_request_id::text, 'approval', p_decision, '{}'::jsonb,
    p_correlation_id, p_request_id, 'rpc'
  );

  insert into public.enterprise_outbox (
    tenant_id, event_type, aggregate_type, aggregate_id, payload,
    status, correlation_id, request_id
  ) values (
    p_tenant_id, 'APPROVAL_DECIDED', 'approval_request', p_approval_request_id::text,
    jsonb_build_object('decision', p_decision, 'status', v_status),
    'pending', p_correlation_id, p_request_id
  )
  returning id into v_outbox_id;

  return jsonb_build_object(
    'approval_request_id', p_approval_request_id,
    'decision_id', v_decision_id,
    'status', v_status,
    'outbox_id', v_outbox_id
  );
end;
$$;

-- Grants (RC5 — alinhar fresh install; live DB: aplicar também 20260808_enterprise_rpc_grants_rc5.sql)
revoke all on function public.enterprise_claim_outbox_batch(uuid, text, integer, integer) from public;
revoke all on function public.enterprise_complete_outbox_event(uuid, uuid, text) from public;
revoke all on function public.enterprise_fail_outbox_event(uuid, uuid, text, text, boolean) from public;
revoke all on function public.enterprise_release_outbox_locks(uuid, integer) from public;
revoke all on function public.enterprise_resolve_idempotency(uuid, text, text, text, jsonb, integer) from public;
revoke all on function public.enterprise_save_workflow_definition(uuid, text, text, text, jsonb, text, text, boolean) from public;
revoke all on function public.enterprise_save_approval_definition(uuid, text, text, text, jsonb, text, text, boolean) from public;
revoke all on function public.enterprise_save_notification_template(uuid, text, text, text, text, text, text, jsonb, jsonb, jsonb, boolean) from public;
revoke all on function public.enterprise_commit_approval_decision(uuid, uuid, text, uuid, text, text, text, text, text, text, text, text) from public;

-- Server-only
revoke execute on function public.enterprise_claim_outbox_batch(uuid, text, integer, integer) from anon, authenticated;
revoke execute on function public.enterprise_complete_outbox_event(uuid, uuid, text) from anon, authenticated;
revoke execute on function public.enterprise_fail_outbox_event(uuid, uuid, text, text, boolean) from anon, authenticated;
revoke execute on function public.enterprise_release_outbox_locks(uuid, integer) from anon, authenticated;
revoke execute on function public.enterprise_resolve_idempotency(uuid, text, text, text, jsonb, integer) from anon, authenticated;
grant execute on function public.enterprise_claim_outbox_batch(uuid, text, integer, integer) to service_role;
grant execute on function public.enterprise_complete_outbox_event(uuid, uuid, text) to service_role;
grant execute on function public.enterprise_fail_outbox_event(uuid, uuid, text, text, boolean) to service_role;
grant execute on function public.enterprise_release_outbox_locks(uuid, integer) to service_role;
grant execute on function public.enterprise_resolve_idempotency(uuid, text, text, text, jsonb, integer) to service_role;

-- Authenticated (membro)
revoke execute on function public.enterprise_save_workflow_definition(uuid, text, text, text, jsonb, text, text, boolean) from anon;
revoke execute on function public.enterprise_save_approval_definition(uuid, text, text, text, jsonb, text, text, boolean) from anon;
revoke execute on function public.enterprise_save_notification_template(uuid, text, text, text, text, text, text, jsonb, jsonb, jsonb, boolean) from anon;
revoke execute on function public.enterprise_commit_approval_decision(uuid, uuid, text, uuid, text, text, text, text, text, text, text, text) from anon;
grant execute on function public.enterprise_save_workflow_definition(uuid, text, text, text, jsonb, text, text, boolean) to authenticated, service_role;
grant execute on function public.enterprise_save_approval_definition(uuid, text, text, text, jsonb, text, text, boolean) to authenticated, service_role;
grant execute on function public.enterprise_save_notification_template(uuid, text, text, text, text, text, text, jsonb, jsonb, jsonb, boolean) to authenticated, service_role;
grant execute on function public.enterprise_commit_approval_decision(uuid, uuid, text, uuid, text, text, text, text, text, text, text, text) to authenticated, service_role;

comment on function public.enterprise_claim_outbox_batch is 'RC5 SERVER-ONLY (service_role). Claim atómico FOR UPDATE SKIP LOCKED + locked_by';
