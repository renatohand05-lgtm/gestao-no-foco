# Sprint 31.1 — REPORT

**Data:** 2026-08-03
**Classificação:** **APROVADA COM RESSALVAS**

## Arquitetura

Híbrido: Supabase Auth (anon + SecureStore) no device + `GET/POST /api/mobile/v1/*` com Bearer para memberships, permissions e branches. Sem service role no mobile. Sem migration.

## Entregas

| Área | Status |
|------|--------|
| Login real | Implementado (`signInWithPassword`) |
| Sessão + refresh single-flight | Implementado |
| SecureStore versionado | Implementado |
| Tenant selector (API) | Implementado |
| Branch selector | Implementado (fallback continue without branch) |
| RBAC mobile (permissions API) | Implementado |
| Guards / deep links | Implementado |
| Password recovery | Implementado (recover + reset + scheme) |
| Biometria opt-in | Implementado (contratos + LocalAuthentication) |
| Offline limitado | Implementado (TTL + read-only) |
| Logout idempotente | Implementado |

## Gates

| Gate | Resultado |
|------|-----------|
| lint web | PASS (0 errors) |
| build web | PASS |
| RC | 65 PASS |
| rbac | 92 PASS |
| mobile:typecheck / lint / doctor | PASS / PASS / **20/20** |
| phase31-mobile (aggregate) | **210 PASS · 0 FAIL** |
| phase31-monorepo / workspaces | PASS |

## Migration

**Não necessária** nesta sprint (branches via fallback API).

## Ressalvas

1. QA Android em dispositivo/emulador **não executado** nesta sessão (PARCIAL)
2. iOS: readiness estática + Face ID plist — **não homologado** em device
3. Filiais reais dependem de modelo de dados futuro
4. Recovery depende de redirect URLs no projeto Supabase

## Checklist final

1. login real: **SIM**
2. sessão persistente: **SIM**
3. refresh seguro: **SIM**
4. tenant selector: **SIM**
5. branch selector: **SIM** (fallback sem tabela)
6. RBAC mobile: **SIM**
7. recuperação de senha: **SIM**
8. biometria: **PARCIAL** (implementada; QA device limitado)
9. offline limitado: **SIM**
10. Android homologado: **PARCIAL**
11. iOS preparado: **PARCIAL**
12. migration necessária: **NÃO**
13. pronto para commit: **SIM** (não executado)
14. pronto para Sprint 31.2: **SIM**
