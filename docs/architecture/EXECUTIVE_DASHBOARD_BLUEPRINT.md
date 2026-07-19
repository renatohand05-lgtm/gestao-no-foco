# Blueprint — Dashboard Executivo Premium

**Sprint atual de experiência:** 12.4 — Executive Experience Refinement (UX only)  
**Origem:** 10.4A  
**Tipo:** Arquitetura visual · UX · documentação  
**Status:** Atualizado na 12.4 (implementação visual vigente)

---

## Sprint 13.2 — Executive Product Excellence

Hero cockpit com risco/oportunidade. Narrativa: Hero → KPIs → Ação → Performance → Insights → Timeline → Detalhe. KPI altura uniforme. Botões/filtros/sidebar padronizados. Canvas `#ebecef`. Zero alteração funcional.

---

## Sprint 13.1 — Final Design Pass

Hero V3 (3 colunas). Sidebar Linear com grupos. Ação principal com ~2× peso visual. Canvas `#e8eaee`. KPIs Metric LG. Zero alteração funcional.

---

## Sprint 13.0 — Product Experience

Hero = painel de comando. KPIs = números XL. Ação = recomendação da diretoria. Canvas neutro `#eef0f3`. Cards `#fafbfc`. Narrativa: status → resultado → gap → tendência → decisão → riscos → detalhe.

Auditoria: [`SPRINT_13_PRODUCT_EXPERIENCE_AUDIT.md`](./SPRINT_13_PRODUCT_EXPERIENCE_AUDIT.md)

---

## Sprint 12.4 — Primeira dobra e narrativa

### Ordem da primeira dobra

1. Top Bar compacta (empresa, online, Novo, Exportar, Buscar, Foco, notificações, avatar)
2. Hero Executivo dominante (score, realizado, meta, gap, projeção, confiança, próxima ação)
3. KPIs principais (6 primários + 6 secundários)
4. Próxima ação (Action Center)
5. Presets de visão (CEO destacado)
6. Filtros em chips
7. Conteúdo detalhado (BI → Prediction → Timeline → Performance → Gráficos → Heatmap → Rankings)

### Narrativa

Como está → Resultado → Quanto falta → Previsão → Prioridade → Ação → Riscos/oportunidades → Onde aprofundar

### Workspace inteligente

Resumo “Hoje” com tarefas do Action Plan, riscos e oportunidades do Business Intelligence, meta/realizado do dia — dados já carregados. Técnico em “Informações do painel”.

### Densidades

Executivo · Confortável · Compacto (estado local; sem persistência de banco).

### Constraints

Zero alteração de banco, loaders, RPCs, serviços, cálculos, motores de BI/EI/Prediction/Timeline/Copilot/Action, Workspace Engine e Layout Engine.

---

## Sumário (histórico 10.4A)

1. [Diagnóstico do Dashboard atual](#1-diagnóstico-do-dashboard-atual)
2. [Objetivos de UX](#2-objetivos-de-ux)
3. [Ordem obrigatória da página](#3-ordem-obrigatória-da-página)
4. [Hero Executivo](#4-hero-executivo)
5. [KPIs Principais](#5-kpis-principais)
6. [Evolução Mensal](#6-evolução-mensal)
7. [Painel Diário](#7-painel-diário)
8. [Heatmap Inteligente](#8-heatmap-inteligente)
9. [Insights Executivos](#9-insights-executivos)
10. [Rankings Executivos](#10-rankings-executivos)
11. [Rodapé Executivo](#11-rodapé-executivo)
12. [Grid e proporções](#12-grid-e-proporções)
13. [Espaçamento](#13-espaçamento)
14. [Tipografia](#14-tipografia)
15. [Cores](#15-cores)
16. [Microinterações](#16-microinterações)
17. [Estados](#17-estados)
18. [Fluxo de leitura](#18-fluxo-de-leitura)
19. [Wireframes ASCII](#19-wireframes-ascii)
20. [Componentes previstos (10.4B)](#20-componentes-previstos-sprint-104b)
21. [Riscos e limitações](#21-riscos-e-limitações)
22. [Dúvidas de produto](#22-dúvidas-de-produto)
23. [Checklist Sprint 10.4B](#23-checklist-sprint-104b)

**Regra desta sprint:** zero alteração de código funcional ou visual.  
**Fontes de dados:** reutilizar loaders/services/projeções/DRE/Fluxo existentes — apenas reorganizar a apresentação na 10.4B.

Tokens de referência: [`DESIGN_SYSTEM.md`](./DESIGN_SYSTEM.md) (`ex*`).

---

## 1. Diagnóstico do Dashboard atual

### 1.1 Ordem atual das seções

Ordem efetiva em `DashboardStreamingView` (`components/dashboard/dashboard-streaming.tsx`):

| # | Bloco | Conteúdo principal |
|---|--------|-------------------|
| 0 | Header | Saud, subtítulo, filtros, exportações |
| 1 | Hero | Saudação, empresa, período, tendência, health/alertas (slot) |
| 2 | Summary KPIs | ~13 cards (DRE + caixa + ticket + vendas + clientes) |
| 3 | Inteligência | Prioridades, health score, checklist, alertas, atividades |
| 4 | Painel Comercial | Hero comercial + performance + meta diária + ticket + insights + evolução + heatmap + rankings + centros + canais |
| 5 | Análise visual | Faturamento diário, receitas×despesas, fluxo acumulado, EBITDA |
| 6 | Rankings Dashboard | Clientes, produtos, serviços, categorias |
| 7 | Qualidade operacional | Seção de OS / qualidade |

### 1.2 Achados de UX

| Problema | Evidência |
|----------|-----------|
| **Excesso de densidade** | Dois “painéis” competem: KPIs financeiros amplos + Painel Comercial completo na mesma página |
| **Excesso de cards** | ~13 KPIs no grid inicial, todos com peso visual similar |
| **Baixa hierarquia** | Meta/projeção/atingimento ficam “enterrados” no Painel Comercial (bloco 4), depois de inteligência e KPIs genéricos |
| **Blocos repetitivos** | Rankings no Painel Comercial **e** no Dashboard; gráficos diários no comercial **e** em Análise visual |
| **Espaços vazios** | Seções com empty states esparsos; canais sempre “preparado/vazio”; skeleton vs conteúdo desencontrados no streaming |
| **Leitura lenta** | Gestor precisa rolar muito para responder “vou bater a meta?” |
| **Competição de atenção** | Health score + prioridades + alertas + KPIs DRE + hero comercial pedem foco ao mesmo tempo |
| **Primário vs secundário confuso** | EBITDA/CMV/saídas previstas aparecem antes de meta/projeção comercial |

### 1.3 Classificação atual: primário × secundário

**Hoje tratados como primários (mas nem todos deveriam ser):**  
Faturamento, receita líquida, EBITDA, CMV, margem, saldo, CR, CP, entradas/saídas, ticket, vendas, clientes.

**Hoje secundários / tardios (mas deveriam ser primários):**  
Meta do mês, atingimento, projeção, gap, necessário/dia, ritmo, heatmap, insight acionável.

### 1.4 Responsividade (problemas observados)

| Breakpoint | Problema |
|------------|----------|
| **Desktop grande** | Página longa demais; dois heróis (Dashboard + Comercial); scroll para “o que importa” |
| **Notebook** | Grid de KPIs denso (muitas colunas com cards altos); comercial + charts empurram rankings para baixo |
| **Tablet** | Tabelas de centros / charts com scroll horizontal; hero comercial + gauge apertados |
| **Mobile** | Empilhamento correto em muitos blocos, mas volume total inviabiliza a resposta em 5s; filtros no header competem com hero |

### 1.5 O que NÃO muda neste blueprint

- Cálculos de meta, projeção, DRE, Fluxo, ticket, rankings, insights determinísticos  
- Loaders, RPCs, SQL, filtros, drill-downs, exportações  
- Semântica dos dados (ex.: receita oficial = DRE `receita_bruta`)

---

## 2. Objetivos de UX

O Dashboard Executivo Premium deve permitir que o gestor responda **em até 5 segundos**:

| Pergunta | Resposta visual (onde) |
|----------|------------------------|
| Como está a empresa? | Hero — status geral + atingimento |
| Vou bater a meta? | Hero — projeção + status do ritmo |
| Quanto falta? | Hero — restante + barra de progresso |
| Qual é a principal prioridade? | Hero — insight principal + Insights (bloco 6) |
| O que preciso fazer hoje? | Insights com CTA + Painel Diário / Heatmap |

**Princípio:** ordem mental = ordem de scroll.  
Nada abaixo do fold deve ser necessário para as três primeiras perguntas.

---

## 3. Ordem obrigatória da página

| # | Bloco | Justificativa |
|---|--------|---------------|
| 1 | **Hero Executivo** | Resposta imediata às 3 perguntas-chave; maior elemento visual |
| 2 | **KPIs Principais** | Detalhe operacional curto após o “como estou” |
| 3 | **Evolução Mensal** | Contexto temporal: caminho até a meta |
| 4 | **Painel Diário** | Operação do dia a dia — “hoje” e ritmo |
| 5 | **Heatmap Inteligente** | Padrão do mês em um olhar (anomalias) |
| 6 | **Insights Executivos** | Prioridades e ações (depois do diagnóstico) |
| 7 | **Rankings Executivos** | Onde está a receita (oportunidade / concentração) |
| 8 | **Rodapé Executivo** | Metadados, export, fontes — sem competir com decisão |

### 3.1 Blocos fora do fluxo primário (decisão de produto)

| Conteúdo atual | Destino proposto (10.4B+) |
|----------------|---------------------------|
| Intelligence completa (checklist, atividades, health detalhado) | Compactar no Hero (status) + Insights; checklist pode virar link “Setup” no rodapé |
| Análise visual (fluxo, EBITDA, receitas×despesas) | Fora do fluxo comercial premium **ou** aba/módulo Financeiro — **dúvida de produto** |
| Qualidade operacional | Seção colapsável / link para `/ordens/qualidade-operacional` — **dúvida de produto** |
| Tabela por centro + canais | Centros: dentro de Rankings ou drawer; Canais: empty até existir dimensão |

---

## 4. Hero Executivo

### 4.1 Conteúdo obrigatório

- Nome da empresa  
- Período selecionado  
- Status geral (faixa semântica: crítico / atenção / no ritmo / acima / atingida / sem meta)  
- Meta do mês  
- Realizado  
- Projeção (dias úteis — mesma regra atual)  
- Atingimento (%)  
- Valor restante  
- Barra de progresso premium  
- Principal insight do período (1 card: título + impacto curto + CTA opcional)

### 4.2 Proporção e grid interno

| Viewport | Layout |
|----------|--------|
| Desktop (≥1280) | 12 cols · Hero full-bleed da área útil · grid interno **8 + 4**: métricas+progress (8) \| gauge+status+insight (4) |
| Notebook (1024–1279) | 12 cols · mesma lógica, padding menor · gauge sob métricas se altura apertar |
| Tablet (768–1023) | 8 cols · stack: título → métricas 2×2 → progress → gauge/status → insight |
| Mobile (<768) | 4 cols · stack completo; números em `kpiPrimary`; insight abaixo |

**Altura mínima sugerida:**  
Desktop ~280–360px de conteúdo útil; Hero = maior bloco acima da dobra.

### 4.3 Hierarquia tipográfica (Hero)

| Elemento | Token | Papel |
|----------|-------|-------|
| Nome empresa / painel | `exTypography.hero` | Identidade |
| Período | `exTypography.subtitle` | Contexto |
| Status | `ExecutiveBadge` / `ExecutiveStatus` | Semântica |
| Meta / Realizado / Projeção / Restante | `exTypography.kpiPrimary` | Protagonistas |
| % atingimento (gauge) | `exTypography.kpiPrimary` + `ExecutiveGauge` | Complementar ao número |
| Insight título | `exTypography.title` (sm) | Ação |
| Labels | `exTypography.label` | Secundário |

### 4.4 Posição das informações (desktop)

```
┌─────────────────────────────────────────────────────────────┐
│ [Empresa]                          [Filtros resumidos]      │
│ Período · Status badge                                       │
│                                                              │
│ Meta        Realizado      Restante       Projeção           │
│ R$ …        R$ …           R$ …           R$ …               │
│                                                              │
│ ████████████░░░░ Progresso  ·  72%  ·  falta R$ …            │
│                                                              │
│                              ┌──────────┐  Insight #1        │
│                              │  Gauge   │  título + CTA      │
│                              └──────────┘                    │
└─────────────────────────────────────────────────────────────┘
```

### 4.5 Estados do Hero

| Estado | Comportamento visual |
|--------|----------------------|
| **Sem meta** | Valores “—” em meta/restante/%; CTA “Cadastrar meta”; tom `info`; progress 0 |
| **Sem dados** | Realizado R$ 0; mensagem “Sem vendas no período”; CTA vendas |
| **Crítico** | Tom `danger`; badge Crítico; insight de risco em destaque |
| **Atenção / abaixo** | Tom `warning` |
| **No ritmo / acima** | Tom `primary` / `success` |
| **Meta atingida** | Tom `success`; restante ≤ 0; copy “Meta atingida”; confete **proibido** (só badge + progress 100%) |

---

## 5. KPIs Principais

Linha (ou grid curto) **logo abaixo do Hero**, sem repetir o hero.

### 5.1 Catálogo

| KPI | Prioridade | Tamanho | Valor principal | Subtítulo | Comparação | Ícone (chave) | Badge | Tendência | Empty | Erro | Drill-down |
|-----|------------|---------|-----------------|-----------|------------|---------------|-------|-----------|-------|------|------------|
| Receita | P0 | Grande | `faturamento` (DRE bruta) | “Receita bruta · DRE” | vs período ant. | `realizado` | — | seta | “—” + hint | card error | `/dre` ou vendas |
| Meta | P0 | Grande | `valor_meta` | Competência | — | `meta` | Sem meta? | — | CTA meta | card error | editar/criar meta |
| Atingimento | P0 | Grande | `%` | Faixa de status | — | `atingimento` | status | — | “—” | card error | — |
| Projeção | P0 | Grande | `projecao_dias_uteis` | “Projeção úteis” | vs ant. se houver | `projecao` | — | seta | “—” | card error | — |
| Gap | P1 | Compacto | `restante_meta` | “Quanto falta” | — | `gap` | — | — | “—” | card error | vendas |
| Necessário/dia | P1 | Compacto | `necessario_por_dia_util` | “Por dia útil” | — | `dias` | — | — | “—” | card error | — |
| Ticket médio | P1 | Compacto | ticket vendas | “Total ÷ qtd” | vs ant. | `ticket` | — | seta | “—” | card error | vendas |
| Clientes | P2 | Compacto | qtd ativos **ou** clientes com venda no período* | Cadastro / período | — | `comparacao` | — | — | 0 | card error | clientes |

\* **Dúvida de produto:** manter “clientes ativos do tenant” (atual) ou “clientes com compra no período”? Blueprint assume **manter fonte atual** até decisão.

### 5.2 Hierarquia visual

- **Grandes (P0):** Receita, Meta, Atingimento, Projeção — 4 colunas em desktop.  
- **Compactos (P1/P2):** Gap, Necessário/dia, Ticket, Clientes — segunda fileira ou mesma fileira com `size=secondary`.

### 5.3 KPIs financeiros atuais (EBITDA, CMV, CR, CP, etc.)

**Não** entram na linha principal do Premium.  
Opções (produto): (a) seção “Saúde financeira” colapsável abaixo do rodapé comercial; (b) Dashboard Financeiro separado; (c) aba.  
**Blueprint default para 10.4B:** não renderizar na ordem obrigatória; preservar loaders intactos.

---

## 6. Evolução Mensal

### 6.1 Papel

Gráfico **principal** de largura quase total — leitura da trajetória Meta × Realizado × Projeção acumulados.

### 6.2 Séries (mesmos dados já existentes no painel comercial)

1. Meta acumulada  
2. Realizado acumulado  
3. Projeção acumulada  

### 6.3 Spec visual

| Item | Definição |
|------|-----------|
| Proporção | ~12/12 desktop; altura útil 280–360px |
| Título | “Evolução acumulada do mês” |
| Subtítulo | Competência + regra curta (sem texto longo) |
| Legenda | 3 séries com tokens de cor (realizado success, meta primary, projeção info) |
| Tooltip | Data · 3 valores · gap real vs meta no dia |
| Último ponto | Marcador destacado (hoje ou último dia com dado) |
| Área | Área leve sob realizado (opacidade baixa) — se a lib atual permitir sem troca |
| Comparação período anterior | **Área reservada** à direita ou toggle “vs mês anterior” (dados já em `comparacao` quando existirem) — UI only |
| Empty | Empty state com CTA vendas / meta |
| Responsivo | Scroll-x controlado em mobile; labels de dia a cada N ticks |

**Não trocar regra ou cálculo.**

---

## 7. Painel Diário

### 7.1 Leitura por dia

Cada dia deve expor (tooltip e/ou detalhe):

- Meta diária  
- Realizado  
- Projetado  
- Diferença (real − meta)  
- Status (faixa)  
- Ticket médio do dia*  
- Quantidade de vendas*

\* Se ainda não estiver no ponto diário tipado, **não inventar cálculo na 10.4A** — reservar slot no UI; preencher na 10.4B **somente se o loader já expuser**; senão tooltip sem esses campos até sprint de dados (fora desta blueprint de UI).

### 7.2 Formato visual

- Barras agrupadas por dia (padrão atual refinado) **ou** “lane” horizontal com chips de status.  
- **Recomendação 10.4B:** manter barras (já implementadas no comercial) com polish — evitar redesign radical.

### 7.3 Comportamentos

| Contexto | Visual |
|----------|--------|
| Dia útil | Barras opacas; meta + realizado |
| Fim de semana | Opacidade reduzida / hatch; meta 0 se regra atual |
| Futuro | Só projeção (tom info) |
| Dia atual | Ring / fundo suave primary |
| Tooltip | Completo + teclado |
| Clique | Drill-down vendas do dia (href atual) |
| Mobile | Scroll horizontal com snap leve; sticky legend |

---

## 8. Heatmap Inteligente

### 8.1 Estados visuais (mapa semântico)

| Estado UI | Bandas de dados atuais | Cor (token) |
|-----------|------------------------|-------------|
| Sem movimento | `zero` | neutro muted |
| Crítico | `muito_abaixo` | `danger` |
| Abaixo | `abaixo` | `warning` |
| No ritmo | `no_ritmo` | `primary` |
| Acima | `acima` | `success` soft |
| Meta atingida / muito acima | `muito_acima` | `success` sólido |
| (+ FDS / futuro / sem meta) | `fim_semana`, `futuro`, `sem_meta` | neutro / info / dashed |

### 8.2 Célula

- Dia (número)  
- Valor (tooltip)  
- % da meta (tooltip)  
- Status (band)  
- Tooltip acessível (`aria-label`)  
- Clique → vendas do dia  
- Destaque dia atual → ring primary  

### 8.3 Legenda

Horizontal sob o grid; contraste AA; incluir FDS e futuro.

---

## 9. Insights Executivos

### 9.1 Card

- Prioridade (badge)  
- Ícone  
- Título  
- Resumo  
- Impacto  
- Recomendação  
- Ação (CTA / link)

### 9.2 Categorias (rótulos de UI; regras de geração intactas)

Receita · Meta · Ticket · Cliente · Centro de custo · Estoque · Tendência · Risco

### 9.3 Layout

| Viewport | Grid |
|----------|------|
| Desktop | máx. **3** por linha |
| Tablet | **2** |
| Mobile | **1** |

**Ordem:** severidade/prioridade já definida pelo motor — UI só ordena/exibe.  
**Máximo sugerido na tela:** 6 insights (demais em “Ver todos” se existir lista longa — **dúvida se truncar**).

---

## 10. Rankings Executivos

### 10.1 Blocos

1. Top clientes  
2. Top produtos  
3. Top serviços  
4. Top centros de custo  

### 10.2 Item

Posição · Nome · Valor · Participação · Quantidade* · Tendência* · Barra proporcional · Drill-down · Medalhas Top 3  

\* Quantidade/tendência: só se dados já existirem no item; senão omitir (não mockar).

### 10.3 Layout

| Viewport | Grid |
|----------|------|
| Desktop | 2×2 |
| Tablet | 2×2 ou 1×4 |
| Mobile | 1 coluna |

Empty: dashed card com mensagem clara.

---

## 11. Rodapé Executivo

Conteúdo enxuto:

- Última atualização (timestamp de render / “dados do período”)  
- Filtros aplicados (chips read-only)  
- Exportações (CSV / Excel / PDF — actions existentes)  
- Compartilhar (se ainda não existir: **placeholder de produto** — link copiar URL filtrada)  
- Links rápidos: Metas · Vendas · DRE · Configurações  
- Fonte dos dados (1 linha: DRE receita bruta · projeção úteis · etc.)  
- Observações de projeção (feriados / limitações — collapsible)

Sem KPIs novos. Sem gráficos.

---

## 12. Grid e proporções

### 12.1 Breakpoints e colunas

| Nome | Largura | Colunas |
|------|---------|---------|
| Desktop grande | ≥1280px | 12 |
| Notebook | 1024–1279 | 12 (gutters menores) |
| Tablet | 768–1023 | 8 |
| Mobile | <768 | 4 |

### 12.2 Conteúdo

| Token / regra | Valor |
|---------------|-------|
| Largura máxima do conteúdo | `max-w-7xl` (≈80rem) centrado — alinhar ao shell do app |
| Margens laterais | `px-4` mobile → `px-6` tablet → `px-8` desktop |
| Gutters / gaps de seção | `exStack[24]` ou `exStack[32]` entre seções |
| Gaps internos de grid | `exSpacing[16]` / `exSpacing[12]` |
| Altura mín. Hero | ~280px conteúdo |
| Altura mín. gráfico evolução | ~280px plot |
| Altura mín. KPI grande | ~120px |
| Tabelas | `overflow-x-auto` dentro de `ExecutiveCard` |
| Gráficos | container com `min-w-0`; scroll-x em mobile |

### 12.3 Ordem de empilhamento (mobile)

Hero → KPIs → Evolução → Diário → Heatmap → Insights → Rankings → Rodapé  
(sem reordenar por CSS `order` — HTML na ordem mental)

---

## 13. Espaçamento

**Somente tokens `ex*`:**

| Uso | Token |
|-----|-------|
| Entre seções | `exStack[24]` (padrão) / `exStack[32]` após Hero |
| Padding card | `exPadding[16]` compacto · `exPadding[20]` padrão · `exPadding[24]` Hero |
| Título → conteúdo | `mt-3` / `gap-3` (`exSpacing[12]`) |
| Entre grupos de KPI | `exSpacing[16]` |
| Ritmo vertical | Seções com `ExecutiveSection` (title + description + body) |

Evitar `space-y` arbitrários fora da escala 8·12·16·20·24·32.

---

## 14. Tipografia

| Papel | Token `exTypography` |
|-------|----------------------|
| Título principal (Hero) | `hero` |
| Período | `subtitle` |
| Valor principal (Hero/KPI P0) | `kpiPrimary` / `metric` |
| KPI compacto | `kpiSecondary` |
| Título de seção | `title` |
| Subtítulo de seção | `caption` / description |
| Corpo | `body` |
| Legenda | `caption` |
| Badge | `label` (conteúdo badge) |
| Tooltip | `caption` + tabular-nums |

**Números = protagonistas** (`tabular-nums` sempre em valores monetários e %).

---

## 15. Cores

| Semântica | Token | Uso |
|-----------|-------|-----|
| Positivo | `exColors.success` | Acima, atingida, tendência up |
| Atenção | `exColors.warning` | Abaixo, gap alto |
| Crítico | `exColors.danger` | Muito abaixo, risco |
| Informativo | `exColors.info` | Projeção, futuro, insights info |
| Neutro | `exColors.neutral` | Labels, FDS, empty |
| Primário marca | `exColors.primary` | Foco, no ritmo, progress default |

**Gradiente:** apenas no Hero (`from-card via-card to-blue-600/[0.06]` — padrão 10.3).  
Contraste: texto sobre soft backgrounds deve usar variantes `text` dos tokens (AA).

---

## 16. Microinterações

| Interação | Spec | Reduced motion |
|-----------|------|----------------|
| Entrada do Hero | `exAnimations.fade` | Instantâneo |
| Contagem KPI | opacity / optional count-up client | Só valor final |
| Progresso | `exAnimations.progress` | Sem transition |
| Hover cards | `hoverLift` | Sem translate |
| Tooltip | fade 150ms | Instant |
| Transição filtros | skeleton seções Suspense | — |
| Dia atual | ring estático + fade-in leve | Ring só |
| Heatmap seleção | scale 105 hover | Opacity only |
| Insight expansão | details/summary ou link | Instant |
| Drill-down | `hoverPress` no CTA | — |

Duração-alvo: 100–400ms. Sem libs pesadas novas.

---

## 17. Estados

Matriz por seção:

| Seção | Loading | Empty | Error | Success | Sem meta | Sem vendas | Período futuro | Mês encerrado |
|-------|---------|-------|-------|---------|----------|------------|----------------|---------------|
| Hero | Skeleton hero | CTA vendas | SectionError | Normal | CTA meta | Realizado 0 | Projeção enfatizada | Progress final + badge |
| KPIs | Skeleton grid | “—” + hint | Card error | Normal | Meta “—” | Receita 0 | Labels “previsto” | Comparação ok |
| Evolução | Chart skeleton | Empty chart | SectionError | Séries | Linha meta ausente | Só projeção/meta | Linha futuro | Todas até D-final |
| Diário | Bars skeleton | Mensagem | SectionError | Barras | Meta 0 | Barras zeradas | Só proj | Sem “futuro” |
| Heatmap | Grid skeleton | Mensagem | SectionError | Células | Band sem_meta | Zero bands | Futuro muted | Sem futuro |
| Insights | Cards skeleton | Ocultar seção ou “Sem alertas” | SectionError | Lista | Insight cadastrar meta | Insight sem movimento | — | Insights de fechamento |
| Rankings | List skeleton | Empty dashed | SectionError | Listas | — | Empty | — | Rankings finais |
| Rodapé | — | — | Export off | Meta + fontes | Nota sem meta | — | — | Timestamp fechamento |

**Regra:** nenhuma seção some sem explicação (exceto Insights vazios → mensagem única ou hide com aria).

---

## 18. Fluxo de leitura

1. **Situação geral** → Hero status  
2. **Meta e projeção** → Hero números + progress  
3. **Evolução** → trajetória do mês  
4. **Desempenho diário** → operação  
5. **Problemas** → Heatmap (vermelho) + Insights críticos  
6. **Oportunidades** → Insights positivos + Rankings  
7. **Rankings** → concentração de receita  
8. **Ações** → CTAs nos insights + links do rodapé  

**Por que melhora a decisão:** reduz carga cognitiva; evita “painel de controle” flat; alinha scroll à pergunta gerencial; coloca diagnóstico antes de exploração (rankings).

---

## 19. Wireframes ASCII

### 19.1 Desktop grande (≥1280 · 12 cols)

```
╔══════════════════════════════════════════════════════════════════════════╗
║ FILTER BAR (sticky opcional) · período · centro · export (resumo)        ║
╠══════════════════════════════════════════════════════════════════════════╣
║                                                                          ║
║  HERO EXECUTIVO                                           [maior bloco]  ║
║  Empresa XYZ · Jul/2026 · [No ritmo]                                     ║
║  ┌──────────┬──────────┬──────────┬──────────┐   ┌────────┐             ║
║  │ Meta     │ Realiz.  │ Restante │ Projeção │   │ Gauge  │             ║
║  │ R$ 100k  │ R$ 72k   │ R$ 28k   │ R$ 98k   │   │  72%   │             ║
║  └──────────┴──────────┴──────────┴──────────┘   └────────┘             ║
║  ████████████████░░░░░░░░  72% · falta R$ 28k                            ║
║  Insight: “Ritmo 4pp abaixo — priorizar ticket”         [Ver ação →]     ║
║                                                                          ║
╠══════════════════════════════════════════════════════════════════════════╣
║  KPIs PRINCIPAIS                                                         ║
║  ┌─────────┬─────────┬─────────┬─────────┐   ← grandes (P0)              ║
║  │ Receita │ Meta    │ Ating.% │ Projeção│                               ║
║  └─────────┴─────────┴─────────┴─────────┘                               ║
║  ┌──────┬──────┬──────┬──────┐             ← compactos                   ║
║  │ Gap  │ Nec/d│Ticket│Client│                                           ║
║  └──────┴──────┴──────┴──────┘                                           ║
╠══════════════════════════════════════════════════════════════════════════╣
║  EVOLUÇÃO MENSAL (full width)                                            ║
║  ┌────────────────────────────────────────────────────────────┐          ║
║  │  Meta ──  Realizado ──  Projeção ──     [vs ant.]          │          ║
║  │         ╱‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾╲                               │          ║
║  │   _____╱                    ╲____● último                  │          ║
║  └────────────────────────────────────────────────────────────┘          ║
╠══════════════════════════════════════════════════════════════════════════╣
║  PAINEL DIÁRIO                                                           ║
║  ┌──┬──┬──┬──┬──┬──┬──┬──┬──┬──┬──┬──┬──┬──┬──┐  (scroll-x se preciso) ║
║  │01│02│03│… │hoje│… │31│                                           ║
║  └──┴──┴──┴──┴──┴──┴──┴──┴──┴──┴──┴──┴──┴──┴──┘                          ║
╠══════════════════════════════════════════════════════════════════════════╣
║  HEATMAP INTELIGENTE                                                     ║
║  Seg Ter Qua Qui Sex Sáb Dom                                             ║
║  [ ][ ][ ][ ][ ][ ][ ]                                                   ║
║  … legenda: zero · crítico · abaixo · ritmo · acima · atingida           ║
╠══════════════════════════════════════════════════════════════════════════╣
║  INSIGHTS EXECUTIVOS                                                     ║
║  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐                      ║
║  │ ! Prioridade │ │ i Título     │ │ ✓ Ação       │                      ║
║  └──────────────┘ └──────────────┘ └──────────────┘                      ║
╠══════════════════════════════════════════════════════════════════════════╣
║  RANKINGS                                                                ║
║  ┌ Top clientes ───┐ ┌ Top produtos ───┐                                 ║
║  │ 🥇 …            │ │ 🥇 …            │                                 ║
║  └─────────────────┘ └─────────────────┘                                 ║
║  ┌ Top serviços ───┐ ┌ Top centros ────┐                                 ║
║  └─────────────────┘ └─────────────────┘                                 ║
╠══════════════════════════════════════════════════════════════════════════╣
║  RODAPÉ · atualizado · filtros · export · fontes · links                 ║
╚══════════════════════════════════════════════════════════════════════════╝
```

### 19.2 Notebook (1024–1279 · 12 cols)

```
┌────────────────────────────────────────────────────┐
│ FILTER BAR                                         │
├────────────────────────────────────────────────────┤
│ HERO (métricas 2×2 + progress; gauge ao lado)      │
├────────────────────────────────────────────────────┤
│ KPIs P0: 4 col · P1: 4 col abaixo                  │
├────────────────────────────────────────────────────┤
│ EVOLUÇÃO (altura ~280)                             │
├────────────────────────────────────────────────────┤
│ PAINEL DIÁRIO (scroll-x)                           │
├────────────────────────────────────────────────────┤
│ HEATMAP                                            │
├────────────────────────────────────────────────────┤
│ INSIGHTS 2 col                                     │
├────────────────────────────────────────────────────┤
│ RANKINGS 2×2                                       │
├────────────────────────────────────────────────────┤
│ RODAPÉ                                             │
└────────────────────────────────────────────────────┘
```

### 19.3 Tablet (768–1023 · 8 cols)

```
┌──────────────────────────────────────┐
│ FILTERS (wrap)                       │
├──────────────────────────────────────┤
│ HERO stacked                         │
│ Empresa · período · status           │
│ Meta | Realizado                     │
│ Restante | Projeção                  │
│ Progress                             │
│ Gauge + insight                      │
├──────────────────────────────────────┤
│ KPIs 2 col (P0) → 2 col (P1)         │
├──────────────────────────────────────┤
│ EVOLUÇÃO                             │
├──────────────────────────────────────┤
│ DIÁRIO scroll-x                      │
├──────────────────────────────────────┤
│ HEATMAP                              │
├──────────────────────────────────────┤
│ INSIGHTS 2 col / 1 col               │
├──────────────────────────────────────┤
│ RANKINGS 1–2 col                     │
├──────────────────────────────────────┤
│ RODAPÉ                               │
└──────────────────────────────────────┘
```

### 19.4 Mobile (<768 · 4 cols)

```
┌────────────────────────┐
│ Filters (sheet/drawer) │
├────────────────────────┤
│ HERO                   │
│ Empresa                │
│ Status badge           │
│ Meta                   │
│ Realizado              │
│ Restante               │
│ Projeção               │
│ Progress               │
│ Gauge                  │
│ Insight + CTA          │
├────────────────────────┤
│ KPI cards stack/2-col  │
├────────────────────────┤
│ Evolução scroll-x      │
├────────────────────────┤
│ Diário scroll-x        │
├────────────────────────┤
│ Heatmap                │
├────────────────────────┤
│ Insights 1 col         │
├────────────────────────┤
│ Rankings 1 col         │
├────────────────────────┤
│ Footer                 │
└────────────────────────┘
```

### 19.5 Mobile summary (opcional 10.4B)

Componente `ExecutiveMobileSummary`: sticky sob o header com **atingimento % · restante · status** — 1 linha, some ao scroll do Hero (`IntersectionObserver`). Documentado; implementação opcional.

---

## 20. Componentes previstos (Sprint 10.4B)

> **Não criar nesta sprint.** Lista para implementação visual.

| Componente | Responsabilidade |
|------------|------------------|
| `ExecutiveDashboardShell` | Layout max-width, ritmo vertical, slots das 8 seções |
| `ExecutiveFilterBar` | Filtros + chips (reusa lógica atual; só shell visual) |
| `ExecutiveHeroV2` | Hero full-width com métricas, progress, gauge, insight |
| `ExecutiveKpiGrid` | Grid P0/P1 |
| `ExecutiveKpiCard` | Card KPI (size primary/secondary) — pode estender `ExecutiveMetric` |
| `ExecutiveMonthlyEvolution` | Gráfico acumulado Meta/Real/Proj |
| `ExecutiveDailyPerformance` | Painel diário |
| `ExecutiveHeatmapV2` | Heatmap + legenda |
| `ExecutiveInsightsGrid` | Grid de insights priorizados |
| `ExecutiveInsightCard` | Card individual |
| `ExecutiveRankingCard` | Um ranking (lista + barras + medalhas) |
| `ExecutiveRankingsGrid` | 2×2 dos quatro tops |
| `ExecutiveFooter` | Rodapé metadados/export/fontes |
| `ExecutiveMobileSummary` | Sticky resumo (opcional) |
| `ExecutiveSectionState` | Loading / empty / error unificado |

**Reuso esperado do DS atual:** `ExecutiveCard`, `ExecutiveMetric`, `ExecutiveProgress`, `ExecutiveGauge`, `ExecutiveBadge`, `ExecutiveSection`, `exAnimations`, `exColors`, `exTypography`.

**Dados:** props já carregadas por `loadDashboardPrimary`, `loadDashboardCommercialPanel`, etc. — **sem novos fetches**.

---

## 21. Riscos e limitações

### Riscos

| Risco | Mitigação |
|-------|-----------|
| Página ainda longa se mantivermos Inteligência + Qualidade + Charts financeiros | Remover/adiar do fluxo primário (dúvidas §22) |
| Duplicação comercial × dashboard na 10.4B | Unificar visualmente; um único Hero |
| Expectativa de “clientes do período” vs cadastro | Explicitar fonte no subtítulo do KPI |
| Ticket/qtd no tooltip diário sem campo | Não inventar; omitir até dados existirem |
| Streaming Suspense reordenar mal | Manter boundaries alinhados à nova ordem |

### Limitações

- Blueprint **não** redefine fórmulas de projeção, probabilidade ou DRE.  
- Canais continuam indisponíveis sem dimensão aprovada.  
- Rankings de vendedor permanecem condicionados ao campo existente.  
- Compartilhar URL pode ser só “copiar link” na 10.4B.  
- Este doc **não** altera telas.

---

## 22. Dúvidas de produto

1. **KPIs financeiros (EBITDA, CMV, CR, CP, saldo):** ocultar do Premium, aba Financeiro, ou seção colapsável?  
2. **Qualidade operacional:** permanece no Dashboard ou só em `/ordens/qualidade-operacional`?  
3. **Intelligence (checklist, feed de atividades):** absorver em Insights ou manter bloco separado abaixo dos Insights?  
4. **KPI Clientes:** ativos do tenant (hoje) ou com compra no período?  
5. **Truncar insights** em 6 com “ver todos”?  
6. **`ExecutiveMobileSummary` sticky:** incluir já na 10.4B ou adiar?  
7. **Filtros:** sticky no topo ou só no header atual?

---

## 23. Checklist Sprint 10.4B

- [ ] Implementar `ExecutiveDashboardShell` com ordem §3  
- [ ] `ExecutiveHeroV2` + estados §4.5  
- [ ] `ExecutiveKpiGrid` / `ExecutiveKpiCard` (P0/P1)  
- [ ] `ExecutiveMonthlyEvolution` (mesmos dados)  
- [ ] `ExecutiveDailyPerformance`  
- [ ] `ExecutiveHeatmapV2`  
- [ ] `ExecutiveInsightsGrid` + card  
- [ ] `ExecutiveRankingsGrid` + medalhas Top 3  
- [ ] `ExecutiveFooter`  
- [ ] Mapear props dos loaders existentes (zero novo fetch)  
- [ ] Remover/ocultar seções fora do fluxo conforme decisão de produto  
- [ ] Acessibilidade: aria, foco, reduced motion  
- [ ] Responsivo: desktop / notebook / tablet / mobile  
- [ ] `npm run lint` + `npm run build`  
- [ ] Validação visual lado a lado com wireframes  

---

## Apêndice A — Mapeamento dados → blocos (sem alterar loaders)

| Bloco UI | Fonte atual (exemplo) |
|----------|----------------------|
| Hero meta/real/proj/%/restante | `CommercialPanelData.projecao` + status |
| Insight principal | `insights[0]` ou alert/priority de intelligence |
| Receita KPI | `DashboardPrimaryData.kpis.faturamento` |
| Ticket / clientes | `kpis.ticket_medio`, `kpis.quantidade_clientes` |
| Evolução / diário / heatmap | `CommercialPanelData.daily` |
| Insights lista | `CommercialPanelData.insights` (+ intelligence se produto unificar) |
| Rankings | `CommercialPanelData.rankings` **ou** `DashboardRankings` — **unificar fonte na 10.4B (preferir comercial no mês da competência)** |
| Export / filtros | `DashboardActions` / `DashboardFilters` |

---

## Apêndice B — Critério de conclusão (10.4A)

| Critério | Status |
|----------|--------|
| Blueprint completo | Este documento |
| Zero alteração funcional | Sim (somente docs) |
| Zero alteração visual aplicada | Sim |
| Wireframe desktop / notebook / tablet / mobile | §19 |
| Arquitetura pronta para 10.4B | §20 + checklist §23 |

---

*Documento gerado na Sprint 10.4A — Gestão no Foco. Aguarda revisão de produto/UX antes da implementação.*
