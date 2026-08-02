# Sprint 30.2 — Baseline

**Antes da sprint:** módulo Equipe em Configurações era stub (`data-team-permissions-gap`, botão desabilitado “Convidar membro (em breve)”).

**Existente reaproveitado:**
- `tenant_members` (role owner/admin/manager/member)
- `profiles`
- `lib/rbac` (SYSTEM_ROLES, ROLE_PERMISSIONS, `usuarios.*`)
- `tenant_roles` / `tenant_rbac_role_permissions` / `tenant_user_roles` (Enterprise)
- `audit_events` + adapter
- `createAdminClient` (service role)
- padrão de token hash de compartilhamento de OS

**Ausente (antes):**
- tabelas de convites / equipes / cargos org
- UI de gestão de membros
- matriz visual de papéis no produto
- aceite self-service de convite

**HEAD base:** `bd6b15f` (Fase 29 docs) — trabalho 30.x local sem commit.
