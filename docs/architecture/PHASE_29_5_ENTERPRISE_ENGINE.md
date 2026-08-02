# Fase 29.5 — Unificação da Engine Enterprise e Padronização Global

**Sprint:** 29.5  
**Pré-requisito:** Sprints 29.0–29.4  
**Escopo:** consolidação / rename / remoção de morto — **sem** novas features, DB, RBAC ou mudança de fórmulas

---

## Princípios

1. **Uma fachada pública** para insights/scores/alertas: `@/lib/enterprise` → `composeEnterpriseInsights` / `runEnterpriseEngine`
2. **Fórmulas intactas** — Executive AI, Business Health e sinais 29.4 permanecem implementação
3. **Eliminar colisões de nome** (`buildExecutiveIntelligence` ×2)
4. **Remover UI/engines dormantes** e barrels sem consumidores
5. **Sem ciclo** no barrel: `lib/enterprise/intelligence.ts` não importa `@/lib/enterprise`

---

## Nomenclatura oficial

| Nome | Papel | Local |
|------|--------|--------|
| `composeEnterpriseInsights` / `runEnterpriseEngine` | Pack unificado (scores, sinais, alertas, recomendações) | `lib/enterprise/intelligence.ts` |
| `presentEnterpriseInsightCards` | Apresentação genérica | idem |
| `buildPremiumInsights` | Cards UI premium | `lib/dashboard/premium-dashboard-map.ts` |
| `composeOpsExecutiveIntelligence` | Ops/fluxo | `lib/dashboard/executive-intelligence-loader.ts` |
| `composeCommercialExecutiveIntelligence` | EI comercial (legado) | `lib/intelligence/index.ts` |
| `runExecutiveAiEngine` | Scores/diagnósticos canônicos | `lib/ai/executive-ai-engine.ts` |
| `runBusinessHealthEngine` | Saúde de negócio | `lib/dashboard/business-health-engine.ts` |

Aliases `@deprecated`: ~~removidos na 29.6~~ — ver [PHASE_29_6_ENTERPRISE_UNIFICATION.md](./PHASE_29_6_ENTERPRISE_UNIFICATION.md).

---

## Estrutura final (inteligência)

```
lib/enterprise/
  intelligence.ts            ← fachada oficial
  intelligence-contracts.ts  ← contratos TS
  index.ts                   ← reexporta fachada + ports/adapters
lib/executive-intelligence/  ← implementação sinais 29.4
lib/ai/executive-ai-engine.ts
lib/dashboard/business-health-engine.ts
```

---

## Removido (morto / redundante)

- `lib/executive-insights/**` (composer dormante)
- UI dormante: `components/executive/{insights,intelligence,predictions,action-center,action-plan,copilot,timeline}/`
- `components/dashboard/executive/executive-intelligence-section.tsx`
- Mega-barrel `lib/intelligence/enterprise/index.ts` (0 consumidores do root)
- Stubs 1-linha `lib/enterprise/services/*-service.ts`

---

## Explicitamente fora / backlog 29.6

- Unificar `/inteligencia` GF copilot com a fachada (sem mudar comportamento)
- Remover aliases `@deprecated` após migração total
- Remover engines comerciais se produto confirmar obsolescência
- Atualizar gates legados (`executive-cockpit-premium`) desalinhados do streaming premium

---

## Gate

```bash
npm run lint
npm run build
npm run test:phase29
npm run test:release-candidate
```

Evidências: `docs/testing/evidence/29-5/`
