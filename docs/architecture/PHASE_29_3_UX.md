# Fase 29.3 — UX Premium, Responsividade e Experiência Enterprise

**Sprint:** 29.3  
**Pré-requisito:** Sprints 29.0–29.2  
**Escopo:** apresentação, a11y e responsividade — **sem** mudança de regras, KPIs, DB ou RBAC

---

## Princípios

1. Preferir **cascade** em `components/ui/*` e chrome (toast/dialog) em vez de editar dezenas de páginas de domínio
2. Tokens `gof*` / EmptyState Brand como fonte visual
3. Skeletons em vez de texto “A carregar…”
4. Toasts em vez de `window.alert` quando ToastProvider estiver montado
5. Labels de a11y em português

---

## Entregas

| Área | Mudança |
|------|---------|
| Skeletons | `BlockSuspenseFallback` + uso em financeiro dashboard/movimentações |
| Feedback | `feedback-tones.ts` unifica toast ↔ FeedbackMessage |
| Toast | `gofFocusRing`, tipografia, tons alinhados |
| Dialog/Sheet | `sr-only` **Fechar** (PT) |
| Empty states | approval / enterprise / notification / workflow / audit → wrappers de `EmptyState` |
| Tables | `overscroll-x-contain touch-pan-x min-w-0` no container |
| Forms | `FormGrid` breakpoint `sm:` (tablets/phones largos) |
| LoadingOverlay | `aria-busy`, tipografia, label “Carregando…” |
| Alerts | inspeção OS, documentos CRM, duplicar conta → toast |

---

## Explicitamente fora / backlog 29.5+

- Reescrever KPIs executivos / CRM pages token-by-token  
- Filtrar sidebar por permissão (29.2 backlog)  
- Substituir todos os `<table>` crus por `Table` em CRM/descontos  
- Unificar API EmptyState vs ExecutiveEmptyState (wrappers bastam por agora)
- Inteligência Executiva 29.4 → ver [PHASE_29_4_EXECUTIVE_INTELLIGENCE.md](./PHASE_29_4_EXECUTIVE_INTELLIGENCE.md)
- Unificação 29.5 → ver [PHASE_29_5_ENTERPRISE_ENGINE.md](./PHASE_29_5_ENTERPRISE_ENGINE.md)

---

## Gate

```bash
npm run lint
npm run build
npm run test:phase29
npm run test:release-candidate
```

Evidências: `docs/testing/evidence/29-3/`
