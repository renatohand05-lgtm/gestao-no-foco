# Performance — Sprint 9.8

Otimizações aplicadas sem alterar regras de negócio, RPCs, migrations ou resultados financeiros.

---

## Cache aplicado (seguro)

| Escopo | Mecanismo | Motivo |
|--------|-----------|--------|
| `createClient` (server) | `React.cache` | Deduplica client Supabase na mesma request |
| `getUserTenants` / `getTenantBySlug` / `requireTenant` | `React.cache` | Evita re-fetch de memberships no mesmo render |
| `requireAuth` / `getCurrentUser` / `getCurrentProfile` | `React.cache` | Deduplica auth/profile |

Chaves são por request React; **não** há cache cross-tenant nem TTL de dados financeiros.

## Cache recusado (segurança / stale data)

| Candidato | Motivo de recusa |
|-----------|------------------|
| `unstable_cache` em DRE / Fluxo / CR / CP / saldos / estoque | Risco de saldo e resultados desatualizados entre mutações |
| Cache HTTP de dashboard KPIs | Isolamento tenant + filtros dinâmicos; preferir revalidatePath existente |
| Cache de `getResumo` / rankings | Totais podem mudar a cada baixa/faturamento |

---

## Consultas paralelizadas

### `lib/dashboard/dashboard-service.ts`

1. Bundle principal: `current` + `previous` + `rankings` + `ebitda` + **qualidade** (soft-fail preservado)
2. `buildPeriodBundle`: factories DRE/Fluxo em paralelo; `faturamentoDiario` no mesmo `Promise.all` dos demais
3. `fetchOpenBalances`: factories CR/CP em paralelo
4. `fetchFaturamentoDiario`: vendas + CR avulsas em paralelo
5. `fetchTopCategorias`: vendas + CR em paralelo

### `lib/qualidade-operacional/qualidade-operacional-service.ts`

6. `buildEvolucaoMensal` no mesmo `Promise.all` dos retornos/serviços do período

### `app/(app)/[tenant]/dashboard/page.tsx`

7. `requireTenant` + `getCurrentProfile` em paralelo (com dedupe via `React.cache`)

---

## Client → Server Components

Convertidos (sem hooks/eventos):

- `components/ui/table.tsx`
- `components/dashboard/dashboard-empty-state.tsx`
- `components/dashboard/dashboard-charts.tsx`
- `components/dashboard/dashboard-charts-section.tsx`
- `components/dashboard/dashboard-rankings-section.tsx`
- `components/dashboard/dashboard-rankings.tsx`
- `components/dashboard/dashboard-intelligence-section.tsx`
- `components/dashboard/dashboard-health-score.tsx`
- `components/dashboard/dashboard-qualidade-operacional-section.tsx`

Mantidos Client (legítimos): filtros, header, actions, KPI/qualidade cards com Tooltip, forms, dialogs.

---

## Lazy loading / bundle

- Removido `next/dynamic` das seções do dashboard que passaram a RSC (evita atrásar Health Score/prioridades no client graph)
- Exportações do dashboard: `import()` dinâmico de `@/lib/dashboard/export` só no clique / atalho
- Streaming Suspense (9.8.3): ver [STREAMING.md](./STREAMING.md) — Hero/KPIs independentes de charts/rankings/qualidade

---

## Formatters / tipos compartilhados

| Item | Status |
|------|--------|
| `PaginatedResult` / `SortOrder` | Unificados em `types/pagination.ts` |
| `ActionResult` | Unificado em `types/action-result.ts` |
| Formatadores (9.8.1) | Ver [FORMATTERS.md](./FORMATTERS.md) — núcleo em `lib/format/` |
| `formatPercent` financeiro | Mantido como `formatPercentTaxa` (arredondamento distinto) |

---

## Tabelas / listas

- Módulos CRUD maduros já paginam (clientes, produtos, vendas, estoque, cadastros financeiros, CR/CP list)
- Fluxo de Caixa (9.8.4): tabela paginada server-side; `resumo`/`daily` continuam do período completo — ver [FLUXO_CAIXA_PAGINATION.md](./FLUXO_CAIXA_PAGINATION.md)
- DRE / `getResumo` ainda agregam período completo

## Stubs

Ordens / Relatórios / Configurações: páginas leves, sem queries pesadas — sem mudança funcional.

---

## Rankings (Sprint 9.8.2)

Ver [RANKINGS.md](./RANKINGS.md): leituras de vendas unificadas; `venda_itens` com `!inner`; select slim na qualidade.

## Streaming (Sprint 9.8.3)

Ver [STREAMING.md](./STREAMING.md): blocos Suspense independentes + loaders `React.cache` por request.

## Fluxo de Caixa listagem (Sprint 9.8.4)

Ver [FLUXO_CAIXA_PAGINATION.md](./FLUXO_CAIXA_PAGINATION.md).

## Oportunidades (documentadas — Sprint 10+)

Auditoria 9.9.2 — **sem** mudança de arquitetura neste RC:

| Oportunidade | Notas |
|--------------|--------|
| Agregações SQL / RPC para rankings | Reduzir agregação em memória |
| Revisar `"use client"` em wrappers finos | Preferir Server quando só composição |
| Lazy de seções abaixo da dobra no comercial | Já há Suspense no bloco; split adicional opcional |
| `dynamic()` em exports pesados | Já usado no export do dashboard |
| Evitar `memo`/`useCallback` sem necessidade | Seguir React Compiler do projeto |
| Tokens `dsStatus` vs classes `emerald`/`rose` soltas | Consistência visual DS |

## Backlog

1. Unificar `formatPercent` quando semantics forem alinhadas
2. GROUP BY / RPC para rankings e resumos
