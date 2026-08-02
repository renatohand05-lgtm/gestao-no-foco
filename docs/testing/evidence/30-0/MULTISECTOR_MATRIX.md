# Sprint 30.0 — Matriz Multissetorial

**Segmento do tenant auditado:** `comercio` (Configurações → Dados da empresa)  
**Problema observado:** navegação ainda exibe **Mecânicos** e copy de oficina.

## Avaliação por segmento

| Segmento | Adequação hoje | Bloqueios | Observação |
|----------|----------------|-----------|------------|
| Oficina | Alta | — | OS, mecânicos, centro de operações alinhados |
| Restaurante | Média | OS/placa, mecânicos, linguagem | Falta template de cardápio/mesas |
| Comércio | Média-alta | Item “Mecânicos” na nav; OS como primário | Segmento do tenant teste |
| Serviços | Média-alta | OS enviesada a oficina | Serviços/hub já existem |
| Lava-rápido | Média | Veículo/placa implícitos em OS | Agenda + OS adaptáveis |
| Franquia / rede | Média | Multi-unidade superficial | Tenant isolation ok; UX rede fraca |
| Consultoria | Média | OS/estoque excessivos | CRM + financeiro fortes |
| Distribuição | Média-alta | — | Compras/estoque/financeiro cobrem núcleo |
| Pequena indústria | Média | MRP/produção ausentes | Estoque + compras base |
| Rede de unidades | Baixa-média | Sem HQ dashboard multi-tenant UX | Isolamento técnico existe |

## Matriz Core × Segmento

### Core comum (manter / fortalecer)

- Auth + tenant isolation + RBAC server-side  
- Dashboard / cockpit executivo  
- Financeiro (AP/AR, caixa, DRE, centros de custo)  
- Clientes / CRM / oportunidades  
- Produtos & Serviços + importação  
- Estoque + Compras  
- Agenda  
- Metas  
- Analytics / Inteligência (camada executiva)  
- Configurações de empresa  

### Recursos por segmento (configuráveis / feature flags)

| Recurso | Oficina | Comércio | Serviços | Food | Distrib. |
|---------|---------|----------|----------|------|----------|
| Ordens de Serviço | default on | optional | optional | optional | off/low |
| Mecânicos / técnicos | on | off | “equipe técnica” | off | off |
| Placa / veículo | on | off | off | off | off |
| Mesas / comandas | off | off | off | on | off |
| PDV rápido | low | on | low | on | low |
| Multi-depósito | mid | mid | low | low | on |
| Franquia / filiais UI | mid | mid | mid | mid | mid |

### Campos configuráveis

- Labels de OS → “Ordem”, “Atendimento”, “Job”, “OS”  
- Ocultar placa/veículo/mecânico por segmento  
- Renomear “Mecânicos” → “Equipe / Técnicos / Prestadores”  
- Densidade do subnav financeiro (executivo vs power user)  
- Presets de Dashboard (já existe seletor; falta amarrar a segmento)

### Templates recomendados (Fase 30+)

1. **Comércio** — vendas + estoque + financeiro; OS off  
2. **Oficina** — OS + mecânicos + agenda + peças  
3. **Serviços profissionais** — CRM + agenda + faturamento; estoque light  
4. **Food** — cardápio/serviços + caixa + metas  
5. **Distribuição** — compras + depósitos + AP/AR  

## Evidências

- Sidebar: `config/navigation.ts` — “Quadro ao vivo da oficina”, “Mecânicos”, “oficinas e prestadores”  
- Screenshot Configurações: segmento `comercio` + item Mecânicos visível  
- Rotas: `oficina/mecanicos`, `ordens/mecanicos`  
