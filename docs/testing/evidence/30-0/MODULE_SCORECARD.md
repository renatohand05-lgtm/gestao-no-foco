# Sprint 30.0 — Module Scorecard

**Baseline:** `bd6b15f` · tag `v29.0-enterprise`  
**Tenant:** `teste-renato-01` · auth real · localhost:3000  
**Evidência:** `browser-audit.json` · `screenshots/`  

Escala 0–10. Notas justificadas por runtime autenticado (não por intenção de roadmap).

| Dimensão | Significado |
|----------|-------------|
| UI | acabamento visual, hierarquia, densidade |
| UX | clareza de tarefa, feedback, esforço |
| IA | arquitetura da informação |
| Nav | navegação e wayfinding |
| Perf | performance percebida (navMs / TTFB / FCP) |
| Resp | responsividade observada |
| A11y | acessibilidade superficial (contraste/foco/labels) |
| Cons | consistência com o restante da plataforma |
| Ent | nível enterprise / confiança |
| Com | prontidão comercial |

## Scorecard

| Módulo | UI | UX | IA | Nav | Perf | Resp | A11y | Cons | Ent | Com | Média | Justificativa resumida |
|--------|----|----|----|-----|------|------|------|------|-----|-----|-------|------------------------|
| Landing | 8 | 7 | 7 | 8 | 8 | 8 | 7 | 8 | 8 | 8 | **7.7** | Brand forte; fora do núcleo ERP |
| Login | 8 | 8 | 8 | 8 | 8 | 8 | 7 | 8 | 8 | 8 | **7.9** | Limpo; sessão Playwright estável |
| Dashboard / Cockpit | 9 | 8 | 7 | 7 | 6 | 7 | 7 | 8 | 9 | 8 | **7.6** | Premium real; chrome de “Apresentação” + densidade alta; Lucro indisponível |
| Clientes | 8 | 8 | 8 | 8 | 7 | 7 | 7 | 8 | 8 | 8 | **7.7** | Lista madura; cadastro único |
| CRM hub | 8 | 7 | 7 | 7 | 8 | 7 | 7 | 7 | 8 | 7 | **7.3** | Superfície OK; sobreposição com Funil/Clientes |
| Pipeline / Oportunidades | 8 | 8 | 8 | 8 | 8 | 7 | 7 | 8 | 8 | 8 | **7.8** | Runtime OK pós-29.10 |
| Kanban (funil) | 8 | 8 | 7 | 7 | 7 | 6 | 6 | 7 | 8 | 7 | **7.1** | Funcional; colunas vazias fracas; 2 faixas de chrome antes do board |
| Vendas | 7 | 7 | 7 | 7 | 6 | 7 | 7 | 7 | 7 | 7 | **6.9** | Operacional; labels produto/serviço ainda exigem atenção |
| Ordens de Serviço | 7 | 7 | 6 | 6 | 6 | 6 | 6 | 6 | 7 | 6 | **6.3** | Forte para oficina; fricção multissetorial |
| Produtos / Serviços | 7 | 7 | 7 | 7 | 6 | 7 | 7 | 7 | 7 | 7 | **6.9** | Hub sólido; importação é diferencial |
| Estoque | 7 | 7 | 7 | 7 | 7 | 7 | 7 | 7 | 7 | 7 | **7.0** | Consistente; menos “wow” visual |
| Compras | 7 | 7 | 7 | 7 | 5 | 7 | 7 | 7 | 7 | 7 | **6.8** | Homologado 29.10; paint ainda em skeleton em ~1,4s |
| Agenda | 7 | 7 | 7 | 7 | 7 | 6 | 6 | 7 | 7 | 7 | **6.8** | Útil; mobile denso |
| Financeiro hub | 8 | 7 | 6 | 6 | 7 | 7 | 7 | 8 | 8 | 8 | **7.2** | Mega-subnav denso antes do conteúdo |
| Contas a pagar/receber | 8 | 8 | 8 | 8 | 7 | 7 | 7 | 8 | 8 | 8 | **7.7** | Operacional maduro |
| Fluxo de Caixa | 8 | 8 | 8 | 8 | 7 | 7 | 7 | 8 | 8 | 8 | **7.7** | Clareza boa; alinhado ao DRE |
| DRE | 8 | 8 | 7 | 6 | 7 | 6 | 7 | 8 | 9 | 8 | **7.4** | Visual forte; subnav financeiro compete com o demonstrativo |
| Analytics | 6 | 6 | 6 | 6 | 5 | 6 | 6 | 6 | 6 | 6 | **5.9** | Aparência técnica / skeleton prolongado; menos executivo |
| Inteligência | 7 | 7 | 6 | 7 | 6 | 7 | 7 | 7 | 8 | 7 | **6.9** | Mensagem enterprise boa; hub ainda esparso |
| Tributário | 7 | 7 | 7 | 7 | 6 | 7 | 7 | 7 | 7 | 7 | **6.9** | Existe e carrega; profundidade comercial limitada |
| Metas | 8 | 8 | 8 | 8 | 7 | 7 | 7 | 8 | 8 | 8 | **7.7** | Fluxo claro via Configurações |
| Configurações | 7 | 6 | 5 | 5 | 8 | 7 | 7 | 6 | 6 | 5 | **6.2** | Equipe/permissões são stub; Design System exposto demais ao usuário final |
| Centro de Operações | 7 | 6 | 6 | 6 | **3** | 6 | 6 | 6 | 6 | 6 | **5.8** | 12,1s nav / TTFB ~9,9s — gargalo #1 |
| Oficina / Mecânicos | 6 | 5 | 5 | 5 | **4** | 6 | 6 | 4 | 5 | 4 | **5.0** | Termo vertical + 7,8s; desalinhado a segmento `comercio` |
| Relatórios | 7 | 6 | 6 | 6 | 5 | 6 | 6 | 6 | 6 | 6 | **6.0** | Lento (~4,6s); papel ainda confuso vs Analytics |
| Usuários / Perfis / Permissões | 3 | 3 | 3 | 2 | — | — | — | 3 | 3 | 2 | **2.7** | **Sem rota dedicada**; botão “Convidar membro” sem módulo |

## Médias por dimensão (módulos principais, excl. stub usuários)

| Dimensão | Média ~ |
|----------|---------|
| UI | 7.4 |
| UX | 7.0 |
| Arquitetura da informação | 6.7 |
| Navegação | 6.6 |
| Performance percebida | 6.3 |
| Responsividade | 6.8 |
| Acessibilidade | 6.7 |
| Consistência | 6.9 |
| Enterprise | 7.2 |
| Prontidão comercial | 6.9 |

## Nota global ponderada

**7.0 / 10** — plataforma enterprise **homologada e utilizável**, com chrome de apresentação excessivo, resíduos de oficina na navegação, admin de pessoas incompleto e 2–3 rotas criticamente lentas.
