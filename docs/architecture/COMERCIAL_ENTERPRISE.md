# Comercial Enterprise — Sprint 9.9

Extensão do Painel Comercial 9.8.7. **Não substitui** a arquitetura do Dashboard (streaming, loaders, KPIs, charts). Evolui apenas o bloco comercial já existente.

Ver também: [PAINEL_COMERCIAL.md](./PAINEL_COMERCIAL.md) (baseline 9.8.7).

---

## Auditoria (existe / falta)

| Dimensão | Status | Notas |
|----------|--------|--------|
| Meta mensal (geral / centro) | Existe | `metas_vendas_mensais` + CRUD 9.8.5 |
| Projeção (úteis / corridos) | Existe | `buildMetaProjecao` 9.8.6 — **não alterar** |
| Faturamento diário / realizado | Existe | Mesmas regras DRE (vendas `faturado` + `subtotal` + CR avulsas) |
| Ticket médio | Existe | Vendas faturadas `total` ÷ qtd |
| Meta de ticket | **Falta** | `auditoria.tem_meta_ticket = false` |
| Canal / origem | **Falta** | `auditoria.tem_canal = false` — sem migration / mock |
| Vendedor | **Falta** | `auditoria.tem_vendedor = false` — rankings.vendedores = [] |
| Rankings clientes/produtos/serviços | Existe | Via `createDashboardService(tenantId, null).getRankingsData` |
| Rankings centros | Existe | Derivado das linhas do painel |
| Heatmap / evolução acumulada | Existe (9.9) | Campos diários enriquecidos |
| Insights determinísticos | Existe (9.9) | `buildCommercialInsights` |
| Feriados | **Falta** | Dias úteis = seg–sex apenas |

---

## Fórmulas (reuso 9.8.5–9.8.7)

- **Meta / atingimento / gap / ritmo / status:** motor `buildMetaProjecao` (inalterado).
- **Meta diária:** `meta ÷ dias_úteis_do_mês` em dias úteis; fim de semana = 0.
- **Projeção futura no diário:** média útil atual nos dias úteis futuros.
- **Acumulado meta:** soma progressiva de `meta_diaria`.
- **Diferença:** `realizado − meta_diaria`; acumulada: `acumulado_realizado − acumulado_meta`.

---

## Tendência

Janela: últimos 7 dias vs 7 anteriores (faturamento diário).

| Critério | Resultado |
|----------|-----------|
| `diasComMovimento < TENDENCIA_MIN_DIAS` (3) **ou** variação `null` | `insuficiente` |
| variação > +3 p.p. | `crescente` |
| \|variação\| ≤ 3 | `estavel` |
| variação < −3 | `decrescente` |

Centros: tendência fixa `insuficiente` (sem janela 7d por centro nesta sprint) — **nunca inventar `estavel`**.

`tendencia_insuficiente` no painel espelha `tendencia === "insuficiente"`.

---

## Probabilidade / confiança

**Confiança** (inalterada 9.8.7):
- baixa: &lt; 3 dias úteis decorridos **ou** &lt; 3 vendas
- média: &lt; 10 dias úteis
- alta: demais

**Probabilidade** (score 0–100):
- cobertura projeção útil / meta (0–40)
- ritmo (0–20)
- tendência (0–20): crescente 20 · estável 12 · **insuficiente 8** · decrescente 4
- estabilidade / volatilidade (0–20)
- penalidade ×0,6 se amostra &lt; 3 dias úteis

Estimativa gerencial — sem IA, sem feriados, sem sazonalidade externa.

---

## Heatmap

`resolveHeatmapBand` classifica cada dia: fim de semana, futuro, sem meta, zero, muito abaixo / abaixo / no ritmo / acima / muito acima (faixas de `diferenca_pct` vs meta diária).

---

## Insights

`buildCommercialInsights` — determinístico, baseado em dados reais:
acelerando, desacelerando, projeção abaixo, meta provável, ticket ±, concentração cliente (≥35%), centro abaixo do ritmo, necessário/dia acima da média útil (+15%).

`impactos` permanece por compatibilidade 9.8.7 e é derivado dos insights (`buildImpactosFromInsights`).

---

## Componentes UI

Pasta `components/dashboard/comercial/`:

| Arquivo | Papel |
|---------|--------|
| `comercial-panel.tsx` | Orquestrador |
| `comercial-performance-summary.tsx` | Métricas + gap/prob/confiança |
| `comercial-daily-target.tsx` | Restante, dias úteis, nec/dia, ritmo |
| `comercial-daily-evolution.tsx` | Barras diárias + acumulado meta/real/proj |
| `comercial-heatmap.tsx` | Calendário mensal |
| `comercial-rankings.tsx` | Top clientes/produtos/serviços/centros |
| `comercial-centers-table.tsx` | Tabela por centro |
| `comercial-ticket-summary.tsx` | Ticket |
| `comercial-channel-section.tsx` | Empty explicativo canal/share |
| `comercial-insights.tsx` | Cards de insight |
| `comercial-export-actions.tsx` | CSV / Excel / PDF |
| `comercial-skeleton.tsx` | Estados de loading |
| `comercial-section-boundary.tsx` | Isolamento de erro por seção |

Export público inalterado: `DashboardCommercialPanel` + `DashboardCommercialPanelSkeleton` em `dashboard-commercial-panel.tsx` (streaming continua igual).

---

## Drill-downs

- Métricas / ticket → vendas do mês (filtros da competência)
- Dia (barras / heatmap) → vendas do dia
- Centro / ranking centro → vendas com `centroCusto`
- Rankings clientes/produtos/serviços → `buildRankingItemHref`

---

## Exportação

`lib/metas/commercial-export.ts`: Resumo, Centros, Diário, **Rankings**, **Insights**. Folha Canais **omitida** quando vazia.

---

## Integração (não mudar)

- `CommercialPanelBlock` + `loadDashboardCommercialPanel(tenantId, filters)` — **sem** argumento `segment`
- Factory: `createCommercialPanelService(tenantId)` apenas
- Rankings: fetch paralelo interno com `createDashboardService(tenantId, null)` — só para o painel comercial
- Não alterar DRE, Fluxo, CR/CP, metas CRUD, `buildMetaProjecao`, regras de faturamento

---

## Trabalho futuro

- Campo canal/origem em vendas (com migration aprovada) + share 13m
- Campo / dimensão vendedor
- Meta de ticket
- Calendário de feriados no motor de dias úteis
- Tendência 7d por centro de custo
- Meta diária ponderada

---

## Sprint 9.9.1 — fechamento

| Pendência | Status |
|-----------|--------|
| Soft delete de metas no portal | Feito |
| Isolamento de erro por seção (`ComercialSectionBoundary`) | Feito |
| Ranking serviços → detalhe do item | `/produtos/[id]` (módulo compartilhado Produtos & Serviços; não existe `/servicos/[id]`) |
| Warning React `<title>` com children em array (SVG charts) | Feito — string única |
| Orphan `dashboard-metas-projecao-section` / `loadDashboardMetas` | Removidos |
| RC 9.9.2 — limpeza + App Router + release notes | Feito |

Pendências de modelagem (canal, vendedor, feriados, meta de ticket) permanecem no backlog — **não** são críticas da Sprint 9.
