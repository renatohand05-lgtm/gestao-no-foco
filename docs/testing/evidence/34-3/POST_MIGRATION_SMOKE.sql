-- Sprint 34.3 — smoke pós-migration storage (somente leitura + checks)
-- Renato: rodar APÓS aplicar 20260826_phase34_3_p1_auth_storage_hardening.sql
-- Não altera dados.

-- 1) Policies do bucket
select polname, polcmd::text as cmd
from pg_policy
where polrelid = 'storage.objects'::regclass
  and (
    polname like 'crm_docs_%'
    or pg_get_expr(polqual, polrelid) ilike '%cliente-documentos%'
    or pg_get_expr(polwithcheck, polrelid) ilike '%cliente-documentos%'
  )
order by polname;
-- Esperado: crm_docs_select/insert/update/delete_tenant

-- 2) Bucket private
select id, public, file_size_limit, allowed_mime_types
from storage.buckets
where id = 'cliente-documentos';
-- Esperado: public = false

-- 3) Contagem policies crm_docs_*
select count(*) as crm_docs_policies
from pg_policy
where polrelid = 'storage.objects'::regclass
  and polname like 'crm_docs_%';
-- Esperado: 4
