# Sprint 27.8.3 — Correção definitiva da meta no Dashboard

**Data:** 2026-08-01 (America/Sao_Paulo)  
**Tenant:** `teste-renato-01` (`30fd2055-b14e-4922-a239-94a291869f94`)  
**Classificação:** **APROVADO EM RUNTIME**

---

## 1. Rastreamento ponta a ponta

| Item | Valor |
|------|--------|
| Tela de cadastro | `/teste-renato-01/configuracoes/metas` |
| Action | `createMetaVendasAction` → `MetaVendasService.create` |
| Tabela | `metas_vendas_mensais` |
| ID | `8e6c8b0c-3ba5-4400-aca5-432dc94ac946` |
| tenant_id | `30fd2055-…` |
| company_id / branch_id | *não existem no schema* |
| centro_custo_id | `null` (geral do tenant) |
| Tipo | meta mensal de vendas |
| competência | `2026-08-01` |
| Período vigente | 01/08/2026 – 31/08/2026 |
| Status | ativa (`deleted_at` null) |
| valor_meta | **132500** |
| Timezone canônico | America/Sao_Paulo |
| created_by | `b9f92604-243c-4b86-b497-4675c4df83ec` |
| created_at | 2026-08-01T11:17:35Z |

Evidência: `meta-trace.json`, `resolver-probe.json`.

---

## 2. Validação do registro

- Existe, tenant correto, ativa, cobre agosto/2026, não arquivada.
- Escopo geral (sem centro) — compatível com Dashboard sem filtro de centro.
- Valor não nulo: R$ 132.500,00.
- Competência correta no fuso SP.

---

## 3. Divergências encontradas (causa raiz)

### A) UX “Sem meta” no sábado (Dashboard)

- Meta **mensal** estava carregada (Brief já mostrava ~4,9% = 6.532,50 / 132.500).
- No sábado, `resolveMetaDiaria` → `fonte=zero_fds`, `meta_diaria=0`.
- `classifyMetaDiaStatus(..., 0)` → **`sem_meta`**.
- Header mostrava só “Meta do dia · Sem meta”, interpretado como ausência de meta cadastrada.

### B) Analytics sem meta no snapshot

- `snapshot-loader` chamava `createCommercialPanelService` **sem `await`** (factory async).
- Lia campos inventados (`proj.meta`, `proj.realizado`) em vez de `valor_meta` / `faturamento_realizado`.
- Erro engolido → mensagem “Metas de vendas não carregadas no snapshot”.

### C) Timezone UTC vs SP

- `defaultDrePeriodo` / `resolveCompetenciaFromPeriod` / projeção usavam `Date#getMonth()` (UTC no server).
- Risco de mês errado em 31/07↔01/08. Corrigido para America/Sao_Paulo.

### D) Labels de ausência

- KPI/ECC usavam “Indisponível” em vez de “Meta não cadastrada”.
- Ausência não deve virar R$ 0,00.

---

## 4. Correções aplicadas

1. Status diário: `fim_semana` / `dia_fechado` ≠ `sem_meta`; meta diária FDS/fechado → `null` (não R$ 0,00).
2. Header: pill **Meta do mês · R$ 132.500** + meta do dia correta.
3. Brief / KPI / ECC: valor absoluto mensal; ausência = “Meta não cadastrada”.
4. Resolver canônico: `pickMetaByScopePrecedence` + overlap de período; `getByCompetencia` usa o mesmo.
5. Defaults/projeção em SP; testes 31/07 e 01/08 UTC.
6. Cache: `revalidatePath` + `updateTag`/`revalidateTag(METAS_VENDAS_CACHE_TAG)`.
7. Analytics snapshot: await + campos canônicos.

---

## 5. Homologação runtime

| Superfície | Valor | Resultado |
|------------|-------|-----------|
| Header Meta do mês | R$ 132.500 | PASS |
| Header Meta do dia | Fim de semana | PASS (não “Sem meta”) |
| Executive Brief | R$ 132.500 · 4,9% | PASS |
| KPI Meta do mês | R$ 132.500 · 4,9% | PASS |
| Configurações/Metas | R$ 132.500,00 (ago/2026 Geral) | PASS |
| Analytics / Analytics Metas | R$ 132.500 presente; sem “não carregadas” | PASS |
| Forecast / ECC goals | via `metaMes` do snapshot | alinhado |

Evidências: `runtime-scrape.json`, `dashboard.png`, `analytics-*.txt`, `metas.png`.

---

## 6. Testes

| Suite | Resultado |
|-------|-----------|
| `test:sprint-27-8-3` / goal-* | **47 PASS · 0 FAIL** |
| `test:sprint-27-8-2` | **60 PASS · 0 FAIL** |
| `test:analytics-core` | **51 PASS · 0 FAIL** |
| `test:finance-core` | **53 PASS · 0 FAIL** |
| `test:rbac` | **92 PASS · 0 FAIL** |
| `test:release-candidate` | **64 PASS · 0 FAIL** |
| `npm run lint` | **0 errors** (warnings pré-existentes) |
| `npm run build` | **EXIT 0** |

---

## 7. Precedência canônica

Ordem: filial+centro → filial → empresa → geral tenant.  
Schema atual só tem `centro_custo_id` → centro específico, senão geral (fallback).

---

## 8. Classificação

**APROVADO EM RUNTIME**

Sem commit / push / deploy (conforme restrição).
