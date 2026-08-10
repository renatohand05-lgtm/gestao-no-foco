# Sprint 33.0 — Auditoria Portal Web + Gate Zero (1º cliente piloto)

**Data:** 2026-08-10  
**Branch:** `main`  
**Mobile:** **NÃO alterado** (`apps/mobile` intacto; Sprint 32.5 congelada)

---

## 1. Arquitetura encontrada

| Camada | Realidade |
|--------|-----------|
| App | Next.js 16 (root `app/`) · React 19 |
| Auth | Supabase SSR · `proxy.ts` → `lib/supabase/middleware.ts` |
| Tenant | slug URL + `requireTenant` + `tenant_members` |
| RBAC | `lib/rbac` + `lib/finance/shared` + `lib/equipe` |
| Dados | Supabase + RLS · services `lib/*-service.ts` + server actions |
| API mobile BFF | `app/api/mobile/v1/**` (fora do escopo de mudança desta sprint) |
| Deploy | Vercel · `https://gestao-no-foco.vercel.app` |
| Observabilidade | logger JSON + `/api/health` + `/api/status` · **sem Sentry** |
| Backup | snapshots manuais Supabase (docs) · **sem job automatizado no repo** |

---

## 2. Rotas (resumo)

| Superfície | Classificação |
|------------|---------------|
| Dashboard, Vendas, Clientes/CRM, OS, Estoque, Compras, Financeiro enterprise | PASS |
| Inteligência / Analytics / Tributário | PASS / PARCIAL (flags externas OFF) |
| Configurações / Equipe / Onboarding / Convite | PASS |
| Integrações hub | PARCIAL (mocks honestos) |
| Relatórios | STUB |
| Conectores / Excel-PDF / CNAB / API import | NÃO IMPLEMENTADA / gated |

Inventário detalhado ~180 páginas tenant — ver exploração 33.0.

---

## 3. Auth / sessão

Login → memberships → `/{slug}/dashboard` ou `/onboarding`.  
Logout global + hard nav (anti-loop).  
Proxy refresh cookies.  
Risco residual: middleware sem env Supabase **pula** auth (misconfig).

---

## 4. Multi-tenant

**Isolamento cross-tenant: PASS** (middleware + layout + `.eq("tenant_id")` + RLS membership + testes de contrato).

---

## 5. RBAC

Roles membership: `owner` | `admin` | `manager` | `member`.  
Enterprise catalog: `proprietario`, `diretor`, `financeiro`, …  

**Correção 33.0:** `lib/financeiro/actions.ts` agora exige `requireFinanceiroAction` (criar/editar/excluir/transferir) — fecha bypass UI→action do financeiro clássico.

**P1 restante:** policies RLS financeiras ainda são membership-only (PostgREST direto com anon session). Mitigação operacional: piloto OWNER/ADMIN.

---

## 6. Módulos

| Módulo | Gate | Nota |
|--------|------|------|
| Dashboard | PASS | empty ≠ erro |
| CRM | PASS | fluxos core |
| Operação | PASS | OS/centro |
| Estoque | PASS | |
| Financeiro | PASS* | *actions corrigidas; RLS write ainda P1 |
| Inteligência | PASS | sem novas features |
| Perfil/Config | PASS | |

---

## 7. Onboarding

Produto: register → onboarding create-tenant → dashboard → equipe/convite.  
Procedimento: `docs/pilot/WEB_PILOT_01_ONBOARDING.md`.

---

## 8. Demo × real

Demo mode = chrome UI (`lib/demo`). Hub integrações = mocks rotulados.  
Não apresentar como sync real.

---

## 9. Segurança

- Service role: `server-only` · sem `NEXT_PUBLIC_` service role  
- Secrets hardcoded JWT/sk_live em código app: não encontrados  
- `.env.local` local (não commitado)

---

## 10. Produção / performance / UX erro / observability / backup

| Item | Status |
|------|--------|
| Produção Vercel HTTPS | PASS |
| Performance óbvia | PASS (sem P0) |
| Error states críticos | PASS parcial (padrões existem) |
| Observabilidade | PASS mínimo (logs + health) |
| Backup | N/A automatizado — manual Supabase |

---

## 11. Gates executados

| Gate | Resultado |
|------|-----------|
| lint | PASS (0 errors; warnings pré-existentes) |
| test:rbac | 92 PASS |
| test:onboarding | 25 PASS |
| test:phase30-team-tenant-isolation | 22 PASS |
| test:phase29-tenant-isolation | 9 PASS |
| test:phase33-0-finance-action-rbac | 2 PASS |
| build | **PASS** (`docs/testing/evidence/33-0/build.log`) |
| typecheck root | N/A (sem script `typecheck` root; `turbo:typecheck` disponível) |

---

## 12. Classificação de problemas

### P0 (após correção)
**0 abertos** para piloto **OWNER-only**.  
(Antes: actions financeiro sem RBAC — **corrigido**.)

### P1
1. RLS financeiro write = qualquer `tenant_members` (bypass PostgREST)  
2. Nav sidebar não filtra `requiredAnyPermissions`  
3. Mobile compose usa service role (já autenticado por rota; risco residual)  
4. Idempotency finance pode cair em memory sem service role  

### P2
- Relatórios stub / Hub mocks  
- Invite e-mail depende de provider  
- Double-submit create título  
- Sem Sentry  

### P3
- Redesign, conectores externos, Excel/PDF  

---

## 13. GO/NO-GO checklist

| Item | Resultado |
|------|-----------|
| AUTH | PASS |
| TENANT ISOLATION | PASS |
| RBAC | PASS* (actions; RLS write P1) |
| DASHBOARD | PASS |
| CRM | PASS |
| OPERAÇÃO | PASS |
| ESTOQUE | PASS |
| FINANCEIRO | PASS* |
| INTELIGÊNCIA | PASS |
| PERFIL | PASS |
| ONBOARDING | PASS |
| SEGURANÇA | PASS |
| PRODUÇÃO | PASS |
| PERFORMANCE | PASS |
| OBSERVABILIDADE | PASS |
| BACKUP | N/A |
| TESTES | PASS |

**PRIMEIRO CLIENTE:** **GO com ressalvas** — 1 empresa, OWNER (± ADMIN), sem `member` financeiro até RLS P1.

---

## 14. Estimativa

| Faixa | Conteúdo |
|-------|----------|
| Agora | GO OWNER-only |
| +4–8h | RLS write finance + smoke browser piloto |
| +1–2d | Nav RBAC filter + Sentry opcional |

**Classificação prazo para GO seguro multi-user:** **B** (≤1 dia se só OWNER; **C** se precisar multi-user com member).

**Horas para piloto OWNER:** **2–4h** (onboarding + smoke + checklist).

---

## 15. Caminho crítico

1. Confirmar env production + service role no servidor  
2. Snapshot Supabase manual  
3. Criar OWNER + tenant via `/register` + `/onboarding`  
4. Smoke Dashboard/CRM/OS/Estoque/Financeiro  
5. **Não** convidar `member` até migration RLS write  
6. (Opcional sprint 33.1) apertar RLS financeiro  

---

## 16. Mobile

`git diff apps/mobile` → **vazio**. Nenhuma alteração intencional ou acidental.
