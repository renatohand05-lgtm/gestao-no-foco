# Sprint 30.1 — Performance Before/After (Centro de Operações)

**Ambiente:** `npm run dev` · `http://localhost:3000` · tenant `teste-renato-01` · Playwright autenticado  

| | Antes (Sprint 30.0) | Depois (Sprint 30.1) |
|--|--------------------:|---------------------:|
| Cold navMs | 12152 | 2211 |
| Cold TTFB | 9867 | 974 |
| Cold FCP | 10008 | 1048 |
| Warm navMs | n/d | 1322 |
| Warm2 navMs | n/d | 1344 |
| Conteúdo útil | sim (lento) | sim |
| Requests inventados | não | não |

**Ganho percentual (cold navMs):** `(12152 − 2211) / 12152 ≈ 81,8%`

## Bundle / LCP
- Bundle da rota: não isolado via analyzer nesta sprint  
- LCP lab: não medido (sem Lighthouse 30.1)  

## Limitações
- Medição em `next dev` (não production build)  
- Warm depende de cache React/Server Components da sessão  
