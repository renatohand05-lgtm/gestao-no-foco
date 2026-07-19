# Padrão Oficial de Módulos

Todo módulo novo do Gestão no Foco deve seguir esta estrutura.

---

## Estrutura de pastas

```
app/(app)/[tenant]/<modulo>/
  page.tsx                 # listagem (Server)
  novo/page.tsx            # ou nova/page.tsx (feminino quando o domínio exigir)
  [id]/page.tsx
  [id]/editar/page.tsx

components/<modulo>/
  <entidade>-table.tsx
  <entidade>-form.tsx
  <entidade>-detail.tsx
  <entidade>-search.tsx
  <entidade>-sort.tsx
  <entidade>-pagination.tsx
  <entidade>-filters.tsx
  <entidade>-feedback.tsx
  <entidade>-empty-state.tsx
  <entidade>-status-badge.tsx
  <entidade>-row-actions.tsx
  <entidade>-delete-button.tsx
  <entidade>-delete-dialog.tsx

lib/<modulo>/
  constants.ts
  validations.ts           # Zod
  mappers.ts               # form ↔ payload
  format.ts                # display (módulo-local até unificação)
  <entidade>-service.ts    # data layer
  actions.ts               # "use server"
  # opcional: *-utils.ts, *-rpc.ts (financeiro / vendas)

types/<modulo>.ts          # ou types/<subdominio>.ts quando o domínio for grande

hooks/<modulo>/            # somente se houver estado client complexo reutilizável
```

**Referência canônica:** `clientes` (ver também `docs/modulo-clientes.md`).

---

## Responsabilidades

| Camada | Pode | Não pode |
|--------|------|----------|
| **page.tsx** | `requireTenant`, chamar service, montar UI, ler `searchParams` | Mutar banco, conter Zod de write, lógica financeira |
| **components** | Renderizar, coletar input, chamar actions | Acessar Supabase direto, calcular DRE/Fluxo |
| **service** | Queries Supabase tipadas, filtros tenant, paginação | Conhecer cookies/session HTTP, `revalidatePath` |
| **actions** | Sessão/tenant, Zod, mapper → service, revalidate, `ActionResult` | UI, CSS, lógica de layout |
| **validations** | Schemas Zod + tipos inferidos | Side effects |
| **mappers** | Normalizar form → input de service; defaults de formulário | Queries |
| **formatters** | `Intl` / strings de exibição | Regras de negócio |
| **constants** | Paginação, labels, mensagens de success | Secrets |
| **types** | Contratos de lista/detalhe/sort/filtros | Implementação |
| **RPC wrappers** | Encapsular `supabase.rpc(...)` com tipos | Recalcular o que a RPC já faz |

---

## Nomenclatura

- Pastas de domínio: **plural** (`clientes`, `vendas`, `produtos`).
- Arquivos de entidade: **singular** (`cliente-service.ts`, `venda-form.tsx`).
- Rotas de criação: `novo` (padrão) ou `nova` quando o substantivo for feminino (`vendas/nova`, `contas-pagar/nova`).
- Feedback URL: `?success=created|updated|deleted` e `?error=`.

---

## Módulos transversais (exceções documentadas)

| Módulo | Estrutura | Motivo |
|--------|-----------|--------|
| `dashboard` | `lib/dashboard` + `components/dashboard` | Orquestração read-only; filtros via URL/LocalStorage |
| `intelligence` | somente `lib/intelligence` | Consumido pelo dashboard |
| `qualidade-operacional` | `lib/` + UI no dashboard/ordens | KPI operacional; CRUD OS ainda incompleto |
| `design-system` | `lib/design-system` + `components/ui/ds-icon` | Tokens visuais |
| `ui` / `layout` | `components/` apenas | Primitivos compartilhados |

Novos módulos de negócio **não** devem começar como stubs de página sem `lib/` e `types/`.

---

## Checklist rápido ao criar módulo

Ver [DEVELOPMENT_CHECKLIST.md](./DEVELOPMENT_CHECKLIST.md).
