# Fase 29.6 — Unificação Definitiva da Engine Enterprise

**Sprint:** 29.6  
**Pré-requisito:** Sprints 29.0–29.5  
**Escopo:** remover aliases `@deprecated`, migrar consumidores, única entrada `@/lib/enterprise` — **sem** novas features nem mudança de fórmulas

---

## Princípios

1. **`@/lib/enterprise` é a única entrada oficial** para inteligência em `app/` e `components/`
2. Engines de fórmula (`executive-ai-engine`, `business-health-engine`, sinais) permanecem como **implementação**
3. **Zero** aliases `buildExecutiveIntelligence`
4. Imports de engines internas em lib usam `@/lib/enterprise/intelligence` (evita puxar adapters Supabase)
5. Sem ciclos: `intelligence.ts` nunca importa o barrel `@/lib/enterprise`

---

## Nomenclatura final

| Oficial | Implementação |
|---------|----------------|
| `composeEnterpriseInsights` / `runEnterpriseEngine` | `lib/executive-intelligence/compose.ts` |
| `presentEnterpriseInsightCards` | `lib/executive-intelligence/present.ts` |
| `composeOpsExecutiveIntelligence` | `lib/dashboard/executive-intelligence-loader.ts` |
| `composeCommercialExecutiveIntelligence` | `lib/intelligence/index.ts` |
| `runExecutiveAiEngine` | `lib/ai/executive-ai-engine.ts` |
| `runBusinessHealthEngine` / `BusinessHealthEngine` | `lib/dashboard/business-health-engine.ts` |

---

## Grafo final

```
app/components
    └─► @/lib/enterprise  (barrel)
            ├─ ports/adapters (RBAC, audit, outbox…)
            └─ intelligence.ts
                    ├─ lib/executive-intelligence  (sinais/alertas/recs)
                    ├─ lib/ai/executive-ai-engine
                    ├─ lib/dashboard/business-health-engine
                    ├─ lib/dashboard/executive-intelligence-loader (ops)
                    └─ lib/intelligence (comercial legado)

lib/* engines (ECC/EDC/timeline/copilot)
    └─► @/lib/enterprise/intelligence  (sem adapters)
```

---

## Removido nesta sprint

- Aliases `@deprecated` `buildExecutiveIntelligence` (ops + comercial)
- Dual-export `presentExecutiveInsightCards` / `composeExecutiveIntelligencePack` na fachada
- Imports de `business-health-engine` / `executive-intelligence-loader` em components

---

## Explicitamente fora / backlog pós-29.7

- Migrar scripts de teste unitário de engines (podem continuar deep import)
- Unificar visualmente dashboard-intelligence alerts com a fachada (sem mudar KPIs)
- Remover EI comercial se produto confirmar obsolescência
- Gate `executive-cockpit-premium` legado
- Homologação visual pré-deploy → ver [PHASE_29_7_HOMOLOGATION.md](./PHASE_29_7_HOMOLOGATION.md)

---

## Gate

```bash
npm run lint
npm run build
npm run test:phase29
npm run test:release-candidate
```

Evidências: `docs/testing/evidence/29-6/`
