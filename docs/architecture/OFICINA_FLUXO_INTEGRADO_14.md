# Fluxo integrado oficina — Sprint 14 Adendo

Objetivo: operação rápida para oficinas — OS com cadastro inline, venda de balcão, descontos com alçada e dashboards.

## Migration

Arquivo: `supabase/migrations/20260728_oficina_fluxo_integrado.sql`

**Aplicar manualmente** no Supabase SQL Editor (após CRM 20260726/20260727).

Depois, no app (uma vez por tenant, como membro autenticado), as seeds podem ser chamadas via:

- `seed_desconto_alcadas_padrao(tenant_id)`
- `seed_role_permissions_padrao(tenant_id)`

Ou automaticamente no primeiro uso de `PermissionService.ensureSeeds()`.

### Conteúdo principal

| Área | Detalhe |
|------|---------|
| Vendas | `consumidor_nao_identificado`, `canal_venda`, `vendedor_id`, metadados de desconto/cancelamento |
| OS | campos de desconto orçamento + autorização |
| `desconto_alcadas` | limites por cargo |
| `desconto_eventos` | auditoria de descontos |
| `venda_devolucoes` | devolução parcial com estorno de estoque |
| `tenant_role_permissions` | chaves granulares |
| RPC `abrir_os_com_cliente_atomico` | cliente + veículo + OS atômicos + antiduplicidade |
| RPC `ensure_consumidor_balcao` | cliente sistema para balcão |

## Rotas

| Rota | Função |
|------|--------|
| `/[tenant]/ordens/nova` | OS com busca / novo cliente / placa |
| `/[tenant]/vendas/rapida` | Venda rápida / balcão |
| `/[tenant]/vendas/dashboard` | KPIs de vendas |
| `/[tenant]/descontos/dashboard` | KPIs de descontos |

## Regras de desconto (padrão)

| Cargo | Limite % |
|-------|----------|
| member / mecânico | 0% |
| supervisor_operacao | 5% |
| gerente_operacao | 15% |
| admin | 30% |
| owner | 100% |

Sem motivo → bloqueado. Acima da alçada → pendente/bloqueado. Margem abaixo do mínimo → aprovação superior.

## Permissões

- `venda_rapida.criar`
- `venda_rapida.sem_cliente`
- `desconto.aplicar` / `desconto.aprovar` / `desconto.abaixo_margem`
- `venda.cancelar` / `venda.devolver` / `venda.editar_concluida`
- `estoque.estornar` / `estoque.saldo_negativo`
- `dashboard.descontos.ver`
- `os.criar_cliente_forcado`

## Testes

```bash
npm run test:oficina
npm run test:crm
npm run lint
npm run build
```
