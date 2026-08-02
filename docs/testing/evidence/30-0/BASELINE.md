# Sprint 30.0 — Baseline

**Data:** 2026-08-02  
**Sprint:** 30.0 Premium Review Global  
**Escopo:** auditoria e planejamento — sem alteração funcional  

## Git

| Campo | Valor |
|-------|--------|
| Branch | `main` |
| HEAD | `bd6b15fe556a2754d1a6390e7a16d44523aac4e4` |
| Short | `bd6b15f` |
| origin/main | sincronizado (ahead 0 / behind 0) |
| Tag de referência | `v29.0-enterprise` → commit `b27735a` |
| Merge / rebase / cherry-pick | nenhum pendente |
| Working tree (rastreados) | limpa |
| Untracked | apenas `docs/testing/evidence/27-8-*` (fora de escopo) |

## Últimos commits

```
bd6b15f docs(release): evidência final da Enterprise Release Fase 29
b27735a feat(release): Enterprise Release Fase 29
80037f0 docs(testing): registrar hash do commit corretivo da Sprint 29.10.2
c8d1327 fix(release): homologar schema CRM e Compras da Fase 29
92f1f13 feat(enterprise): concluir arquitetura e homologação da Fase 29
```

## Runtime local

| Item | Status |
|------|--------|
| `npm run dev` | ativo (localhost:3000) |
| Processos Node | presentes (dev esperado — não “presos” sem trabalho) |
| Auth Playwright | `docs/testing/playwright/.auth/user.json` (gitignored) |
| Tenant | `teste-renato-01` |
| Produção | https://gestao-no-foco.vercel.app |

## Restrições desta sprint

- Sem commit / push / deploy  
- Sem SQL remoto / migrations  
- Sem mudança de regras de negócio / cálculos / identidade sem aprovação  
- Correção mínima só se bloquear a auditoria  

## Resultado baseline

**APROVADO** — pronto para homologação autenticada e revisão global.
