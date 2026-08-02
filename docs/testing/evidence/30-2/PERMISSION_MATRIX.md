# Matriz de permissões

**Implementação:** `lib/equipe/roles-matrix.ts` + `components/equipe/roles-matrix-panel.tsx`

- Eixos: módulos × capacidades × papéis sistema
- Fonte: `ALL_PERMISSION_KEYS` + `ROLE_PERMISSIONS` (sem duplicar catálogo)
- Navegável / responsiva (scroll controlado)
- Módulos cobertos incluem Dashboard, CRM, Vendas, Estoque, Financeiro, Analytics, Usuários, Auditoria, etc.

**Teste:** `npm run test:phase30-permissions-matrix` — 0 FAIL
