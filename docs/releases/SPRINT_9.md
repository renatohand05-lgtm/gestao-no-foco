# Release Notes — Sprint 9

**Produto:** Gestão no Foco  
**Ciclo:** Sprint 9 (Architecture Freeze → Performance → Comercial → RC)  
**Status:** Release Candidate (9.9.2) — encerrada para início da Sprint 10  
**Data de fechamento:** 2026-07-13

---

## Funcionalidades entregues

### Financeiro (base herdada + estabilização)
- DRE por competência com dados reais
- Fluxo de Caixa real (previsto/realizado), paginação server-side da listagem (9.8.4)
- Contas a Receber / Contas a Pagar enterprise (ciclo anterior, preservado)

### Dashboard executivo
- KPIs reais (faturamento, margem, EBITDA, ticket, fluxo)
- Streaming com Suspense (9.8.3)
- Rankings (clientes, produtos, serviços, categorias)
- Inteligência operacional (alertas, prioridades, health score, checklist)
- Qualidade operacional (ordens/retornos)

### Metas e projeção (9.8.5–9.8.6)
- Tabela `metas_vendas_mensais` (geral e por centro)
- CRUD em Configurações → Metas
- Projeção por dias corridos e dias úteis
- Ritmo, gap, necessário/dia, status

### Painel Comercial (9.8.7–9.9)
- Performance Comercial, meta diária, evolução acumulada, heatmap
- Rankings comerciais, centros, ticket, insights determinísticos
- Exportação CSV / Excel / PDF
- Soft delete de metas com confirmação (9.9.1)
- Isolamento de erro por seção (9.9.1)

---

## Melhorias

- Formatters unificados (`lib/format/`)
- Tipos compartilhados (`PaginatedResult`, `ActionResult`)
- Design System documentado (`ds*` tokens)
- Drill-downs com filtros na URL
- Exclusão segura de metas (soft delete + modal)

---

## Performance

- `React.cache` por request (auth, tenant, loaders)
- Consultas paralelizadas no dashboard e qualidade
- Streaming do dashboard (Hero/KPIs antes de blocos pesados)
- Paginação do Fluxo sem alterar resumo/saldo
- **Sem** cache financeiro cross-request

---

## Arquitetura

- Architecture Freeze (9.7) documentado
- Module / Service / UI standards
- Fonte oficial de receita: DRE `receita_bruta`
- Isolamento multi-tenant + RLS preservados

---

## Segurança

- Soft delete (sem hard delete de histórico financeiro/metas)
- Validação server-side de tenant em actions
- Soft delete de movimentações bancárias bloqueado (estorno apenas)
- Dialogs de exclusão com confirmação e anti–double-click

---

## Correções (fechamento)

- Warning React `<title>` SVG (children array)
- Ranking de serviços → detalhe no módulo Produtos & Serviços
- Órfãos removidos (loading-state, metric-card, comercial-error-state, metas section legado)
- App Router: `loading.tsx` / `error.tsx` / `not-found.tsx` nas rotas críticas (9.9.2)

---

## Fora de escopo / backlog Sprint 10

| Item | Motivo |
|------|--------|
| Canal / origem de venda | Sem campo no modelo |
| Vendedor comercial | Sem vínculo real em vendas |
| Meta de ticket | Sem estrutura |
| Feriados em dias úteis | Limitação documentada |
| Formulário nova movimentação / UI estorno | Backlog financeiro |
| CRUD Ordens / Relatórios / Fornecedores | Stubs / backlog |
| Agregações SQL (GROUP BY via RPC) | Evolução de performance |

---

## Compatibilidade

- Migrations históricas: **não** alteradas neste RC
- DRE, Fluxo, CR/CP, faturamento: **inalterados** no 9.9.x
- Next.js 16 + `proxy.ts`

---

## Como validar o RC

```bash
npm run lint
npm run build
```

Documentação: [ARCHITECTURE.md](../architecture/ARCHITECTURE.md) · [PERFORMANCE.md](../architecture/PERFORMANCE.md) · [COMERCIAL_ENTERPRISE.md](../architecture/COMERCIAL_ENTERPRISE.md) · [METAS_VENDAS.md](../architecture/METAS_VENDAS.md)
