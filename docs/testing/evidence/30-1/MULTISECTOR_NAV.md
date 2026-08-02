# Sprint 30.1 — Navegação Multissetorial

## Camada
`config/segment-labels.ts` + `getTenantNav(slug, segment)`

## Labels

| Segmento | Equipe nav | Ordens | Ops description | Mecânicos? |
|----------|------------|--------|-----------------|------------|
| oficina | Mecânicos | Ordens de Serviço | oficina | sim |
| comercio | — (oculto) | Pedidos / Atendimentos | loja | **não** |
| restaurante | — (oculto) | Pedidos | salão/produção | **não** |
| servicos | Profissionais | Ordens de Trabalho | atendimentos | sim (renomeado) |
| consultoria | Consultores | Projetos / Entregas | projetos | sim (renomeado) |
| null/outro | Equipe | Ordens | operação | sim (genérico) |

## Regras cumpridas
- Sem hardcode espalhado de “Mecânicos” na sidebar  
- Rotas internas preservadas (`/oficina/mecanicos`)  
- Tenant `teste-renato-01` (segmento `comercio`): **sem Mecânicos** na nav  
- Centro de Operações: copy sem “Elevadores” / sem placa obrigatória fora de oficina  

## Evidência
Browser QA: `sidebar comércio sem Mecânicos` PASS  
Testes: `test:phase30-multisector-nav` 14 PASS  
