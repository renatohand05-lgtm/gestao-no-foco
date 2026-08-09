# Sprint 31.11.10 — Corrigir RBAC do usuário no mobile (sem burlar permissões)

## Classificação

**CORREÇÃO APROVADA** (paridade Web ↔ Mobile no resolver + UX de tabs)

Não executado: commit / push / deploy / build iOS.

---

## 1. Role atual encontrado

| Camada | Valor |
|--------|--------|
| `tenant_members.role` | `owner` \| `admin` \| `manager` \| `member` (membership API) |
| Papel Enterprise (`tenant_user_roles`) | tipicamente operacional no tenant observado |
| Label no app “Produtividade · **MECANICO**” | **não é role de banco** — perfil adaptativo de UI |

## 2. Motivo de aparecer MECANICO

Inferência em `apps/mobile/src/productivity/commands.ts` → `resolveAdaptiveProfile`:

- tem `os.visualizar` **ou** `centro_operacoes.visualizar`
- **e não** tem `crm.pipeline.visualizar` / `dashboard.executivo` (sem expandir alias)

Com permissões só de operação (`venda_rapida.*`, `desconto.*`, `centro_operacoes.*`), o strip exibe **MECANICO**.

## 3. Membership atual

Fonte: `GET /api/mobile/v1/memberships` + `getActiveMembership` (`tenant_members`).

- Tenant: `teste-renato-01`
- Membership ativa no tenant (role legado `owner|admin|manager|member`)
- Escopo: filial via seletor mobile (`branchId` / “continuar sem filial”)
- Permissões: endpoint `GET .../permissions` (antes: snapshot Enterprise cru se não-vazio)

Auditoria live do DB do usuário não foi executada neste sprint (sem credenciais/produção). Correção é na **fonte de resolução**, alinhada às bridges Web.

## 4. Permissões efetivas (antes → depois)

**Antes (bug):** se `resolveAuthorizationSnapshot` retornava lista não-vazia, o mobile **parava aí** e **não**:

- unia o catálogo oficina (`PermissionService` / `dashboard.visualizar_executivo`, etc.)
- aplicava bridges Web (`resolveAnalytics/Finance/Crm/SupplyEffectivePermissions`)
- expandia aliases executivos no DTO/cliente

**Depois:** `mergeMobileEffectivePermissions` une snapshot + legado + bridges Web + `expandExecutivePermissionAliases`.

## 5. Divergência Web/Mobile encontrada

**SIM**

| Ponto | Web | Mobile (antes) |
|-------|-----|----------------|
| Snapshot parcial + owner/admin | completa analytics/CRM/estoque via elevated membership | só snapshot |
| Alias `dashboard.visualizar_executivo` | vira acesso executivo | gates cliente exigiam `dashboard.executivo` literal |
| Finance `member` → `visualizacao` | bridge em `lib/finance/shared/rbac-compat` | ausente no resolver mobile |

## 6. Causa exata

`lib/mobile/permissions.ts` tratava snapshot Enterprise não-vazio como conjunto final, sem o merge de permissões efetivas já usado pelos módulos Web. O label MECANICO era consequência (UI), não a causa.

## 7. Correção aplicada

1. **`lib/mobile/effective-permissions.ts`** — `mergeMobileEffectivePermissions` (puro)
2. **`lib/mobile/permissions.ts`** — `resolveMobilePermissions` carrega snapshot + legado e faz merge
3. **`@gof/rbac-contracts`** — aliases executivos em `hasPermission` (defesa no cliente)
4. **Tab bar** — oculta módulos sem permissão; Início sem exec redireciona para Operação
5. **Testes** — `scripts/phase31-11-10-rbac-parity-tests.mjs`
6. Patches Expo alinhados (doctor 20/20): `expo` / `expo-router` / etc. `~57.0.11`

**Não feito:** hardcode admin, remoção de guards, permissões fictícias, bypass no cliente.

### Mapa módulo → permission → guard

| Módulo | Permission keys (any-of) | Guard |
|--------|--------------------------|--------|
| Dashboard Executivo | `dashboard.executivo`, `analytics.executivo`, `dashboard.visualizar` (+ aliases) | tela + `hasExecutiveDashboardAccess` / `FORBIDDEN_EXECUTIVE` |
| Inteligência | idem executivo | `intelligence-route-auth` + compose |
| Financeiro | `financeiro.visualizar`, `ver_saldos`, `ver_fluxo_caixa`, `ver_dre` | tela + finance routes |
| CRM | `crm.visualizar`, `crm.dashboard.visualizar`, `crm.pipeline.visualizar`, `clientes.visualizar` | tela + CRM routes |
| Estoque/Compras | `estoque/produtos/compras/fornecedores.visualizar`, … | tela + stock routes |
| Operação | `os.visualizar`, `centro_operacoes.visualizar`, … | tela + ops routes |

---

## Checklist (8–16)

| # | Item | Resultado |
|---|------|-----------|
| 8 | Dashboard autorizado | **CONDICIONAL** — SIM se membership elevada (owner/admin), legado `dashboard.visualizar_executivo`, ou snapshot executivo; NÃO para ops-only puro |
| 9 | Inteligência autorizada | **CONDICIONAL** — mesma regra do Dashboard Executivo |
| 10 | Financeiro autorizado | **CONDICIONAL** — SIM via bridge Web (`member`→`visualizacao`, `manager`→`financeiro`, owner/admin) ou keys no snapshot |
| 11 | CRM autorizado | **CONDICIONAL** — SIM para owner/admin (elevated) ou keys CRM no snapshot; NÃO para mecânico ops-only |
| 12 | Estoque autorizado | **CONDICIONAL** — idem CRM (elevated / snapshot supply) |
| 13 | Operação preservada | **SIM** |
| 14 | RBAC servidor preservado | **SIM** (`FORBIDDEN_*`, sem grant `*`) |
| 15 | Nova build necessária | **SIM** (cliente: aliases + tabs). **Também:** deploy da API Web (Vercel) para o merge do resolver entrar em produção |
| 16 | Pronto para homologação iPhone | **SIM** após deploy API + nova build preview |

---

## Gates

| Gate | Resultado |
|------|-----------|
| `npm run mobile:doctor` | **20/20** |
| `npm run mobile:lint` | **0 erros** |
| `npm run mobile:typecheck` | **PASS** |
| `npm run mobile:test` | **PASS** |
| `test:phase31-11-10-rbac-parity` | **17 PASS · 0 FAIL** |
| `test:phase31-mobile-rbac` | PASS |
| `test:phase31-mobile-auth` | PASS |
| `test:phase31-dashboard-mobile` | PASS |
| `test:phase31-finance-rbac-mobile` | PASS |
| `test:phase31-crm-rbac` | PASS |
| `test:phase31-stock-rbac` | PASS |
| `test:phase31-operations-rbac` | PASS |
| `test:phase31-intelligence-rbac` | PASS |

---

## Próximos passos (homologação)

1. **Deploy** da API Next (`gestao-no-foco.vercel.app`) com o novo `resolveMobilePermissions`.
2. **Build iOS preview** (EAS) com o app atualizado (tabs + `@gof/rbac-contracts`).
3. No iPhone, no tenant `teste-renato-01`:
   - Confirmar `tenant_members.role` (Perfil / memberships).
   - Se for **owner/admin** na Web: Dashboard, Intel, Financeiro, CRM, Estoque e Operação devem abrir.
   - Se for **só operacional**: Operação aberta; demais tabs ocultas ou Access Denied; perfil adaptativo deixa de ser MECANICO se ganhar `dashboard.executivo` via merge/alias.
4. Validar troca de tenant e logout/login recalculando permissões.
5. Confirmar que usuário sem grant continua com **403** na API (não basta “forçar” a rota no cliente).
