# Fase 30.4 — Executive Cockpit V2

## Objetivo

Transformar o Dashboard Executivo na principal tela de gestão, com hierarquia Apple-level — **sem alterar** regras financeiras, cálculos, DRE, fluxo ou inventar dados/IA.

## Hierarquia (blocos)

1. Saudação + empresa + período + atualizar + status  
2. KPIs principais (valor · variação · contexto · drill-down)  
3. Executive Brief (dia / semana / mês · alertas · oportunidade · risco · ação)  
4. Metas premium (meta · realizado · % · projeção · dias · restante)  
5. DRE executivo + Fluxo de caixa (apresentação)  
6. Central de alertas (prioridade × categoria)  
7. Quick Actions multissetoriais  
8. Empty states acionáveis  

## Arquitetura

| Camada | Path |
|--------|------|
| Config segmento/ações/alertas | `config/dashboard/cockpit-v2.ts` |
| Mappers apresentação | `lib/dashboard/cockpit-v2/*` |
| UI blocos | `components/dashboard/cockpit-v2/*` |
| Compose na view | `components/dashboard/premium/premium-dashboard-view.tsx` |
| Dados | loaders/composes existentes (`dashboard-streaming`) |

## Regras

- Números só de `hoje` / `primary` / `cockpit` / `intelligence` / `decision` / `charts`  
- Lucro líquido e despesas sem KPI isolado → **Ver DRE** (não inventar)  
- Alertas só a partir de insights/decisões acionáveis  
- Drill-down via dialog client-side (sem full reload)  

## Performance

Mantém `Promise.all` + `React.cache` dos loaders 29.1. Meta produto: cold ≤2s / warm ≤1s em rede ideal; evidência browser registra timings locais.

## Testes

- `npm run test:phase30-dashboard`  
- `npm run test:phase30-cockpit`  
- `npm run test:phase30-kpis`  
- `npm run test:phase30-alerts`  
- `npm run test:phase30-drilldown`  
- `npm run test:homolog-30-4`  
