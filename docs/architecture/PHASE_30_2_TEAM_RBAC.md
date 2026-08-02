# Sprint 30.2 — Equipe / Team RBAC — Auditoria de Arquitetura

Status: implementado (código) · migration **não aplicada** no Supabase remoto (aplicação manual, fora do escopo desta sessão).

## 1. O que já existia (reaproveitado, sem duplicação)

| Camada | Fonte única | Uso no módulo Equipe |
| --- | --- | --- |
| Catálogo de permissões | `lib/rbac/permissions.ts` (`PERMISSION_CATALOG`, `PERMISSIONS_BY_MODULE`, `ALL_PERMISSION_KEYS`) | `lib/equipe/roles-matrix.ts` monta a matriz apenas *lendo* este catálogo |
| Papéis do sistema | `lib/rbac/roles.ts` (`SYSTEM_ROLES`) | Base da aba **Papéis** — nenhum papel novo é criado |
| Papel → permissões | `lib/rbac/role-permissions.ts` (`ROLE_PERMISSIONS`, `getPermissionsForRole(s)`) | Preenche `rolesGranting` de cada permissão na matriz |
| Membership legado → papéis Enterprise | `lib/rbac/membership.ts` (`mapElevatedMembershipToEnterpriseRoles`, `isElevatedMembershipRole`) | `page-auth.ts` deriva permissões efetivas de owner/admin sem tabela nova |
| Snapshot de autorização | `lib/enterprise` (`createRbacSupabaseAdapter().resolveAuthorizationSnapshot`) | `page-auth.ts` chama a mesma função usada por Financeiro/Fiscal |
| Sessão/tenant | `lib/auth/session.ts` (`getCurrentProfile`), `lib/tenants.ts` (`requireTenant`) | Idêntico ao padrão de todas as páginas server-side do app |
| Auditoria | `lib/enterprise` (`createAuditSupabaseAdapter`) → tabela `audit_events` existente | `lib/equipe/audit.ts` grava/lê eventos com `module = "equipe"`, sem tabela paralela |
| Hash de token | Padrão já usado em `lib/ordens/compartilhamento-service.ts` (sha256 + prefixo) | `lib/equipe/token.ts` replica a mesma técnica para convites |
| `tenant_members` | Tabela pré-existente (role, tenant_id, user_id) | Estendida (não recriada) com `status`, `updated_at`, `deactivated_at`, `team_id`, `job_title_id`, `notes` |
| UI / Design system | `components/ui/*` (Button, Card, Dialog, Table, Badge, NativeSelect, EmptyState, SearchInput, ConfirmDialog, FormField, Textarea, Avatar) | 100% reaproveitado — nenhum componente visual novo criado no design system |
| Labels multisetor | `config/segment-labels.ts` (`resolveSegment`, `getSegmentNavLabels`) | Estendido (não recriado) com `getOrgTeamLabels` |

Nenhuma permissão, papel ou matriz de acesso paralela foi criada. `lib/equipe` é uma camada de **apresentação e CRUD** sobre o RBAC existente — confirmado por `scripts/phase30-rbac-scope-tests.mjs`.

## 2. O que era stub / placeholder

Antes desta sprint, `app/(app)/[tenant]/configuracoes/page.tsx` continha um card `data-team-permissions-gap` com um botão **"Convidar membro (em breve)"** desabilitado e o texto "entram na Sprint 30.2". Não havia:

- Listagem real de membros (apenas `tenant.role` do usuário logado, sem ver peers);
- Qualquer fluxo de convite;
- Conceito de equipe/departamento ou cargo;
- Visualização da matriz de papéis × permissões (existia apenas no código-fonte de `lib/rbac`, sem UI);
- Auditoria específica de eventos de equipe (a tabela `audit_events` já existia, mas nada filtrava por `module = "equipe"`).

## 3. O que foi construído nesta sprint

- **Migration idempotente** (`supabase/migrations/20260820_phase30_2_team_rbac.sql`): estende `tenant_members`; cria `tenant_teams`, `tenant_team_members`, `tenant_job_titles`, `tenant_invitations`; funções `is_tenant_admin` / `list_tenant_member_rows` (SECURITY DEFINER); RLS em todas as tabelas novas + policy de SELECT de `tenant_members` que agora permite admin ver peers.
- **`lib/equipe/`** — 11 arquivos: `types`, `labels`, `token`, `guards` (puros, sem I/O), `roles-matrix` (puro, deriva do catálogo RBAC), `schema-probe` (detecção de schema), `page-auth`, `members-service`, `invitations-service`, `teams-service`, `job-titles-service`, `audit`, `actions`, `index` (barrel).
- **`components/equipe/`** — hub com abas (Membros / Convites / Equipes / Cargos / Papéis / Auditoria), painéis de CRUD, banner de schema pendente.
- **`app/(app)/[tenant]/configuracoes/equipe/`** — página server-side com KPIs reais (membros ativos, convites pendentes, equipes ativas) + `loading.tsx`.
- **`app/(app)/[tenant]/configuracoes/page.tsx`** — card "Equipe e permissões" agora linka para a página real (`data-team-permissions-ready`), com botão "Convidar membro" indo direto para `?tab=convites`.
- **`config/segment-labels.ts`** — `OrgTeamLabels`/`getOrgTeamLabels` com presets de departamento por segmento (oficina, comércio, restaurante, serviços, consultoria, fallback genérico).
- **`types/database.ts`** — tipos das 4 tabelas novas + colunas novas de `tenant_members`.
- **6 suítes de teste contract** (`scripts/phase30-{team,invitations,roles,permissions-matrix,rbac-scope,team-tenant-isolation}-tests.mjs`), todas estáticas/Node puro, sem banco.

## 4. Gaps conhecidos e decisões explícitas de não-escopo

- **Filiais (multi-branch):** não existe conceito de filial no schema atual (`tenants` é 1 registro = 1 negócio). O módulo Equipe **não inventa** filiais — `tenant_teams`/`tenant_job_titles` são departamentos internos de um único tenant, não unidades físicas. Se multi-filial for necessário, é um épico separado (nova tabela `branches` + FK em `tenant_members`), fora do escopo aqui.
- **Sessões ativas / "quem está online":** não há infraestrutura de presença/sessão persistida (ex.: tabela `sessions` com heartbeat) neste projeto. A aba Auditoria mostra **eventos** (login, criação, etc. quando emitidos), não presença em tempo real. Nenhuma UI de "sessões ativas" foi criada — seria enganoso simular isso sem dado real.
- **Aceite de convite (self-service):** implementado em `/convite/[token]` (segmento reservado — o convidado ainda não é membro do tenant). Token hasheado; e-mail da sessão deve coincidir; membership criada via service role; auditoria registrada.
- **Envio real de e-mail:** `emailProviderConfigured()` reflete honestamente `process.env.EMAIL_PROVIDER || RESEND_API_KEY || SMTP_HOST` — nenhum e-mail é enviado de fato (`emailSent: false` sempre). O admin vê o link de convite uma única vez na tela para copiar.
- **Migration não aplicada:** por restrição da tarefa (não executar SQL remoto), a migration existe apenas como arquivo. Até ser aplicada manualmente, `probeEquipeSchema` detecta a ausência das tabelas e a UI degrada com `SchemaPendingBanner` em vez de quebrar.

## 5. Fluxo de autorização (mesmo padrão do Financeiro)

```
requireEquipePageAuth(tenantSlug)
  → requireTenant(tenantSlug)                    // redireciona /onboarding se não houver tenant
  → getCurrentProfile()                           // redireciona /login se sessão ausente (via EquipeError)
  → resolveAuthorizationSnapshot(tenantId, userId) // RBAC canônico (roles + permissions)
  → resolveEquipeEffectivePermissions(...)         // funde snapshot + mapeamento de membership elevado
  → exige isElevatedMembershipRole(role) OU "usuarios.visualizar"
  → isAdmin = role in (owner, admin)                // gate para mutações (convites/equipes/cargos/troca de papel)
```

Toda ação de mutação em `lib/equipe/actions.ts` chama novamente `requireEquipePageAuth` (e `assertEquipeAdmin` quando aplicável) — nenhuma decisão de autorização é feita apenas no client.

## 6. Proteções de domínio (testadas em `phase30-team-tenant-isolation-tests.mjs`)

- **Último proprietário ativo:** não pode ter o papel alterado, ser inativado ou ter o acesso removido (`lib/equipe/guards.ts`).
- **Isolamento multi-tenant:** toda query de serviço filtra por `tenant_id`; `belongsToTenant`/`assertTenantMatch` são os guards puros usados como segunda camada de defesa acima do RLS.
- **Token de convite:** nunca persistido em claro; apenas `token_hash` (sha256) + `token_prefix` (8 chars) ficam no banco; a URL com o token completo é retornada uma única vez.
