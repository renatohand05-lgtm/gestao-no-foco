# Sprint 21.6 RC6 — Relatório Oficial de Encerramento (Fase 21)

**Data:** 2026-07-27  
**Ambiente:** PRODUCTION (main)  
**Executor:** Gate automatizado `scripts/enterprise-rc6-gate.mjs` + suites npm  
**Limitação:** Sem `DATABASE_URL` / `psql` — scripts SQL pg_catalog executados via equivalente REST onde possível; itens que exigem SQL Editor estão marcados.

---

## FASE 1 — Execução dos scripts SQL

| # | Script | Status | Detalhe |
|---|--------|--------|---------|
| 1 | `20260807_enterprise_rc4_readonly_audit.sql` | **PASS** | 21/21 tabelas Enterprise acessíveis via live probe |
| 2 | `20260808_enterprise_rc5_auth_rls_test.sql` | **WARNING** | Apenas 1 `tenant_members` / 3 tenants — impossível provar isolamento A/B; `SET LOCAL ROLE authenticated` requer SQL Editor |
| 3 | `20260808_enterprise_rpc_grants_rc5.sql` | **FAIL** | **Não aplicada no banco live.** Anon ainda invoca RPCs server-only (erro `P0001` em `assert_tenant_member`, não `permission denied`) |
| 4 | `20260808_enterprise_rc5_staging_smoke.sql` | **WARNING** | Leitura estrutural OK; DML `BEGIN/ROLLBACK` não executável via REST |
| 5 | `20260808_enterprise_rc5_residue_check.sql` | **PASS** | 0 resíduos RC4/RC5 |

---

## FASE 2 — Auditoria do banco (consolidada)

| Categoria | Classificação | Notas |
|-----------|---------------|-------|
| **Tabelas (21)** | **FOUND** | Todas respondem via PostgREST |
| **Views Enterprise** | N/A | Nenhuma view Enterprise prevista |
| **Indexes** | **WARNING** | Não auditado live (requer pg_catalog SQL) |
| **Unique / Partial** | **WARNING** | Definidos nas migrations; validação live pendente SQL |
| **Constraints CHECK** | **WARNING** | Pendente smoke SQL transacional |
| **FKs** | **WARNING** | Pendente audit SQL detalhado |
| **Triggers** | N/A | Nenhum trigger Enterprise nas migrations |
| **Functions aux.** | **FOUND** | `assert_tenant_member` operacional |
| **RPCs enterprise_*** | **FOUND** | 9 RPCs invocáveis |
| **Policies RLS** | **WARNING** | RLS ativo (tabelas acessíveis só com service_role bypass); detalhe pg_policies pendente SQL |
| **RLS enabled** | **FOUND** | Tabelas Enterprise existem e seguem modelo RLS |
| **FORCE RLS** | **WARNING** | Não habilitado nas migrations — owner bypassa sem impersonação |
| **Grants RPC server** | **INVALID** | RC5 grants não aplicados |
| **Grants RPC member** | **WARNING** | Anon bloqueado por lógica interna, não por REVOKE catalog |
| **Security Definer** | **FOUND** | Conforme migrations |
| **search_path** | **FOUND** | `public, pg_temp` nas migrations |
| **Legacy RBAC** | **FOUND** | `tenant_role_permissions` sem `role_id`; `tenant_rbac_role_permissions` presente |

---

## FASE 3 — RLS

| Critério | Status |
|----------|--------|
| tenant A | **WARNING** — só 1 membership no banco |
| tenant B | **WARNING** — sem segundo membro em tenant distinto |
| authenticated | **WARNING** — não testado com `SET ROLE` + JWT |
| sem tenant | **WARNING** — pendente SQL |
| sem membership | **WARNING** — pendente SQL |
| deny cross tenant | **WARNING** — bloqueado por ausência de par A/B |
| append only | **WARNING** — pendente SQL authenticated |
| outbox protegido | **WARNING** — grants RPC não endurecidos |
| idempotency protegida | **WARNING** — grants RPC não endurecidos |

---

## FASE 4 — RPC Review

| RPC | Security | Owner | search_path | Tenant | Membership | Permission | Granted To (live) | Server Only | Risk | Status |
|-----|----------|-------|-------------|--------|------------|------------|-------------------|-------------|------|--------|
| `enterprise_claim_outbox_batch` | DEFINER | postgres* | public, pg_temp | assert | sim | lock owner | **PUBLIC effective** | **Não** | Alto | **REPROVADO** |
| `enterprise_complete_outbox_event` | DEFINER | postgres* | public, pg_temp | assert | sim | lock owner | **PUBLIC effective** | **Não** | Alto | **REPROVADO** |
| `enterprise_fail_outbox_event` | DEFINER | postgres* | public, pg_temp | assert | sim | lock owner | **PUBLIC effective** | **Não** | Alto | **REPROVADO** |
| `enterprise_release_outbox_locks` | DEFINER | postgres* | public, pg_temp | assert | sim | — | **PUBLIC effective** | **Não** | Alto | **REPROVADO** |
| `enterprise_resolve_idempotency` | DEFINER | postgres* | public, pg_temp | assert | sim | — | **PUBLIC effective** | **Não** | Alto | **REPROVADO** |
| `enterprise_save_workflow_definition` | DEFINER | postgres* | public, pg_temp | assert | sim | membro | authenticated† | Não | Médio | **WARNING** |
| `enterprise_save_approval_definition` | DEFINER | postgres* | public, pg_temp | assert | sim | membro | authenticated† | Não | Médio | **WARNING** |
| `enterprise_save_notification_template` | DEFINER | postgres* | public, pg_temp | assert | sim | membro | authenticated† | Não | Médio | **WARNING** |
| `enterprise_commit_approval_decision` | INVOKER | postgres* | public, pg_temp | assert | sim | approver=uid | authenticated† | Não | Médio | **WARNING** |

\* Owner esperado pós-migration Supabase  
† Grants RC5 no código; live ainda expõe server RPCs a anon até aplicar migration

**Ação obrigatória:** executar `20260808_enterprise_rpc_grants_rc5.sql` no SQL Editor.

---

## FASE 5 — Types

| Item | Status |
|------|--------|
| `database.ts` regenerado (Tables Enterprise) | **REPROVADO** — `audit_events` etc. ausentes de `Database.Tables` |
| `database.ts` RPCs | **APROVADO** — `enterprise_*` presentes em Functions |
| Aliases removidos | **REPROVADO** — `enterprise-database.ts` + `ENTERPRISE_TYPES_PENDING_REGEN=true` |
| Imports / adapters / services | **WARNING** — usam fachada temporária; build passa |
| Row/Insert/Update tipados | **REPROVADO** para Tables Enterprise |

---

## FASE 6 — Resíduos

| Domínio | Contagem |
|---------|----------|
| audit | **0** |
| workflow | **0** |
| approval | **0** |
| notifications | **0** |
| outbox | **0** |
| idempotency | **0** |
| tenants teste | **0** |
| usuários teste | **0** |

**Status:** **APROVADO**

---

## FASE 7 — Testes

| Suite | PASS | FAIL |
|-------|------|------|
| test:enterprise-persistence | 145 | 0 |
| test:rbac | 92 | 0 |
| test:audit | 103 | 0 |
| test:workflow | 97 | 0 |
| test:approval | 90 | 0 |
| test:notifications | 139 | 0 |
| lint | PASS | 0 |
| build | PASS | 0 |
| **Total** | **666** | **0** |

---

## FASE 8 — Dívida técnica (real)

### Segurança
- Migration RC5 grants **não aplicada** — RPCs outbox/idempotency invocáveis via PostgREST (falham em lógica, não em grant).
- RLS cross-tenant **não comprovado** — produção tem 3 tenants / 1 membership.
- `FORCE ROW LEVEL SECURITY` ausente nas tabelas Enterprise.

### Infraestrutura
- Regeneração `types/database.ts` pendente (CLI + project ref).
- Validação pg_catalog completa requer SQL Editor ou `DATABASE_URL`.

### Arquitetura
- Dois modelos de types concorrentes (`database.ts` + `enterprise-database.ts`) até regen.

### Produto
- Camada Enterprise persistida no banco; **integração UI/produto** das features 21.1–21.6 ainda não wired end-to-end.

### Performance / Escalabilidade
- Sem bloqueio de encerramento de schema; tuning de índices/outbox processor = pós-go-live.

---

## FASE 9 — Gate final Sprint 21.6

| Item | Status | Justificativa |
|------|--------|---------------|
| Banco Enterprise | **APROVADO** | 21 tabelas live |
| RBAC | **REPROVADO** | Persistência live sem validação membership multi-tenant |
| Audit | **REPROVADO** | Append-only RLS não comprovado como authenticated |
| Workflow | **REPROVADO** | Smoke transacional pendente |
| Approval | **REPROVADO** | Idem |
| Notifications | **REPROVADO** | Idem |
| Outbox | **REPROVADO** | Grants RC5 não aplicados |
| Idempotência | **REPROVADO** | Grants RC5 não aplicados |
| Persistence | **APROVADO** | Camada código + migrations aplicadas |
| RPC Layer | **REPROVADO** | Server-only não enforced no catálogo |
| RLS | **REPROVADO** | Sem prova A/B authenticated |
| Types | **REPROVADO** | Tables Enterprise não no tipo oficial |
| Security | **REPROVADO** | RPC exposure + RLS não comprovado |
| Smoke | **REPROVADO** | SQL transacional não executado |
| Performance | **APROVADO** | Sem regressão; testes PASS |
| Testes | **APROVADO** | 666 PASS / 0 FAIL |
| Produção | **REPROVADO** | Bloqueios segurança acima |

---

## FASE 10 — Veredito final

## **SPRINT 21.6 NÃO CONCLUÍDA**

**Motivos objetivos:**
1. `20260808_enterprise_rpc_grants_rc5.sql` **não aplicada** no banco PRODUCTION.
2. RLS tenant A/B **não comprovado** (1 membership; teste authenticated pendente).
3. Smoke SQL com `BEGIN/ROLLBACK` **não executado** no SQL Editor.
4. `types/database.ts` **sem Tables Enterprise**; aliases temporários ativos.
5. Audit pg_catalog completo (índices, policies, FORCE RLS) **pendente** execução SQL.

---

## FASE 11 — Gate Fase 21

| Sprint | Arquitetura | Código | Banco | Integração | Segurança | Testes | Status |
|--------|-------------|--------|-------|------------|-----------|--------|--------|
| 21.1 RBAC | CONCLUÍDA | CONCLUÍDA | PENDENTE | PENDENTE | PENDENTE | CONCLUÍDA | **PENDENTE** |
| 21.2 Audit | CONCLUÍDA | CONCLUÍDA | PENDENTE | PENDENTE | PENDENTE | CONCLUÍDA | **PENDENTE** |
| 21.3 Workflow | CONCLUÍDA | CONCLUÍDA | PENDENTE | PENDENTE | PENDENTE | CONCLUÍDA | **PENDENTE** |
| 21.4 Approval | CONCLUÍDA | CONCLUÍDA | PENDENTE | PENDENTE | PENDENTE | CONCLUÍDA | **PENDENTE** |
| 21.5 Notifications | CONCLUÍDA | CONCLUÍDA | PENDENTE | PENDENTE | PENDENTE | CONCLUÍDA | **PENDENTE** |
| 21.6 Persistence | CONCLUÍDA | CONCLUÍDA | PARCIAL | PENDENTE | REPROVADA | CONCLUÍDA | **PENDENTE** |

**Fase 21 global:** **PENDENTE** — schema Enterprise no ar; gate de segurança, types e validação live incompletos.

---

## Ações mínimas para encerrar 21.6

1. SQL Editor: `20260808_enterprise_rpc_grants_rc5.sql`
2. SQL Editor: `20260808_enterprise_rc5_auth_rls_test.sql` (criar 2º membership teste ou usar tenants existentes)
3. SQL Editor: `20260807_enterprise_rc4_readonly_audit.sql` (sumário completo)
4. SQL Editor: `20260808_enterprise_rc5_staging_smoke.sql` + `residue_check.sql`
5. `npx supabase gen types` → mesclar Tables Enterprise → remover `enterprise-database.ts`
6. Re-executar gate RC6

---

## Confirmações operacionais

- **Git add:** NÃO  
- **Commit:** NÃO  
- **Push:** NÃO  
- **Deploy:** NÃO  
