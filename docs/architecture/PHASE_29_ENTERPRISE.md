# Fase 29 — Arquitetura Enterprise e Padronização da Base

**Sprint de referência:** 29.0  
**Status:** Base estrutural — sem mudança de regras de negócio  
**Pré-requisito:** Fase 28 concluída (release oficial registrada)

---

## Objetivo da Sprint 29.0

Organizar e fortalecer a arquitetura da aplicação: limpeza estrutural, redução de acoplamento via barrels, documentação de padrões e gate `test:phase29`.

**Não faz parte desta sprint:** alterar cálculos, RBAC, migrations, APIs públicas ou comportamento de UI.

---

## Freeze (obrigatório)

Não modificar lógica / contratos de:

- Banco, Supabase, migrations, SQL, RLS, policies
- Regras financeiras, DRE, Fluxo de Caixa
- Dashboard, Analytics, CRM, OS, Financeiro (PT), Estoque, Agenda
- Permissões / RBAC

`lib/finance` (EN enterprise) e `lib/financeiro` (PT legacy) permanecem dual por design — ver [FINANCE_ARCHITECTURE.md](./FINANCE_ARCHITECTURE.md).

Exceção permitida na 29.0: troca de **paths de import** (sem mudar símbolos/assinaturas) para quebrar ciclos de barrel.

---

## Padrões canônicos (declarativos)

Referências oficiais existentes:

| Tema | Documento |
|------|-----------|
| Mapa do repo | [ARCHITECTURE.md](./ARCHITECTURE.md) |
| Módulos | [MODULE_STANDARD.md](./MODULE_STANDARD.md) |
| Services / Actions | [SERVICE_STANDARD.md](./SERVICE_STANDARD.md) |
| Formatters | [FORMATTERS.md](./FORMATTERS.md) |
| Barrels | [BARREL_POLICY.md](./BARREL_POLICY.md) |

| Camada | Padrão canônico |
|--------|-----------------|
| Services | `createXService` + class (`SERVICE_STANDARD`) |
| Server Actions | `lib/<dom>/actions.ts` ou `*-actions.ts`; retorno `ActionResult` com `success` |
| Validators | Preferir `validations.ts` (Zod) em módulos novos |
| Format | `@/lib/format` |
| Errors (actions) | `toActionError` + `ActionResult` |
| Hooks | Só transversais em `hooks/` |
| DTOs | Manter `*Input` / `*Row` (sem layer nova nesta fase) |
| Providers React | `components/platform/*`; não confundir com “provider” de AI/import |

---

## Entregas 29.0

1. Documentação Fase 29 + política de barrels
2. Remoção de barrels mortos e pasta vazia `lib/phase28/`
3. Quebra de self-import `@/lib/finance` nas actions internas (deep/relative paths)
4. Extensão aditiva de `ActionResult` (`ActionResultWith<T>`)
5. Gate `npm run test:phase29`

---

## Backlog 29.1+ (dívida documentada)

- ~~Performance Enterprise (29.1)~~ → ver [PHASE_29_1_PERFORMANCE.md](./PHASE_29_1_PERFORMANCE.md)
- ~~Permissões batch/cache (29.2)~~ → ver [PHASE_29_2_PERMISSIONS.md](./PHASE_29_2_PERMISSIONS.md)
- ~~UX Premium (29.3)~~ → ver [PHASE_29_3_UX.md](./PHASE_29_3_UX.md)
- ~~Inteligência Executiva (29.4)~~ → ver [PHASE_29_4_EXECUTIVE_INTELLIGENCE.md](./PHASE_29_4_EXECUTIVE_INTELLIGENCE.md)
- ~~Unificação Enterprise Engine (29.5)~~ → ver [PHASE_29_5_ENTERPRISE_ENGINE.md](./PHASE_29_5_ENTERPRISE_ENGINE.md)
- ~~Unificação definitiva (29.6)~~ → ver [PHASE_29_6_ENTERPRISE_UNIFICATION.md](./PHASE_29_6_ENTERPRISE_UNIFICATION.md)
- ~~Homologação / Release (29.7)~~ → ver [PHASE_29_7_HOMOLOGATION.md](./PHASE_29_7_HOMOLOGATION.md)
- ~~Release Audit / Browser QA (29.8)~~ → ver [PHASE_29_8_RELEASE_AUDIT.md](./PHASE_29_8_RELEASE_AUDIT.md)
- Renomeação em massa de validators (`*-validation` → `validations.ts`)
- Unificação gradual `success` (actions) vs `ok` (services)
- ESLint unused-imports global (com correção incremental)
- Migração em massa para `toActionError` (cuidado com mensagens ao usuário)
- Extração de helpers RBAC compartilhados (fora do freeze atual)
- Merge eventual `finance` / `financeiro` (sprint dedicada)
- Layer DTO explícita (aliases, sem novos shapes)
- Hooks por domínio apenas quando houver estado client reutilizável real

---

## Gate

```bash
npm run lint
npm run build
npm run test:phase29
npm run test:release-candidate
```

Evidências: `docs/testing/evidence/29-0/`
