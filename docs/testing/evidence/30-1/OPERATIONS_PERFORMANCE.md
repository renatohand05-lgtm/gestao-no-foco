# Sprint 30.1 — Operations Performance

## Causa da lentidão (~12s)

Classificação: **waterfall server-side + payload excessivo**

1. Fetches sequenciais na page: permissões → `getData` → prefs  
2. `getData` com `.limit(400)` + joins cliente/veículo + profiles  
3. Ordenação por `data_abertura` (menos alinhada ao quadro vivo)  
4. Copy/cálculos de oficina sempre aplicados  

Não era loader artificial.

## Correções aplicadas
- `Promise.all` permissões + profile  
- `Promise.all` getData + prefs  
- `BOARD_ROW_LIMIT = 120`  
- Order por `updated_at` desc  
- Labels/copy por segmento  

## Antes × Depois (localhost autenticado)

| Medição | Antes (30.0) | Depois (30.1) | Ganho |
|---------|-------------:|--------------:|------:|
| Cold navMs | 12152 | **2211** | **~82%** |
| Cold TTFB | 9867 | **974** | **~90%** |
| Cold FCP | 10008 | **1048** | **~90%** |
| Warm navMs | — | **1322** | meta ≤2,5s OK |
| Warm2 navMs | — | **1344** | estável |

Fonte: `browser-qa.json` · baseline 30.0 `PERFORMANCE_AUDIT.md`.

## Meta
- Cold ≤4s: **ATINGIDA** (2,2s)  
- Warm ≤2,5s: **ATINGIDA** (1,3s)  

## Residual
- Oficina/Mecânicos ainda lenta (fora do escopo estrito; rota separada)  
- LCP lab Lighthouse não coletado nesta sprint  
