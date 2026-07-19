# Painel Comercial Executivo — Sprint 9.8.7

Painel de alta gestão sobre Metas e Projeção, com identidade do Gestão no Foco.

> **Extensão 9.9:** ver [COMERCIAL_ENTERPRISE.md](./COMERCIAL_ENTERPRISE.md) — evolui este baseline (insights, heatmap, rankings, tendência `insuficiente`, UI modular). **Não substitui** a arquitetura do Dashboard (streaming / loaders).

---

## Fontes oficiais

| Indicador | Fonte |
|-----------|--------|
| Faturamento / realizado / diário | Mesmas regras DRE: vendas `faturado` + `subtotal` + CR avulsas |
| Ticket / qtd. vendas | Dashboard: `total` ÷ contagem de vendas faturadas |
| Metas | `metas_vendas_mensais` (CRUD 9.8.5 inalterado) |
| Projeções | Motor 9.8.6 (`buildMetaProjecao`) |

---

## Critérios

### Tendência (janela 7 dias vs 7 anteriores)
- crescente: variação > +3 p.p.
- estável: |variação| ≤ 3
- decrescente: < −3
- **9.9:** `insuficiente` se &lt; 3 dias com movimento na janela ou variação nula (`TENDENCIA_MIN_DIAS`)

### Confiança
- baixa: &lt; 3 dias úteis decorridos **ou** &lt; 3 vendas
- média: &lt; 10 dias úteis
- alta: demais

### Probabilidade de atingir a meta (determinística)
Score 0–100:
- cobertura projeção útil / meta (0–40)
- ritmo atual vs esperado (0–20)
- tendência (0–20) — insuficiente ≈ 8 (9.9)
- estabilidade / baixa volatilidade (0–20)
- penalidade se amostra &lt; 3 dias úteis

Faixas: muito baixa (&lt;20), baixa, moderada, alta, muito alta (≥80).

**Limitação:** estimativa gerencial; sem IA; sem feriados; sem sazonalidade externa.

### Meta diária
`meta ÷ dias úteis do mês` em seg–sex; fim de semana = 0. Evolução futura: ponderada.

---

## Canal / share 13 meses

**Não implementado com dados** — `vendas` não tem campo canal/origem.

- Componente/tabela e share em estado vazio explicativo
- Sem migration nesta sprint (requer aprovação)
- Sem mock

---

## Exportação

CSV / Excel / PDF do resumo, centros e diário (`lib/metas/commercial-export.ts`).  
**9.9:** também rankings + insights; canais omitidos quando vazios.

---

## Performance

- Agregações slim (`subtotal`/`total`/`data_venda`)
- `Promise.all` no painel
- Suspense + `React.cache` (`loadDashboardCommercialPanel`)
- Sem cache financeiro cross-request
