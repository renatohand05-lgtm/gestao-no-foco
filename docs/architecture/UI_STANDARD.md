# Padrão de UI, Design System, KPIs e Estados

---

## 1. Server vs Client Components

| Tipo | Quando usar | Exemplos |
|------|-------------|----------|
| **Server Component** (default) | Fetch, layout, composição estática | `page.tsx`, tabelas read-only, cards de KPI alimentados no servidor |
| **Client Component** (`"use client"`) | Interação, hooks, URL client, LocalStorage | Forms, filtros dashboard, dialogs, menus |

### Serialização de props (obrigatório)

Não passar do Server para o Client:

- Funções / callbacks
- Classes
- Componentes React (ex.: ícones Lucide como elemento)
- Instâncias não-JSON

**Padrão correto para ícones:** passar chave serializável (`icon: "revenue"`) e resolver no Client (`DashboardKpiCard`).

Dados: apenas objetos/arrays/primitivos JSON-serializáveis.

---

## 2. Padrões de componentes por tipo

| Tipo | Convenção |
|------|-----------|
| Formulário | Client; Zod no action; feedback via URL ou `ActionResult` |
| Tabela | Preferir Server + links; row actions Client se necessário |
| Modal / Dialog | Client; abrir via estado local ou searchParams |
| Card | Usar `dsElevation.card*` / `Card` do UI kit; sem sombra inventada |
| Empty state | Componente `*-empty-state` ou `dsElevation.empty` + CTA |
| Loading | `loading.tsx` de rota ou skeleton com `dsElevation.skeleton` |
| Error | `error.tsx` / mensagem amigável; não stack |
| Drill-down | Links com query params (`lib/dashboard/drill-down.ts`) |
| Filtros | URL canônica; LocalStorage só como restore auxiliar (dashboard) |
| Exportação | Helpers em `lib/<modulo>/export.ts`; disparo no Client |

---

## 3. Design System (`lib/design-system/tokens.ts`)

Novos módulos **devem** usar tokens `ds*` e evitar hardcodes visuais (`p-5`, `gap-6`, cores soltas) quando existir token equivalente.

| Token | Uso |
|-------|-----|
| `dsSpace` | Espaçamento vertical (`page`, `dashboard`, `section`, stacks) |
| `dsGrid` | Grids responsivos (KPIs, 2/3 col, filters, intelligence) |
| `dsGap` | Gaps (`xs`…`xl`) |
| `dsPadding` | Padding de página/card/empty/section |
| `dsRadius` | Bordas (`sm`…`full`, `badge`, `control`) |
| `dsShadow` | Sombras |
| `dsElevation` | Superfícies de card / empty / skeleton |
| `dsMotion` | Entrada e hover discretos |
| `dsStatus` | success / warning / danger / neutral / info |
| `dsTrendTone` | Tom de tendência up/down/neutral |
| `dsValueTone` | Tom de valor monetário positivo/negativo |
| `dsType` | Tipografia de página/KPI/caption |
| `dsIconBox` | Containers de ícone |
| `dsIconSize` | Tamanhos de ícone |
| `dsInteractive` | Focus / disabled / hover lift |
| `dsControl` | Classe base de input/select |
| `dsLayout` | Max-width / content |

Ícones semânticos: `lib/design-system/icons.ts` + `components/ui/ds-icon.tsx`.

---

## 4. KPIs e Dashboards

### Fonte única de verdade

| Dado | Origem |
|------|--------|
| DRE / EBITDA / margens | `DreService` via `dashboard-service` |
| Fluxo previsto/realizado | `FluxoCaixaService` |
| CR / CP resumos | services financeiros |
| Qualidade operacional | `qualidade-operacional-service` |

### Contrato visual de KPI

1. **Fonte do dado** — service canônico (nunca mock)
2. **Período** — `dataDe` / `dataAte` explícitos no card ou hero
3. **Comparação** — período anterior equivalente (`lib/dashboard/period.ts`)
4. **Zero** — exibir `R$ 0,00` / `0%`; não ocultar o KPI
5. **Tendência** — up / down / neutral + `dsTrendTone`
6. **Tooltip** — explicar fórmula ou origem em linguagem de negócio
7. **Drill-down** — link para módulo filtrado
8. **Empty** — empty state da seção, não card quebrado
9. **Loading** — skeleton alinhado ao grid
10. **Permissões** — rota atrás do shell autenticado + tenant
11. **Formatação** — monetário e percentual via formatters do domínio (`lib/dashboard/format.ts` ou financeiro)

---

## 5. Filtros e URL

### Convenção de query params (dashboard e alinhados)

| Param | Significado |
|-------|-------------|
| `dataDe` | Início do período (ISO date) |
| `dataAte` | Fim do período |
| `categoria` | Categoria financeira |
| `centroCusto` | Centro de custo |
| `conta` | Conta bancária (`contaBancaria` no tipo) |
| `status` | `all` \| `previsto` \| `realizado` (quando aplicável) |

Implementação: `lib/dashboard/filter-storage.ts`.

### Regras

- **URL é a fonte canônica** para compartilhamento de links
- **LocalStorage** (`gnf:dashboard-filters`) restaura quando a URL não traz filtros
- Período anterior equivalente: `getPreviousPeriodFilters` em `period.ts`
- Módulos financeiros listagem usam params próprios (`vencimentoDe`, etc.) no drill-down — mapear em `drill-down.ts`, não reinventar no card

---

## 6. Estados de UI padronizados

| Estado | Comportamento |
|--------|---------------|
| `loading` | Skeleton / `loading.tsx` / spinner acessível |
| `updating` | Desabilitar submit; manter layout estável |
| `empty` | Empty state + CTA quando fizer sentido |
| `error` | Mensagem amigável; opcional retry |
| `success` | Feedback URL ou toast; limpar form se create |
| `disabled` | `dsInteractive.disabled` / `disabled:` Tailwind |
| `unauthorized` | Redirect auth / mensagem de acesso |
| `not found` | `not-found.tsx` ou empty de detalhe |

Evitar estados improvisados duplicados (vários empty states incompatíveis no mesmo fluxo). Preferir componentes `*-empty-state` e tokens `dsElevation`.

---

## 7. Acessibilidade mínima

- Labels em controles de formulário
- Focus visível (`dsInteractive.focus*`)
- Contraste via tokens semânticos
- Botões com texto ou `aria-label` quando só ícone
