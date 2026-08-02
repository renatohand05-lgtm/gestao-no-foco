# Sprint 30.0 — Backlog priorizado (Fase 30)

## P0 — crítico

*Nenhum item P0 aberto nesta auditoria.*  
(Release 29 estável; sem perda de dados / regressão bloqueante / falha de auth observada.)

## P1 — experiência / performance / consistência

| ID | Problema | Impacto | Evidência | Solução proposta | Risco | Dependência | Esforço | Sprint |
|----|----------|---------|-----------|------------------|-------|-------------|---------|--------|
| P1-01 | Chrome “Apresentação” em quase todas as telas | Perda de foco, mobile ruim | screenshots dashboard/DRE/mobile | Restringir a Dashboard (ou preferência usuário); default colapsado | Médio (habituação) | design system | M | **30.1** |
| P1-02 | Centro de Operações ~12s | Percepção “produto lento” | perf ranking #1 | Profile queries; lazy widgets; cache | Médio | dados ops | M–G | **30.1** |
| P1-03 | Nav “Mecânicos” / copy oficina com segmento comércio | Quebra multissetorial e confiança | nav + configuracoes.png | Nav por segmento; renomear/ocultar | Baixo | config segmento | P–M | **30.1** |
| P1-04 | Admin usuários/permissões inexistente | Bloqueio comercial multi-usuário | configuracoes stub | Módulo Equipe (convite, papéis, lista) server-side RBAC | Médio | rbac | G | **30.2** |
| P1-05 | Oficina/Mecânicos ~7,8s | Mesmo que P1-02 | perf #2 | Otimizar fetch; paginação | Médio | P1-03 | M | **30.1** |
| P1-06 | Analytics pouco executivo / skeleton longo | Baixa adoção | analytics.png | IA executiva; streaming; less jargon | Médio | analytics | M | **30.3** |
| P1-07 | Subnav financeiro denso no DRE | Atrito na leitura | dre.png | Modo compacto / drawer de módulos | Baixo | finance UI | M | **30.3** |
| P1-08 | Empty states Kanban fracos | Aparência genérica | kanban.png | CTA por coluna; empty canônico | Baixo | CRM UI | P | **30.2** |
| P1-09 | Dualidade CRM vs Funil Clientes | Confusão de IA | rotas /crm + /clientes/funil | Unificar storytelling / entry points | Médio | CRM | M | **30.2** |
| P1-10 | Avatares inconsistentes (N vs RA) | Confiança / polish | configuracoes.png | Single source user display | Baixo | layout | P | **30.1** |

## P2 — refinamento / produtividade / inteligência

| ID | Problema | Impacto | Solução | Sprint |
|----|----------|---------|---------|--------|
| P2-01 | Hub Inteligência esparso | Pouca profundidade na 1ª tela | Brief + atalhos contextualizados | 30.4 |
| P2-02 | Relatórios vs Analytics sobrepostos | Navegação duplicada | Papéis claros / merge IA | 30.4 |
| P2-03 | OS enviesada a oficina | Limita serviços/comércio | Campos/labels por segmento | 30.5 |
| P2-04 | Templates onboarding por segmento | Time-to-value | Wizard + presets | 30.5 |
| P2-05 | Telemetria Web Vitals produção | Cego em prod | RUM leve | 30.4 |
| P2-06 | Consolidar empty-states (ui/gf/executive) | Consistência | Um contrato | 30.6 |
| P2-07 | Unificar `permissoes` ↔ `rbac` | Manutenção | Adapter único | 30.6 |
| P2-08 | DRE premium refinements (sem mudar fórmulas) | Wow comercial | Tipografia/comparativo/print | 30.3 |
| P2-09 | A11y teclado/modals | Compliance | Audit focado | 30.6 |
| P2-10 | Lint warnings (28) | Higiene | Limpeza incremental | 30.6 |

## P3 — expansão

| ID | Tema | Sprint sugerida |
|----|------|-----------------|
| P3-01 | App nativo | pós-30.8 (só se web responsiva saturar) |
| P3-02 | Multi-unidade / franquia UX | 30.7–30.8 |
| P3-03 | Integrações externas profundas | 30.7+ |
| P3-04 | Regenerar types oficiais Supabase | 30.7 |
| P3-05 | PDV / food vertical packs | 30.8 |
| P3-06 | Limpeza evidências locais 27-8 | ops contínua |

## Benchmark de experiência (princípios aplicáveis)

Referências: Stripe, Linear, Vercel, Notion, dashboards financeiros enterprise.

| Princípio | Aplicar no GOF |
|-----------|----------------|
| Foco na tarefa | Remover chrome global de apresentação |
| Densidade opcional | Modo compacto no financeiro |
| Empty states com CTA | Kanban / hubs |
| Velocidade percebida | Skeletons curtos + TTFB ops |
| Hierarquia clara | 1 CTA primário por brief |
| Onboarding por contexto | Templates de segmento |
| Consistência | Um empty-state, um avatar, uma nav por perfil/segmento |

**Não copiar** paletas/identidade dessas marcas — preservar GOF gold/dark.
