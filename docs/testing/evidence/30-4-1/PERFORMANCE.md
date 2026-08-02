# Performance — Sprint 30.4.1

## Antes → Depois (desktop, prod `next start`)

| Métrica | Antes (30.4) | Depois (30.4.1) | Ganho |
|---------|--------------|-----------------|-------|
| Cold | 4802 ms | **2120 ms** | **~56%** |
| Warm | 3955 ms | **1393 ms** | **~65%** |

## Alvos

| Meta | Resultado |
|------|-----------|
| Cold ≤ 3000 ms | **ATINGIDO** (2120) |
| Warm ≤ 1500 ms | **ATINGIDO** (1393) |

## Otimizações aplicadas (comprovadas)

1. **Commercial Intelligence fora do first paint** — movido para `ExecutiveAiLazyBlock` (Suspense).  
2. **Charts/DRE series fora do first paint** — `ChartsMainRowBlock` em Suspense (`mainRowSlot`).  
3. **`loadExecutiveDashboardContext` com `React.cache`** — dedupe por request.  
4. **Quick Actions → Server Component** — remove `"use client"` sem hooks.  
5. **Skeleton estruturado** + delays de animação menores + `content-visibility` below-fold.

## Não alterado (proposital)

- Fórmulas DRE / fluxo / metas  
- 3× `getFluxo` no exec context (mesmos resumos oficiais)  
- CR/CP `getResumo` (mesmos totais)  
- `force-dynamic` (sem ISR financeiro)

## Gargalos remanescentes (futuro)

| Gargalo | Impacto | Solução futura |
|---------|---------|----------------|
| Primary 2× DRE+fluxo | alto | agregações SQL / RPC |
| Vendas snapshot sem limit | alto | aggregates server-side |
| Triplo getFluxo | médio | um horizonte + derive |
| CR/CP duplicate getResumo | médio | cache compartilhado tipado |
| Export loadDashboardFull | baixo | on-demand click |
