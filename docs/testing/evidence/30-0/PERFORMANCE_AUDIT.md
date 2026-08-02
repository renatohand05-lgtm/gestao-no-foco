# Sprint 30.0 — Performance Audit

**Fonte:** Performance API no browser autenticado (`browser-audit.json`)  
**Ambiente:** `npm run dev` localhost:3000 · cold-ish navigation por rota  
**Não inventado:** LCP/CLS/INP de lab Lighthouse completo **não** coletados nesta passagem (sem suite Lighthouse 30.0). Usar navMs / TTFB / FCP / transferSize.

## Ranking — 10 rotas mais pesadas (navMs)

| # | Rota | navMs | TTFB | FCP | Classificação |
|---|------|------:|-----:|----:|---------------|
| 1 | `/centro-operacoes` | 12152 | 9867 | 10008 | **Problema real** |
| 2 | `/oficina/mecanicos` | 7803 | 5511 | 5624 | **Problema real** |
| 3 | `/relatorios` | 4630 | 2873 | 2932 | Problema real / oportunidade |
| 4 | `/dashboard` | 4266 | 372 | 488 | Oportunidade (JS/hydration pós-TTFB bom) |
| 5 | `/ordens` | 3792 | 914 | 1008 | Oportunidade |
| 6 | `/vendas` | 3448 | 1404 | 1484 | Oportunidade |
| 7 | `/produtos` | 3425 | 1364 | 1456 | Oportunidade |
| 8 | `/inteligencia` | 3319 | 1254 | 1340 | Oportunidade |
| 9 | `/tributario` | 3315 | 782 | 880 | Oportunidade |
| 10 | `/financeiro/contas-pagar` | 3103 | 882 | 1004 | Aceitável em dev |

## Separação

### Problema real
- **Centro de Operações:** TTFB ~10s — provável waterfall de queries / agregações server-side. Bloqueia percepção enterprise do “quadro ao vivo”.
- **Oficina/Mecânicos:** TTFB ~5,5s — mesmo padrão.

### Oportunidade
- Dashboard com TTFB baixo (~372ms) mas navMs alto → custo de JS/paint/hydratation e densidade de widgets.
- Relatórios / Vendas / Produtos: 3–4,5s em dev — revisar data fetching e code splitting.
- Skeleton ainda visível em Compras/Analytics no instante do screenshot (~1,4s) — streaming/Suspense ou prefetch.

### Otimização prematura (evitar agora)
- Micro-otimizar rotas já ~2,5–3s sem telemetria de produção.
- Reescrever DRE por performance sem evidência de regressão de fórmula.
- App nativo “por performance” — prematuro; gargalos são web server/data.

## Cold vs warm
- Medições são **por navegação completa** (goto) em sessão autenticada — mais próximas de warm session + cold route.
- Produção (Vercel) não teve Lighthouse nesta sprint; smoke prod apenas HTTP.

## Recomendações (sem implementar)
1. Profilear server render de `centro-operacoes` e `oficina/mecanicos` (queries N+1, awaits seriais).  
2. Streaming das shells Analytics/Compras.  
3. Telemetria real (Web Vitals) em produção na 30.x.  
4. Orçamento de chrome global (barra Apresentação) — menos JS/layout work.
