-- Sprint 34.3 — Storage CRM (cliente-documentos) RLS por tenant ativo
-- NÃO edita migrations históricas.
-- NÃO executar em production automaticamente — Renato aplica após revisão.
--
-- Path existente (inalterado): {tenant_id}/clientes/{cliente_id}/{uuid}.ext
-- Bucket permanece private (public = false).
-- Idempotente. Sem DELETE de objetos. Sem rename de paths.

-- Policies alinhadas a os-inspecao / nfe_entrada, com membership ACTIVE (34.2).

drop policy if exists "crm_docs_select_tenant" on storage.objects;
drop policy if exists "crm_docs_insert_tenant" on storage.objects;
drop policy if exists "crm_docs_update_tenant" on storage.objects;
drop policy if exists "crm_docs_delete_tenant" on storage.objects;
drop policy if exists "Membros leem cliente-documentos" on storage.objects;
drop policy if exists "Membros enviam cliente-documentos" on storage.objects;
drop policy if exists "Membros atualizam cliente-documentos" on storage.objects;
drop policy if exists "Membros removem cliente-documentos" on storage.objects;

create policy "crm_docs_select_tenant"
  on storage.objects for select
  using (
    bucket_id = 'cliente-documentos'
    and exists (
      select 1 from public.tenant_members tm
      where tm.user_id = auth.uid()
        and tm.tenant_id::text = (storage.foldername(name))[1]
        and (tm.status is null or tm.status = 'active')
        and tm.deactivated_at is null
    )
  );

create policy "crm_docs_insert_tenant"
  on storage.objects for insert
  with check (
    bucket_id = 'cliente-documentos'
    and exists (
      select 1 from public.tenant_members tm
      where tm.user_id = auth.uid()
        and tm.tenant_id::text = (storage.foldername(name))[1]
        and (tm.status is null or tm.status = 'active')
        and tm.deactivated_at is null
    )
  );

create policy "crm_docs_update_tenant"
  on storage.objects for update
  using (
    bucket_id = 'cliente-documentos'
    and exists (
      select 1 from public.tenant_members tm
      where tm.user_id = auth.uid()
        and tm.tenant_id::text = (storage.foldername(name))[1]
        and (tm.status is null or tm.status = 'active')
        and tm.deactivated_at is null
    )
  )
  with check (
    bucket_id = 'cliente-documentos'
    and exists (
      select 1 from public.tenant_members tm
      where tm.user_id = auth.uid()
        and tm.tenant_id::text = (storage.foldername(name))[1]
        and (tm.status is null or tm.status = 'active')
        and tm.deactivated_at is null
    )
  );

create policy "crm_docs_delete_tenant"
  on storage.objects for delete
  using (
    bucket_id = 'cliente-documentos'
    and exists (
      select 1 from public.tenant_members tm
      where tm.user_id = auth.uid()
        and tm.tenant_id::text = (storage.foldername(name))[1]
        and (tm.status is null or tm.status = 'active')
        and tm.deactivated_at is null
    )
  );

-- Garante bucket privado e limites já definidos em 20260727 (idempotente)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'cliente-documentos',
  'cliente-documentos',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']::text[]
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

comment on policy "crm_docs_select_tenant" on storage.objects is
  'Sprint 34.3 — leitura de cliente-documentos só para membro ativo do tenant no 1º segmento do path.';
