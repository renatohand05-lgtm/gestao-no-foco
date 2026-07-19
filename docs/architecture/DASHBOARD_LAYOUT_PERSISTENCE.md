# Dashboard Layout Persistence

Sprint 13.6 — Workspace Persistence Enterprise

## Auditoria inicial (pré-implementação)

| Item | Situação anterior |
|------|-------------------|
| Motor | `lib/dashboard-layout/*` — estado puro em memória |
| Snapshot JSON | Schema `version: 1` (`DashboardLayoutSnapshot`) |
| Persistência | Nenhuma (React state; `savedLayouts` só na sessão) |
| localStorage | Não usado para layouts |
| Presets | ceo, financeiro, comercial, operacional, rh, oficina, restaurante, consultoria |
| RLS/tenant | Sem tabela |

## Modelo de banco

Tabela `public.dashboard_layouts`:

- `id`, `tenant_id`, `user_id`, `name`, `preset_key`
- `layout_data` (jsonb) — snapshot versionado
- `density` — `executive` \| `comfortable` \| `compact`
- `is_default`, `is_active`, `version`
- `created_at`, `updated_at`, `deleted_at` (soft delete)

Índice único parcial: um layout padrão por `(tenant_id, user_id)` onde `is_default` e não deletado.

## RLS

Políticas exigem:

1. `user_id = auth.uid()`
2. Membership em `tenant_members` para o `tenant_id`

Sem policy de DELETE físico — apenas soft delete via UPDATE.

## Formato JSON (`layout_data`)

```json
{
  "version": 1,
  "name": "Meu dashboard",
  "presetId": "ceo",
  "updatedAt": "2026-07-14T12:00:00.000Z",
  "compactMode": false,
  "densityProfile": "comfortable",
  "blocks": [
    { "id": "hero", "visible": true, "density": "normal", "order": 0 }
  ]
}
```

Validação rejeita: JSON inválido, blocos desconhecidos, densidades inválidas, ids duplicados, payload > 48KB, versão ≠ 1.

Blocos faltantes são completados com defaults seguros.

## Versionamento

Coluna `version` inteira. Updates falham se `expectedVersion` divergir (`CONFLICT_VERSION`). Cliente exibe conflito e pede reload.

## Fallback de carregamento

1. Layout `is_default` do usuário × tenant  
2. Senão, mais recente (`updated_at`)  
3. Senão, preset CEO em memória  
4. Erros de banco → fallback CEO (página nunca quebra)

## Conflito local × remoto

| Situação | Regra |
|----------|--------|
| Fonte da verdade | Layout persistido |
| Edição | Estado local temporário |
| Salvar | Confirma e atualiza baseline |
| Descartar | Restaura bootstrap hidratado |
| Troca de preset com dirty | Diálogo de confirmação |
| Troca de layout na biblioteca com dirty | Bloqueado até salvar/descartar |

## Fluxo de salvamento

- Edição local livre (sem save a cada movimento)
- Salvar explícito (toolbar / Salvar como)
- Sem polling

## Gerenciamento

Biblioteca **Meus layouts**: abrir, renomear, definir padrão, excluir, importar, exportar, restaurar preset CEO.

## Migration

Arquivo: `supabase/migrations/20260715_create_dashboard_layouts.sql`

**Executar manualmente no Supabase SQL Editor.** Não rodar automaticamente em produção.

## Limitações

- Sem marketplace / compartilhamento entre usuários
- Sem migração localStorage (não existia)
- Coordenadas absolutas não são armazenadas (só ordem/visibilidade/densidade — responsivo preservado)

## Camada de código

- `lib/dashboard-layout/persistence/`
- `lib/dashboard-layout/actions.ts`
- Hidratação: `app/(app)/[tenant]/dashboard/page.tsx` → `bootstrapDashboardLayoutSafe`

## Drag & Drop (Sprint 13.7)

Reordenação no editor usa Pointer Events + teclado (`use-layout-dnd`) e chama apenas `moveTo` no estado local. **Não** grava no banco a cada movimento. Detalhes: [DASHBOARD_DRAG_DROP.md](./DASHBOARD_DRAG_DROP.md).
