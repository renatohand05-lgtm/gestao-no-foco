# Finance KPIs & Dashboards — Fase 22

**Sprint:** 22.0 (design)

---

## 1. KPIs canônicos

| KPI | Definição | Fonte | Periodicidade |
|-----|-----------|-------|---------------|
| **Saldo Atual** | Soma saldos contas ativas | Bank movements / contas | Tempo real / cache |
| **Saldo Previsto** | Saldo atual + entradas previstas − saídas previstas (horizonte H) | Fluxo (CR/CP abertos) | Diário |
| **Saldo Futuro** | Saldo previsto em data D | Forecast / Fluxo | Diário |
| **Receitas** | Entradas de competência ou caixa (modo explícito) | DRE ou Fluxo | Período |
| **Despesas** | Saídas de competência ou caixa | DRE ou Fluxo | Período |
| **Fluxo** | Entradas − saídas de caixa no período | Fluxo | Período |
| **Lucro** | Resultado líquido (competência) | DRE | Período |
| **Margem** | Lucro / Receita líquida | DRE | Período |
| **EBITDA** | Conforme linhas DRE Enterprise | DRE | Período |
| **Burn Rate** | Consumo médio de caixa / mês | Fluxo (PME) | Mensal |
| **Runway** | Saldo atual / burn rate | Derivado | Mensal |
| **Liquidez** | Ativo circulante financeiro / passivos curtos (proxy: saldo / CP 30d) | CR/CP + saldo | Semanal |
| **Capital de Giro** | Proxy: saldo + CR curto − CP curto | CR/CP + saldo | Semanal |

### Modos de cálculo

Todo KPI financeiro deve declarar:

```ts
type KpiMode = "caixa" | "competencia";
```

UI nunca mistura modos sem rótulo.

---

## 2. Dashboards

### 2.1 Financeiro Executivo

**Objetivo:** visão do dono/gestor em 1 tela.

Widgets:
- Saldo Atual / Previsto / Futuro (7/30/90d)
- Receitas × Despesas (modo selecionado)
- Lucro, Margem, EBITDA
- Burn Rate + Runway (PME)
- Alertas (Approval, vencimentos, anomalias)
- Atalhos: CP vencendo, CR em atraso, dias sem fechamento

### 2.2 Fluxo de Caixa

**Objetivo:** tesouraria operacional (já existe base).

- Série diária realizado × previsto
- Filtro por conta / centro / forma
- Drill-down para movimentos e títulos
- Export

### 2.3 Conciliação

**Objetivo:** bater extrato × sistema.

- Sessões abertas/fechadas
- Linhas não conciliadas
- Sugestões de match (regras + IA futura)
- Taxa de conciliação (% do período)

### 2.4 Tesouraria

**Objetivo:** posição por conta/caixa.

- Saldos por `BankAccount` / `CashRegister`
- Transferências recentes
- Limites / avisos de saldo baixo
- Caixas abertos sem fechamento

### 2.5 Centros de Custo

**Objetivo:** performance gerencial.

- Despesas/receitas por centro
- Orçado × realizado (quando Budget existir)
- Ranking de centros
- Drill-down para títulos

---

## 3. IA (planejamento — sem engine nova)

Consumir padrões existentes de intelligence/observability; **não** criar LLM engine na Fase 22.0.

| Capacidade | Entrada | Saída |
|------------|---------|-------|
| **Alertas** | KPIs + thresholds | Notification + Timeline |
| **Insights** | DRE/Fluxo deltas | Cards executivos |
| **Forecast** | Histórico + sazonalidade vertical | `ForecastScenario` |
| **Anomalias** | Movimentos fora do padrão (σ / regras) | Alerts Observability |
| **Recomendações** | Orçado×real, liquidez | Lista acionável |

Integração: `FinanceKpiService` → `Notifications` + `Observability` alerts + opcional Approval para ações.

---

## 4. Contratos de read model

```ts
interface FinanceKpiSnapshot {
  tenantId: string;
  period: Period;
  mode: "caixa" | "competencia";
  saldoAtual: number;
  saldoPrevisto: number;
  saldoFuturo: number;
  receitas: number;
  despesas: number;
  fluxo: number;
  lucro: number;
  margem: number;
  ebitda: number;
  burnRate: number | null;
  runwayMonths: number | null;
  liquidez: number | null;
  capitalGiro: number | null;
  generatedAt: string;
}
```
