-- Sprint 30.7 — Central de Automações Enterprise
-- Idempotente · RLS · tenant isolation · soft delete via archived_at
-- NÃO executar remotamente nesta sprint (aplicação manual).

BEGIN;

CREATE TABLE IF NOT EXISTS public.automation_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  company_id uuid NULL,
  branch_id uuid NULL,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  module text NOT NULL,
  trigger_type text NOT NULL,
  trigger_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  conditions jsonb NOT NULL DEFAULT '[]'::jsonb,
  actions jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN (
      'draft','pending_approval','approved','active','paused','disabled','failed','archived'
    )),
  priority text NOT NULL DEFAULT 'media'
    CHECK (priority IN ('baixa','media','alta','critica')),
  requires_approval boolean NOT NULL DEFAULT true,
  approval_role text NULL,
  cooldown_seconds integer NOT NULL DEFAULT 3600 CHECK (cooldown_seconds >= 0),
  max_executions integer NULL,
  created_by uuid NULL,
  updated_by uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz NULL,
  template_id text NULL,
  segment_hints text[] NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS public.automation_executions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  rule_id uuid NOT NULL REFERENCES public.automation_rules(id) ON DELETE CASCADE,
  trigger_type text NOT NULL,
  trigger_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  matched_conditions jsonb NOT NULL DEFAULT '[]'::jsonb,
  actions_requested jsonb NOT NULL DEFAULT '[]'::jsonb,
  actions_executed jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'queued'
    CHECK (status IN (
      'queued','evaluating','waiting_approval','approved','executing','completed',
      'partially_completed','failed','cancelled','skipped','rolled_back'
    )),
  error_code text NULL,
  error_message text NULL,
  retry_count integer NOT NULL DEFAULT 0,
  idempotency_key text NOT NULL,
  correlation_id text NOT NULL,
  dry_run boolean NOT NULL DEFAULT false,
  started_at timestamptz NULL,
  finished_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, idempotency_key)
);

CREATE TABLE IF NOT EXISTS public.automation_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  rule_id uuid NULL REFERENCES public.automation_rules(id) ON DELETE SET NULL,
  execution_id uuid NULL REFERENCES public.automation_executions(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN (
      'pending','approved','rejected','returned','cancelled','expired','delegated'
    )),
  requested_by uuid NOT NULL,
  decided_by uuid NULL,
  justification text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  decided_at timestamptz NULL,
  expires_at timestamptz NULL,
  history jsonb NOT NULL DEFAULT '[]'::jsonb
);

CREATE TABLE IF NOT EXISTS public.automation_templates (
  id text PRIMARY KEY,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  module text NOT NULL,
  trigger_type text NOT NULL,
  definition jsonb NOT NULL DEFAULT '{}'::jsonb,
  default_active boolean NOT NULL DEFAULT false,
  segments text[] NOT NULL DEFAULT '{*}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.automation_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  rule_id uuid NULL,
  execution_id uuid NULL,
  event text NOT NULL,
  user_id uuid NULL,
  origin text NOT NULL DEFAULT 'system',
  result text NOT NULL DEFAULT '',
  correlation_id text NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.automation_internal_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id uuid NULL,
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  priority text NOT NULL DEFAULT 'media'
    CHECK (priority IN ('baixa','media','alta','critica')),
  category text NOT NULL,
  href text NULL,
  read_at timestamptz NULL,
  archived_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_automation_rules_tenant_status
  ON public.automation_rules (tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_automation_executions_tenant_created
  ON public.automation_executions (tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_automation_approvals_tenant_status
  ON public.automation_approvals (tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_automation_audit_tenant_created
  ON public.automation_audit (tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_automation_notifications_tenant
  ON public.automation_internal_notifications (tenant_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.set_automation_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_automation_rules_updated ON public.automation_rules;
CREATE TRIGGER trg_automation_rules_updated
  BEFORE UPDATE ON public.automation_rules
  FOR EACH ROW EXECUTE FUNCTION public.set_automation_updated_at();

ALTER TABLE public.automation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_internal_notifications ENABLE ROW LEVEL SECURITY;

-- Policies tenant-scoped (padrão membership)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'automation_rules'
      AND policyname = 'automation_rules_tenant_select'
  ) THEN
    CREATE POLICY automation_rules_tenant_select ON public.automation_rules
      FOR SELECT USING (
        tenant_id IN (
          SELECT tenant_id FROM public.tenant_members
          WHERE user_id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'automation_rules'
      AND policyname = 'automation_rules_tenant_write'
  ) THEN
    CREATE POLICY automation_rules_tenant_write ON public.automation_rules
      FOR ALL USING (
        tenant_id IN (
          SELECT tenant_id FROM public.tenant_members
          WHERE user_id = auth.uid()
        )
      )
      WITH CHECK (
        tenant_id IN (
          SELECT tenant_id FROM public.tenant_members
          WHERE user_id = auth.uid()
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'automation_executions'
      AND policyname = 'automation_executions_tenant'
  ) THEN
    CREATE POLICY automation_executions_tenant ON public.automation_executions
      FOR ALL USING (
        tenant_id IN (
          SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()
        )
      )
      WITH CHECK (
        tenant_id IN (
          SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'automation_approvals'
      AND policyname = 'automation_approvals_tenant'
  ) THEN
    CREATE POLICY automation_approvals_tenant ON public.automation_approvals
      FOR ALL USING (
        tenant_id IN (
          SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()
        )
      )
      WITH CHECK (
        tenant_id IN (
          SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'automation_templates'
      AND policyname = 'automation_templates_read'
  ) THEN
    CREATE POLICY automation_templates_read ON public.automation_templates
      FOR SELECT USING (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'automation_audit'
      AND policyname = 'automation_audit_tenant'
  ) THEN
    CREATE POLICY automation_audit_tenant ON public.automation_audit
      FOR SELECT USING (
        tenant_id IN (
          SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'automation_internal_notifications'
      AND policyname = 'automation_notifications_tenant'
  ) THEN
    CREATE POLICY automation_notifications_tenant ON public.automation_internal_notifications
      FOR ALL USING (
        tenant_id IN (
          SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()
        )
      )
      WITH CHECK (
        tenant_id IN (
          SELECT tenant_id FROM public.tenant_members WHERE user_id = auth.uid()
        )
      );
  END IF;
END $$;

COMMIT;
