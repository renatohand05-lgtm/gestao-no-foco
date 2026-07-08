# Módulo Clientes — Enterprise

## SQL (rodar manualmente)

1. `supabase/migrations/20260708_create_clientes.sql` (se ainda não rodou)
2. `supabase/migrations/20260708_enterprise_clientes.sql` (novos campos)

## Arquitetura

```
types/clientes.ts
lib/clientes/
  constants.ts
  masks.ts
  format.ts
  validations.ts      ← Zod
  mappers.ts          ← normalização e form defaults
  cliente-service.ts  ← data layer
  actions.ts          ← server actions
components/clientes/
  cliente-form.tsx
  cliente-detail.tsx
  cliente-table.tsx
  cliente-search.tsx
  cliente-sort.tsx
  cliente-pagination.tsx
  cliente-feedback.tsx
  ...
```

## Rotas

| Rota | Função |
|------|--------|
| `/[tenant]/clientes` | Listagem + busca + ordenação |
| `/[tenant]/clientes/novo` | Cadastro |
| `/[tenant]/clientes/[id]` | Detalhes |
| `/[tenant]/clientes/[id]/editar` | Edição |

## Feedback

`?success=created|updated|deleted` e `?error=` na URL.
