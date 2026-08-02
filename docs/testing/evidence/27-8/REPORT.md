# Sprint 27.8 — REPORT FINAL

**Data:** 2026-08-01  
**Decisões:** 1A (GFSelect + críticos + fallback nativo) · 2B (migration arquivo, sem executar SQL)  
**Classificação (27.8):** **APROVADO COM RESSALVAS** (pré-migration)  
**Encerramento:** ver **Sprint 27.8.1** → `docs/testing/evidence/27-8-1/REPORT.md`  
**Classificação pós-migration:** **APROVADO EM RUNTIME PÓS-MIGRATION**  
**Git:** working tree apenas — **sem commit / push / deploy**

---

## MIGRATION — APLICADA (27.8.1)

Arquivo aplicado manualmente no Supabase (operador):

```
supabase/migrations/20260801_sprint_27_8_service_fields.sql
```

SQL Editor: Success. No rows returned. Homologação runtime em 27.8.1.

---

## Causa do select branco

Dropdown nativo do SO ignora tokens do tema. `gofControl` só estilizava o trigger fechado.

## Correção de selects

| Camada | Entrega |
|--------|---------|
| Canônico | `components/gf/gf-select.tsx`, `gf-combobox.tsx` (Base UI + `bg-popover`) |
| Fallback | `components/ui/native-select.tsx` + CSS `color-scheme` / `option` em `globals.css` |
| Migrados (GFSelect) | Venda rápida (pagamento/cliente/conta/desconto), faturar+receber, filtros vendas, venda formal, filtros produtos, filtros DRE, DRE comparativo, OS faturamento + canal aprovação |
| Nativos seguros (`NativeSelect` + CSS `color-scheme`) | OS (abrir, mecânico, recurso, orçamento, desconto, veículo, inspeção), CI filters, picker de produto na venda rápida |

## Produto × Serviço

- Hub com abas + CTAs separados
- Form bifurcado (campos de serviço)
- Seletor OS com “Adicionar produto | serviço”
- Rotas: `/produtos/servicos`, `/gerenciar-servicos`, `/qualidade-servicos`

## Limpeza / import / qualidade

- Preview + confirmação `LIMPAR SERVIÇOS`
- Soft-delete sem dependência; desativa com uso em vendas/OS
- Não toca produtos nem histórico
- Import estendido (custo MO, preço sugerido, tempo)

## DRE Comparativo

- `/{tenant}/financeiro/dre?comparativo=1`
- Duas chamadas `getDre` — **cálculos canônicos intactos**
- Semântica `getDreVarianceSemantic` (receita/despesa/margem)
- Export CSV / Excel / impressão; drill; mobile cards

## Testes / gates

| Gate | Resultado |
|------|-----------|
| `npm run test:sprint-27-8` | PASS (57) |
| lint / build / rbac / finance / supply / inventory / RC | 0 FAIL (última validação da sprint) |

Scripts: `test:gf-select`, `test:payment-select`, `test:product-service-separation`, `test:service-*`, `test:dre-*`.

## Ressalvas

1. **Migration ainda não aplicada no banco**
2. Screenshots Playwright não gerados automaticamente
3. Nativos não migrados para GFSelect podem ainda depender do SO (mitigados por `NativeSelect` + CSS)
4. PDF via impressão do browser

## Identidade / regras preservadas

- Paleta e logo intactos
- `composeDreTotals` / ledger DRE não alterados
- Soft-delete apenas; sem hard delete em massa
- Histórico de vendas/OS preservado
