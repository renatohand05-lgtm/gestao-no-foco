# Sprint 30.0 — Accessibility Audit

**Escopo:** revisão superficial autenticada + inspeção visual · não é auditoria WCAG formal completa.

## Achados

| ID | Severidade | Área | Achado | Evidência / notas |
|----|------------|------|--------|-------------------|
| A1 | **Alta** | Mobile / chrome | Barra “Apresentação” + ações consomem grande parte do viewport em 390px; conteúdo primário abaixo da dobra | `vp-dash-390.png` |
| A2 | **Média** | Contraste | Textos secundários / footer tagline muito discretos no dark | screenshots gerais |
| A3 | **Média** | Icon-only | Cluster topbar (zap, bell, help, settings, theme) — labels visuais limitadas; depende de tooltip | topbar em todas as telas |
| A4 | **Média** | Foco / teclado | Não validado exaustivamente Tab em drawers/modals nesta sprint | gap de cobertura |
| A5 | **Média** | Avatares inconsistentes | Sidebar “N” vs topbar “RA” — confunde identidade do usuário | `configuracoes.png` |
| A6 | **Baixa** | Empty states | Colunas Kanban vazias sem texto/CTA acessível | `kanban.png` |
| A7 | **Baixa** | Reduced motion | Não verificado `prefers-reduced-motion` | gap |
| A8 | **Baixa** | Zoom 200% | Não exercitado nesta sprint | gap |
| A9 | **Crítica** | — | Nenhuma falha crítica de contraste total / bloqueio de login / perda de foco evidenciada | — |

## Positivos
- Hierarquia tipográfica legível no dark mode.  
- Tema dark/light com atributo `data-gof-theme` funcional.  
- Empty states canônicos existem no design system (`components/ui/empty-state.tsx`) — uso inconsistente.  
- Sem UUID exposto nas telas auditadas.

## Classificação agregada

**Acessibilidade atual: 6.5 / 10**  
Base sólida visual; débitos em chrome mobile, icon-only e cobertura de teclado/screen reader.
