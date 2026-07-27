# Arquitetura Oficial — Gestão no Foco

**Sprint de referência:** 21.10 — Enterprise Release Candidate (`21.10.0-rc.1`)  
**Status do produto:** Fase 21 Enterprise em **RC** — ver [releases/ENTERPRISE_21_10_RC1.md](../releases/ENTERPRISE_21_10_RC1.md)  
**Escopo deste doc:** princípios e mapa estáveis. Evoluções Enterprise 21.x não quebram os princípios multi-tenant / server-first.

---

## Princípios

1. **Multi-tenant primeiro** — toda leitura/escrita filtra `tenant_id` e valida membro via `requireTenant` / RLS.
2. **Uma fonte de verdade financeira** — DRE, Fluxo de Caixa, Contas a Pagar/Receber e Dashboard reutilizam services existentes; não duplicar cálculos.
3. **Server-first** — páginas e services no servidor; Client Components só para interação.
4. **Sem mock em produção** — dados reais do Supabase; empty states explícitos.
5. **Soft-delete** — preferir `deleted_at`; não hard-delete registros históricos financeiros.
6. **RPCs atômicas** — operações financeiras multi-tabela via RPC existente; não reinventar no client.

---

## Mapa do repositório

```
app/                  # Next.js App Router (rotas)
components/           # UI por domínio + ui/ + layout/
lib/                  # Services, actions, validations, mappers
hooks/                # Hooks React raros (ex.: use-mobile)
types/                # Tipos de domínio + database.ts
config/               # site, navigation
supabase/             # schema + migrations manuais
docs/                 # Roadmap + arquitetura
```

### Rotas (`app/`)

| Grupo | Responsabilidade |
|-------|------------------|
| `(marketing)/` | Landing pública |
| `(auth)/` | Login / register |
| `(app)/onboarding/` | Criação de tenant |
| `(app)/[tenant]/` | Shell autenticado multi-tenant |
| `api/auth/callback/` | OAuth / session callback |

### Domínios maduros (referência)

| Domínio | `lib/` | `components/` | `types/` |
|---------|--------|---------------|---------|
| Clientes | `lib/clientes/` | `components/clientes/` | `types/clientes.ts` |
| Produtos | `lib/produtos/` | `components/produtos/` | `types/produtos.ts` |
| Estoque | `lib/estoque/` | `components/estoque/` | `types/estoque.ts` |
| Vendas | `lib/vendas/` | `components/vendas/` | `types/vendas.ts` |
| Financeiro | `lib/financeiro/` | `components/financeiro/` | `types/financeiro.ts` + subtipos |

### Camadas transversais

| Camada | Local | Notas |
|--------|-------|-------|
| Auth / sessão | `lib/auth/` | Actions, session, redirects |
| Supabase clients | `lib/supabase/` | browser / server / middleware helper |
| Tenants | `lib/tenants.ts` | `requireTenant(slug)` |
| Design System | `lib/design-system/` | Tokens `ds*` |
| Dashboard | `lib/dashboard/` + `components/dashboard/` | Orquestra DRE/Fluxo/CR/CP |
| Intelligence | `lib/intelligence/` | Health score, alertas, checklist, atividades |
| Qualidade Operacional | `lib/qualidade-operacional/` | KPI de retornos (UI no dashboard/ordens) |
| **Enterprise (Fase 21)** | `lib/enterprise/` + `lib/rbac/` + `lib/audit/` + `lib/workflow/` + `lib/approval/` + `lib/timeline/` + `lib/observability/` | RBAC → Audit → Workflow → Approval → Notifications → Persistence → Runtime → Timeline → Observability · [ENTERPRISE_OVERVIEW.md](./ENTERPRISE_OVERVIEW.md) |

---

## Fluxo de dados oficial

```
URL / searchParams
  → page.tsx (Server Component)
    → requireTenant(slug)
    → createXService(tenant.id)
    → service.list|get|…
    → components de apresentação

Mutação:
  Client Form
    → Server Action (Zod + requireTenant)
      → mapper
        → service.create|update|delete
          → revalidatePath
          → ActionResult | redirect(?success=)
```

---

## Fontes de verdade financeiras

| Indicador / tela | Service canônico | Não fazer |
|------------------|------------------|-----------|
| DRE | `lib/financeiro/dre-service.ts` | Recalcular no Dashboard |
| Fluxo de Caixa | `lib/financeiro/fluxo-caixa-service.ts` | Duplicar previsto/realizado |
| Contas a Receber | `lib/financeiro/conta-receber-service.ts` | Snapshot paralelo |
| Contas a Pagar | `lib/financeiro/conta-pagar-service.ts` | Snapshot paralelo |
| Dashboard KPIs | `lib/dashboard/dashboard-service.ts` | Chama DRE/Fluxo/CR/CP |

---

## Documentos relacionados

- [MODULE_STANDARD.md](./MODULE_STANDARD.md)
- [SERVICE_STANDARD.md](./SERVICE_STANDARD.md)
- [UI_STANDARD.md](./UI_STANDARD.md)
- [DEVELOPMENT_CHECKLIST.md](./DEVELOPMENT_CHECKLIST.md)
- [FORMATTERS.md](./FORMATTERS.md)
- [PERFORMANCE.md](./PERFORMANCE.md)
- [RANKINGS.md](./RANKINGS.md)
- [ENTERPRISE_OVERVIEW.md](./ENTERPRISE_OVERVIEW.md) — Fase 21 Enterprise
- [ENTERPRISE_21_10_RELEASE_CHECKLIST.md](./ENTERPRISE_21_10_RELEASE_CHECKLIST.md)
- [../modulo-clientes.md](../modulo-clientes.md) — módulo de referência histórico
- [../roadmap/backlog-tecnico.md](../roadmap/backlog-tecnico.md) — decisões técnicas

---

## Dívida conhecida (não bloqueante)

- `formatPercentTaxa` (financeiro) permanece separado de `formatPercent` (pontos)
- Completar módulos stub: Ordens CRUD, Relatórios, Configurações
- Unificar rotas `novo` vs `nova` onde for seguro
- Fase 22 Enterprise: unificar stacks paralelos domain↔application-services; endurecer fallback RBAC; cron SLA
