# Demo Mode & Commercial Experience (Sprint 13.13)

Camada **apenas de apresentação** para demos comerciais, investidores e parceiros.

Não altera banco, migrations, APIs, KPIs, cálculos, DRE, Fluxo de Caixa, Layout Engine, Workspace Engine, Score, BI, Copilot ou regras financeiras.

## Ativação

1. Seletor **Apresentação** no topo do conteúdo (App Shell).
2. Query string: `?demo=executive` | `commercial` | `fullscreen` | `1` (equivale a executive).
3. Persistência local: `localStorage` chave `gnf_demo_presentation`.
4. Sair: modo **Normal** ou botão **Sair**.

## Modos

| Modo | Comportamento |
| --- | --- |
| **Normal** | UI operacional completa |
| **Executivo** | Oculta chrome técnico (toolbar studio, persist status, preview banner, editor, badges Online/Foco, buscas stub, onboarding banner, painel técnico do footer) |
| **Comercial** | Executivo + moldura comercial acima do Hero + roteiro de navegação |
| **Tela Cheia** | Comercial + oculta sidebar/header padrão + força `published` + fullscreen do layout existente |

Todos reutilizam os **mesmos** componentes do produto — sem telas duplicadas.

## O que é ocultado

Flags em `hideFlagsForMode` (`lib/demo/demo-constants.ts`), aplicados via `DemoHide`.

## Hero comercial

`DemoCommercialHeroFrame` é um **frame acima** acima do layout. Não modifica `ExecutiveHeroV2`, Score ou KPI Grid (Design Freeze). Destaca o foco da apresentação: saúde, indicadores, insights e ações.

## Navegação de demo

Roteiro: Dashboard → Financeiro → Relatórios → Clientes → Produtos → Dashboard  
(`getDemoPresentationTrail`) — mesmas rotas do app.

## Demo data

Não há banco paralelo. Suporte futuro: tenants cujo `slug` começa com `demo-` ou é `demo` (`isDemoDataTenantSlug`). Nesse caso o seletor alerta para usar só dados demo. Sem mistura com produção nesta sprint.

## Componentes

```
lib/demo/
components/demo/
  demo-mode-provider.tsx
  demo-mode-controls.tsx
  demo-nav-rail.tsx
  demo-commercial-hero-frame.tsx
  demo-layout-sync.tsx
  demo-hide.tsx
```

Integrações: `AppShell`, `ExecutiveLayoutManager`, `ExecutiveTopBar`, `ExecutiveWorkspace`, footer (só “Informações do painel”).

## Limitações

- Não inventa dados para o Dashboard.
- Command Bar continua arquitetural (sem backend); no Demo Mode fica oculto.
- Fullscreen usa o toggle já existente do layout — sem mudar o engine.
- Sem polling e sem fetch extra.

## Performance

Provider + localStorage + flags de hide. Sem consultas adicionais.
