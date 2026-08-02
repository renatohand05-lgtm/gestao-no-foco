# Sprint 30.2 — Schema atual vs alvo

## Já existia

| Objeto | Uso |
|--------|-----|
| `tenant_members` | Membership + role legado |
| `profiles` | Nome / e-mail / avatar |
| `tenant_roles` + `tenant_rbac_*` | Papéis Enterprise tipados |
| `audit_events` | Auditoria append-only |

## Introduzido pela migration `20260820_phase30_2_team_rbac.sql`

| Objeto | Status no código |
|--------|------------------|
| Colunas `tenant_members.status|updated_at|deactivated_at|team_id|job_title_id|notes` | Tipadas + degradável se ausentes |
| `tenant_teams` | Serviço + UI |
| `tenant_team_members` | Serviço |
| `tenant_job_titles` | Serviço + UI |
| `tenant_invitations` | Serviço + UI + aceite `/convite/[token]` |
| `is_tenant_admin` / `list_tenant_member_rows` | SECURITY DEFINER |
| RLS admin SELECT peers | Policy `tenant_members_select_self_or_admin` |

## Não inventado

- Filiais / branches de membership (sem tabela org dedicada)
- Sessões Auth UI (sem API estável no produto)
- MFA badge sem dado real

## Ambiente QA `teste-renato-01`

Browser 30.2 observou KPIs `Convites pendentes=1` e `Equipes ativas=1` — schema de Equipe **já respondendo** neste ambiente (aplicação prévia ou paralelismo). A migration permanece o artefato canônico para outros ambientes; **esta sessão não executou SQL remoto**.
