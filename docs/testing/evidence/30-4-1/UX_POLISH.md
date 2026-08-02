# UX Polish — Sprint 30.4.1

Sem alterar layout/identidade aprovada.

## Percepção de velocidade

- Skeleton do cockpit com blocos (header + KPIs + brief) em vez de retângulo único  
- Delays `premium-enter` reduzidos (16–80 ms)  
- `prefers-reduced-motion` preservado  
- `content-visibility: auto` em alertas / quick actions / empty states  

## Executive Brief

- Grid mais compacto (`gap-2.5`)  
- Marker `data-ux-polish="30.4.1"`  

## Alertas

- Densidade: `py-2.5`, lista com scroll max-height  
- Prioridade/cores inalteradas  

## Quick Actions

- Server Component (menos JS no client)  
- Mesma ordem/segmento  

## Acessibilidade

- `aria-busy` / `aria-label` nos skeletons  
- Focus/ARIA do drill-down preservados  
- Contraste e tab order sem mudança estrutural  
