# Fase 30 — Plano de Sprints (proposta 30.1–30.8)

Ordem derivada do diagnóstico 30.0 (não de lista genérica).

## Princípios transversais (todas as sprints)

**Não alterar sem evidência e aceite:**  
fórmulas financeiras/DRE, isolamento por tenant, matriz RBAC canônica, identidade visual core (tokens), regras de negócio sem bug comprovado.

**Gates sugeridos por sprint:** lint · build · suites do módulo tocado · browser smoke autenticado · screenshots evidência.

---

## Sprint 30.1 — Foco, velocidade e nav multissetorial

| | |
|--|--|
| **Objetivo** | Reduzir chrome transversal, acelerar ops lentas, alinhar nav ao segmento |
| **Escopo** | P1-01, P1-02, P1-03, P1-05, P1-10 |
| **Dependências** | Nenhuma |
| **Risco** | Usuários habituados à barra Apresentação |
| **Gates** | perf Centro Ops & Mecânicos ↓; browser 390px dashboard; nav sem Mecânicos se segmento≠oficina |
| **Aceite** | Apresentação não domina mobile; TTFB Centro Ops reduzido mensuravelmente; avatar único |
| **Não alterar** | DRE formulas, schema, RBAC matrix |

## Sprint 30.2 — Equipe, CRM polish e empty states

| | |
|--|--|
| **Objetivo** | Desbloquear multi-usuário comercial + clareza CRM |
| **Escopo** | P1-04, P1-08, P1-09 |
| **Dependências** | 30.1 (nav estável) |
| **Risco** | Convites/e-mail/providers |
| **Gates** | test rbac; fluxo convite Owner; Kanban empty CTA |
| **Aceite** | Lista membros + papéis; sem stub morto; storytelling CRM/Funil claro |
| **Não alterar** | Permissões server-side existentes (apenas expor UI segura) |

## Sprint 30.3 — Financeiro executivo & Analytics legível

| | |
|--|--|
| **Objetivo** | Leitura DRE/Analytics no nível premium comercial |
| **Escopo** | P1-06, P1-07, P2-08 |
| **Dependências** | 30.1 chrome |
| **Risco** | Regressão visual sem tocar fórmulas |
| **Gates** | finance-core; dre screenshots desktop/tablet/mobile; analytics sem skeleton eterno |
| **Aceite** | DRE comparativo refinido; Analytics linguagem executiva; subnav compactável |
| **Não alterar** | Cálculos DRE/caixa canônicos |

## Sprint 30.4 — Inteligência, relatórios e telemetria

| | |
|--|--|
| **Objetivo** | Hub de inteligência útil + clareza Relatórios vs Analytics + RUM |
| **Escopo** | P2-01, P2-02, P2-05 |
| **Dependências** | 30.3 |
| **Risco** | Escopo de IA expandir demais |
| **Gates** | intelligence contracts; sem inventar dados |
| **Aceite** | 1ª tela Inteligência com brief acionável; papéis de Relatórios definidos |
| **Não alterar** | Determinismo / no-hallucination da IA |

## Sprint 30.5 — Templates multissetoriais & OS configurável

| | |
|--|--|
| **Objetivo** | Produto servir comércio/serviços sem cheiro de oficina |
| **Escopo** | P2-03, P2-04 + matriz MULTISECTOR |
| **Dependências** | 30.1 nav por segmento |
| **Risco** | Feature flags complexas |
| **Gates** | browser 2 segmentos (oficina vs comércio) |
| **Aceite** | Template comércio sem Mecânicos/placa obrigatória; onboarding por segmento |
| **Não alterar** | Dados históricos; schema destrutivo |

## Sprint 30.6 — Consolidação DS, a11y e higiene

| | |
|--|--|
| **Objetivo** | Consistência de componentes + acessibilidade + lint |
| **Escopo** | P2-06, P2-07, P2-09, P2-10 |
| **Dependências** | telas estáveis 30.1–30.5 |
| **Risco** | Refactors amplos |
| **Gates** | lint ↓ warnings; a11y checklist teclado; empty-state único |
| **Aceite** | Um empty-state canônico dominante; tab order em modals críticos |
| **Não alterar** | Tokens de marca sem RFC |

## Sprint 30.7 — Rede / types / integrações base

| | |
|--|--|
| **Objetivo** | Preparar multi-unidade e higiene de types |
| **Escopo** | P3-02 (MVP), P3-03 (base), P3-04 |
| **Dependências** | 30.2 equipe |
| **Risco** | Escopo de franquia |
| **Gates** | types contract; tenant isolation |
| **Aceite** | Types regeneráveis documentados; esboço UX multi-unidade |
| **Não alterar** | Isolamento tenant atual |

## Sprint 30.8 — Diferenciais & fechamento Fase 30

| | |
|--|--|
| **Objetivo** | Packs verticais leves + release Fase 30 |
| **Escopo** | P3-05 seletivo; hardening; release audit |
| **Dependências** | 30.1–30.7 |
| **Risco** | Scope creep mobile nativo |
| **Gates** | RC + browser + prod smoke |
| **Aceite** | Fase 30 liberada com evidências; **sem** app nativo obrigatório |
| **Não alterar** | Decisão de app nativo (P3-01 fica explícita como pós-Fase) |

---

## Resumo visual da ordem

```
30.1 Foco/Perf/Nav → 30.2 Equipe/CRM → 30.3 Fin/Analytics
        → 30.4 Inteligência/RUM → 30.5 Multissetorial
        → 30.6 DS/A11y → 30.7 Rede/Types → 30.8 Release
```
