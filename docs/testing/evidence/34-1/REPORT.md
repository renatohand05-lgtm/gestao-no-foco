# Sprint 34.1 — Auditoria geral do produto + mapa de prontidão

**Data:** 2026-08-13  
**Branch:** `main` (tracking `origin/main`)  
**Tipo:** AUDITORIA — nenhuma implementação funcional intencional  
**Billing:** congelado (sandbox, cobrança real OFF, 33.11 não iniciada)  
**Migrations executadas nesta sprint:** NENHUMA  
**Alterações Vercel / Asaas:** NENHUMA  

Gates desta sprint (somente leitura):

| Gate | Resultado |
|---|---|
| `npx tsc --noEmit` | PASS (exit 0) |
| `npm run lint` | PASS — 0 errors, 30 warnings |
| `npm run build` | PASS (exit 0) |
| `git diff --check` | PASS (warning CRLF em evidência 33-3) |
| `npm run test:rbac` | 92 PASS · 0 FAIL (suite estrutural) |
| `npm run test:phase33-7-catalog` | 11 PASS |
| `npm run test:phase33-10-cutover-prep` | 6 PASS |

---

## 0. Decisão

**PRONTO PARA CLIENTE REAL: NO-GO**

| Audiência | Decisão |
|---|---|
| Piloto interno (Renato / operação conhecida) | **GO** |
| Cliente beta controlado (1 empresa, owner único, sem cobrança) | **GO CONTROLADO** |
| Primeiro cliente pago | **NO-GO** |
| Escala comercial | **NO-GO** |

Motivo técnico: o núcleo operacional (OS, vendas, clientes, estoque, financeiro, dashboard) existe e o build passa, mas há P0 de autorização/isolamento, convite sem e-mail, recuperação de senha web inexistente, RBAC de mutação incompleto e billing congelado sem API Key Production.

---

## 1. Objetivo desta sprint

Responder com evidência de código: o Gestão no Foco está pronto para os primeiros clientes reais? Mapear, classificar, recomendar. Não corrigir.

---

## 2. Inventário do produto

Fonte: `config/navigation.ts` (20 itens de sidebar) + `app/**/page.tsx` (~187 páginas) + server actions em `lib/*/actions.ts`.

| Módulo | Rota | Objetivo | Componentes / libs | Tabelas (principais) | Actions / APIs | Permissões (nav) | Ext. | Status |
|---|---|---|---|---|---|---|---|---|
| Marketing | `/` | Landing | `(marketing)` | — | — | pública | — | READY |
| Login / Register | `/login` `/register` | Auth | `components/auth` | `auth.users`, `profiles` | Supabase Auth | pública | Supabase | PARTIAL (sem recover web) |
| Onboarding | `/onboarding` | 1ª empresa | `components/onboarding` | `tenants`, `tenant_members`, `user_onboarding_progress` | `lib/onboarding/actions.ts` | autenticado | — | PARTIAL |
| Empresa extra | `/empresas/nova` | 2ª+ empresa | onboarding | idem | idem | autenticado | — | PARTIAL |
| Convite | `/convite/[token]` | Aceitar convite | convite page | `tenant_invitations`, `tenant_members` | `lib/equipe` | autenticado (não está em PUBLIC_ROUTES) | — | PARTIAL |
| Ops Center | `/{t}/centro-operacoes` | Painel operacional | `lib/operacoes` | OS, agenda, vendas | services | `centro_operacoes.*` / `os.visualizar` | — | READY |
| Dashboard | `/{t}/dashboard` | Visão do negócio | `lib/dashboard/*` | fluxo caixa, vendas, OS | `requireTenant` + services | `dashboard.*` | — | READY |
| Busca | `/{t}/busca` | Master data | `lib/master-data` | várias | search | — | — | PARTIAL |
| Inteligência | `/{t}/inteligencia` | Copiloto / insights | `lib/intelligence` | métricas derivadas | enterprise actions | `inteligencia.*` | LLM opcional | PARTIAL |
| Tributário | `/{t}/tributario` | Regras / simulação | `lib/tax` | `tax_*` | `lib/tax/actions.ts` | `tax.visualizar` | — | PARTIAL |
| CRM | `/{t}/crm` | Pipeline / 360 | `lib/crm` | `clientes`, `cliente_*` | `lib/crm/actions.ts` | `crm.visualizar` | Storage | PARTIAL |
| Clientes | `/{t}/clientes` | Cadastro | `lib/clientes` | `clientes` | `lib/clientes/actions.ts` | `clientes.visualizar` | — | READY |
| Produtos | `/{t}/produtos` | Catálogo | `lib/produtos` | `produtos` | `lib/produtos/actions.ts` | `produtos.visualizar` | — | READY |
| Estoque | `/{t}/estoque` | Saldos / NF-e | `lib/estoque`, `lib/nfe` | `estoque_*`, NF-e | estoque/nfe actions | `estoque.visualizar` | Storage NF-e | READY |
| Compras | `/{t}/compras` | Supply | `lib/supply` | compras / fornecedores | supply | `compras.visualizar` | — | PARTIAL |
| Vendas | `/{t}/vendas` | Pedidos | `lib/vendas` | `vendas`, `venda_itens` | `lib/vendas/actions.ts` | `vendas.visualizar` | — | READY |
| Ordens | `/{t}/ordens` | OS oficina | `lib/ordens` | OS, inspeção | `lib/ordens/actions.ts` | `os.visualizar` | Storage inspeção | READY |
| Agenda | `/{t}/agenda` | Agenda | `lib/agenda` | agendamentos | `lib/agenda/actions.ts` | `agenda.visualizar` | — | READY |
| Equipe oficina | `/{t}/oficina/mecanicos` | Mecânicos | `lib/mecanicos` | `mecanicos` | mecanicos actions | `mecanicos.visualizar` | — | READY (segmento) |
| Financeiro | `/{t}/financeiro` | Caixa / DRE | `lib/finance`, `lib/financeiro` | contas, fluxo, budget | finance actions | `financeiro.*` | — | PARTIAL |
| Integrações | `/{t}/integracoes` | Hub | `lib/integracoes` | — | mocks | `integracoes.*` | — | PLACEHOLDER |
| Automações | `/{t}/automacoes` | Workflows | `lib/automacoes`, `lib/workflow` | workflow / approval | actions | `automacoes.*` | — | PARTIAL |
| Analytics | `/{t}/analytics/*` | BI | `lib/analytics` | derivadas | `getExecutiveAnalyticsDashboard` | `analytics.*` | flag `ANALYTICS_ENABLED` | PARTIAL |
| Relatórios | `/{t}/analytics/relatorios` | Relatórios | analytics | derivadas | idem | `analytics.visualizar` | — | PARTIAL |
| Configurações | `/{t}/configuracoes` | Empresa / prefs | settings | `tenants` | — | membro | — | READY |
| Equipe | `/{t}/configuracoes/equipe` | Convites / RBAC | `lib/equipe` | `tenant_members`, invitations, teams | `lib/equipe/actions.ts` (owner/admin) | owner/admin | e-mail **não enviado** | PARTIAL |
| Assinatura | `/{t}/configuracoes/assinatura` | Billing | `lib/billing` | `billing_*` | `lib/billing/actions.ts` | owner/admin | Asaas sandbox | READY (frozen) |
| Design system | `/{t}/design-system` | Showcase interno | design-system | — | — | owner/admin | — | DEAD/UNUSED (interno) |
| Inspeção pública | `/inspecao/[token]` | Token OS | `lib/ordens` | inspeção | `/api/inspecao/[token]` | pública | Storage | READY |
| Manutenção | `/manutencao` | Flag | platform | — | — | pública | — | READY |
| Health | `/api/health` `/api/status` | Ops | observability | — | — | pública | — | READY |
| Billing webhook | `/api/billing/webhook` | Asaas | billing | `billing_provider_events` | token | interno | Asaas | READY (sandbox) |
| Mobile API | `/api/mobile/v1/*` | App | `lib/mobile` | várias | Bearer Supabase | autenticado | — | PARTIAL (fora do escopo web) |
| Import API | `/api/v1/import` | Stub | import-engine | — | Bearer `IMPORT_API_KEY` | flag | — | PLACEHOLDER |

Classificação não foi feita só por existir página: CRM/clientes têm CRUD; Integrações têm `WEBHOOK_MOCKS`; Analytics rotas finas reusam o mesmo dashboard executivo (`app/(app)/[tenant]/analytics/clientes/page.tsx` → `AnalyticsExecutivoPageInner`).

---

## 3. Mapa de rotas

**PUBLIC:** `/`, `/login`, `/register`, `/inspecao/*`, `/manutencao`, `/api/health`, `/api/status` (`lib/constants.ts`).

**AUTHENTICATED (não-tenant):** `/onboarding`, `/empresas/nova`. `/convite/[token]` **não** está em `PUBLIC_ROUTES` — middleware manda anônimo para `/login?redirectTo=…` (`lib/supabase/middleware.ts` L115–119).

**TENANT:** `/{slug}/*` via `isTenantRoute` + `getUserTenantSlugs` (sem filtro de `status`).

**ADMIN:** não há console platform separado. Owner/admin = papéis de tenant (`TENANT_ROLES`). Billing e equipe gated owner/admin.

**INTERNAL/API:** 65 `route.ts`. Middleware **não** exige sessão em `/api/*` (L115); cada rota autentica sozinha (mobile Bearer, billing token, import key, inspeção token).

Achados de rotas:

| Tipo | Evidência |
|---|---|
| Link morto | `components/auth/login-form.tsx` L145–150 `href="/login?recuperar=1"` — `login/page.tsx` ignora o query; não há `resetPasswordForEmail` no web (só `apps/mobile/app/(auth)/recover.tsx`) |
| Checkbox no-op | “Lembrar acesso” sem handler |
| Páginas duplicadas conceituais | `/crm` e `/clientes` (mesmo domínio de cliente) |
| Rotas analytics finas | `/analytics/clientes`, `/analytics/vendas`, `/analytics/estoque`, `/analytics/executivo` reusam o mesmo inner |
| Experimental / interno | `/{t}/design-system` |
| Mocks | `/{t}/integracoes` (`lib/integracoes/webhook-center.ts` “sem entrega real”) |
| Token público | `/inspecao/[token]`, `/convite/[token]` |
| Órfãs | não há 404 de nav principal; design-system não está no sidebar |

---

## 4. Jornada do cliente

| # | Etapa | Status | Fricção |
|---|---|---|---|
| 1 | Acesso inicial | GO | Landing + login |
| 2 | Cadastro/login | PARTIAL | Register/login funcionam; recuperar senha é NO-GO |
| 3 | Criação/entrada na empresa | PARTIAL | Onboarding cria tenant; convite depende de URL copiada |
| 4 | Onboarding | PARTIAL | Wizard existe; skip/retomada via `user_onboarding_progress`; usuário com tenant é redirecionado para fora de `/onboarding` |
| 5 | Configuração inicial | PARTIAL | Empresa/segmento ok; tenant vazio não guia o “primeiro dado” de ponta a ponta |
| 6 | Convite de equipe | NO-GO | `emailSent: false` em `lib/equipe/invitations-service.ts` L178 e L224 |
| 7 | Permissões | PARTIAL | UI owner/admin em equipe; mutações de negócio não usam `requirePermission` |
| 8 | Módulos principais | GO | OS, vendas, clientes, estoque, financeiro existem |
| 9 | Indicadores | PARTIAL | Dashboard real; analytics flag + rotas finas |
| 10 | Gestão operacional | GO | Centro de operações / OS |
| 11 | Relatórios | PARTIAL | Analytics/relatórios; exports pontuais (catálogo XLSX), não um centro de reports |
| 12 | Assinatura | PARTIAL | Catálogo + sandbox GO; cobrança real NO-GO |
| 13 | Suporte | PARTIAL | Docs internas; sem canal in-app real |
| 14 | Logout/retorno | GO | Sessão Supabase + cookie último tenant |

Pontos em que o cliente real fica perdido/bloqueado: senha esquecida; convite “enviado” sem e-mail; membro inativado ainda entra; member consegue excluir cadastros.

---

## 5. Onboarding

Evidências:

- `app/(app)/onboarding/page.tsx` — `requireAuth` + redirect se já tem empresa (`getPostLoginPath !== "/onboarding"`).
- Middleware L144–148: quem já tem tenant não permanece em `/onboarding`.
- `user_onboarding_progress` (migration `20260716_create_user_onboarding_progress.sql`) — retomada possível.
- Empresa adicional: `/empresas/nova` (middleware não redireciona).
- Tenant vazio: dashboard + `DashboardOnboardingLead` existem; não há bloqueio de uso até completar checklist.
- Convite não fecha o ciclo (sem e-mail).

Fricções para 1º cliente real: criar empresa sozinho funciona; trazer equipe não; fechar o browser e voltar funciona se a sessão e o progress persistirem; pular etapas é possível.

---

## 6. Multiempresa / tenant isolation

`requireTenant` (`lib/tenants.ts`) resolve membership por slug e redireciona se não houver vínculo. Queries de domínio em geral filtram `tenant_id`. RLS na maioria das tabelas de negócio usa `exists (tenant_members …)`.

**Isto não prova isolamento completo.**

### P0

1. **Self-join INSERT em `tenant_members`**  
   `supabase/schema.sql` L106–108 e `supabase/fix-tenant-members-policies.sql` L16–18:  
   `for insert with check (auth.uid() = user_id)` — **qualquer usuário autenticado pode inserir o próprio `user_id` em qualquer `tenant_id` conhecido**. Nenhuma migration posterior recria essa policy (30.2 só altera SELECT).  
   Impacto: Tenant A vaza para o usuário de B se o UUID vazar (URL interna, export, erro, suporte).  
   Repro: JWT do user + `insert into tenant_members (tenant_id, user_id, role) values ('<uuid-vitima>', auth.uid(), 'member')` via anon key.

2. **Membro `inactive` continua com acesso web**  
   UI inativa em `lib/equipe/members-service.ts` (`status` / `deactivated_at`).  
   `getUserTenants` (`lib/tenants.ts` L17–20) e `getUserTenantSlugs` (`lib/auth/redirect.ts` L11–14) **não filtram `status`**. RLS de negócio também não exige `status = 'active'`.  
   Impacto: “remover acesso” na UI não remove acesso real.

3. **RBAC Enterprise gravável por qualquer membro**  
   `supabase/migrations/20260807_enterprise_rls.sql` L435–467: `tenant_user_roles`, `tenant_user_permission_overrides`, `tenant_rbac_role_permissions` — `FOR ALL` se existir qualquer linha em `tenant_members`.  
   Domínios leem esse snapshot (`lib/crm/rbac-compat.ts`, finance, analytics, supply).  
   Impacto: member se promove no catálogo Enterprise.

### P1

- Tax actions aceitam `tenantId` cru sem `requireTenant` (`lib/tax/actions.ts`). Mitigado por RLS de `tax_rules` (membership), mas `tax_types` INSERT `with check (true)` (`20260817_tax_configuration_phase26_8.sql` L342–345).
- CRM signed URL usa service role se disponível (`cliente-documento-storage-service.ts` L158–160) após fetch com `tenant_id` — OK se o fetch for honesto; bucket **sem** policies em `storage.objects`.

### P2

- Import wizard em memória (`lib/import-engine/shared/wizard-session-store.ts`) — sessão some entre instâncias serverless; risco de cruzar se IDs colidirem (UUID, baixo).
- Rate limit in-memory em `/api/webhooks/import`.

---

## 7. Autenticação

| Tema | Status | Evidência |
|---|---|---|
| Login / register | GO | páginas + Supabase Auth |
| Logout | GO | sessão cookie |
| Refresh | GO | `updateSession` no proxy |
| Sessão expirada | GO | redirect `/login?redirectTo=` |
| Recuperação web | NO-GO | link morto; recover só no mobile |
| Sem tenant | GO | `/onboarding` |
| Removido (delete membership) | GO se a linha sumir | RLS + requireTenant |
| Desativado (`inactive`) | NO-GO | ver P0-2 |
| URL direta tenant | GO (slug) / NO-GO (inactive) | middleware L151–167 |
| APIs | PARTIAL | `/api` não gated no proxy; rotas individuais autenticam |
| Server actions | PARTIAL | a maioria chama `requireTenant`; tax não; RBAC fino raro |

---

## 8. RBAC / permissões

Papéis reais em `lib/constants.ts`: `owner | admin | manager | member`.

Há **dois sistemas**:

1. **Legado (autoridade de fato na maior parte das mutações):** `tenant_members.role` + `requireTenant`.
2. **Enterprise catalog:** `lib/rbac/*` + tabelas `tenant_user_roles` — usado em nav metadata e `rbac-compat` de alguns módulos. `requirePermission` quase só em `lib/rbac/executive-access.ts`.

Enforcement server-side observado:

| Ação | UI | Backend |
|---|---|---|
| Convidar / inativar / role equipe | owner/admin | `assertEquipeAdmin` em `lib/equipe/actions.ts` — **alinhado** |
| Billing | owner/admin | `lib/billing/auth.ts` — **alinhado** |
| Excluir cliente | botão visível a membro | `deleteClienteAction` só `requireTenant` (`lib/clientes/actions.ts` L94–101) |
| Excluir venda | idem | `lib/vendas/actions.ts` (mesmo padrão) |
| Import create | — | `ROLES_ALLOWED_TO_CREATE` owner/admin/manager |
| Design system | owner/admin | page guard |

Divergência UI vs backend: **nav esconde** por permissão; **mutações CRUD clássicas não revalidam o catálogo**. Member efetivo = CRUD completo no tenant.

---

## 9. Banco de dados

Migrations em `supabase/migrations/` (fases 14–33.7). `schema.sql` é bootstrap legado, não o estado final.

Domínios: tenants/members, clientes/CRM, vendas, OS/oficina, estoque/NF-e, financeiro, tax, billing, equipe/teams/invites, onboarding progress, analytics/intelligence, workflow/approval.

Riscos (sem executar SQL):

- Policy INSERT de `tenant_members` nunca endurecida nas migrations versionadas.
- `tax_types` INSERT aberto a `authenticated`.
- JSONB (`cliente_tarefas.checklist`, regras tax) sem validação DB além de app.
- Dualidade `lib/financeiro` vs `lib/finance`.
- Índices: presentes nos módulos novos; não auditado table-by-table em produção (confirmação humana).

**Não executar migrations.**

---

## 10. RLS

Padrão saudável: `enable row level security` + membership `exists`. Storage NF-e e inspeção têm policies em `storage.objects`. Billing tem RLS.

Falhas:

| Tabela / objeto | Problema | Sev |
|---|---|---|
| `tenant_members` INSERT | só `auth.uid() = user_id` | P0 |
| `tenant_members` SELECT 30.2 | self or admin; **não** filtra inactive no USING das tabelas filhas | P0 (efeito) |
| `tenant_user_roles` etc. | FOR ALL qualquer membro | P0 |
| `tax_types` | INSERT `with check (true)` | P2 |
| `cliente-documentos` bucket | criado private; **zero** policy `storage.objects` na migration `20260727_crm_documentos.sql` | P1 |
| Service role | signed URL CRM; admin client | P1 se mal usado |

Qualquer vazamento cross-tenant via INSERT membership = P0.

---

## 11. Dashboard

`app/(app)/[tenant]/dashboard/page.tsx`: `dynamic = 'force-dynamic'`, `requireTenant`, filtros de período/centro/categoria/conta, `DashboardStreamingView`, `DashboardOnboardingLead`.

Números vêm de `lib/dashboard/*` (não hardcoded na page). Empty/loading via Suspense + onboarding lead. Erro: `app/(app)/[tenant]/error.tsx`.

Riscos: consistência entre “resumo do mês” e fluxo de caixa depende dos services; analytics separado pode divergir; sem evidência de cache stale (force-dynamic ajuda).

Status: **GO com ressalvas** (tenant vazio, member vê tudo).

---

## 12. Módulos de gestão (resumo)

| Módulo | Problema que resolve | Funcional? | CRUD | Validação | Authz | Tenant | Empty | Loading/Erro | Histórico | Delete seguro | Cliente entenderia? |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Clientes | Cadastro | sim | sim | zod | membership only | sim | sim | sim | parcial | soft delete; qualquer membro | sim |
| Vendas | Pedidos | sim | sim | sim | membership only | sim | sim | sim | sim | qualquer membro | sim |
| OS | Oficina | sim | sim | sim | membership | sim | sim | sim | sim | fluxo próprio | sim |
| Estoque | Saldos | sim | sim | sim | membership | sim | sim | sim | movimentações | — | sim |
| Financeiro | Caixa | sim | parcial | sim | membership + alguns guards | sim | sim | sim | sim | — | médio |
| CRM | Relacionamento | sim | sim | sim | membership + rbac-compat | sim | sim | sim | timeline | docs soft | médio (sobreposição) |
| Equipe | Pessoas | sim | sim | sim | owner/admin | sim | sim | sim | audit | inativar ≠ revogar | sim, mas convite quebra |
| Tributário | Regras fiscais | parcial | sim | sim | RLS; actions sem requireTenant | sim | sim | sim | versions | soft | avançado |
| Integrações | Conectar ERP | não | mock | — | nav | — | mock data | — | não | n/a | não — dados fake |
| Automações | Aprovações | parcial | sim | sim | parcial | sim | sim | sim | runtime | — | médio |
| Analytics | BI | parcial | read | — | flag + rbac-compat | sim | empty copy | sim | não | n/a | médio |
| Inteligência | Copiloto | parcial | read | — | perms | sim | sim | sim | historico | n/a | médio |
| Billing | Assinatura | sandbox | checkout | server catalog | owner/admin | sim | sim | sim | events | n/a | sim no sandbox |

---

## 13. Relatórios / exports

- Analytics / relatórios: dashboard executivo, não PDF fiscal.
- Catálogo: `lib/catalog-import/catalog-export.ts` XLSX/CSV (incl. arquivo de amostra `data/catalogs/servicos-zona-sul-sp.xlsx`).
- Import engine: CSV/XLSX **in**, não report out.
- Inspeção: PDF mime em anexos.
- Sem centro único de “exportar tudo”. Encoding/volume não load-testados aqui.

Status: **PARTIAL**. Autorização = membership. Tenant nas queries de analytics via slug.

---

## 14. Arquivos / documentos

| Bucket | Path | RLS storage | App authz | Notas |
|---|---|---|---|---|
| `cliente-documentos` | `{tenantId}/clientes/{clienteId}/…` | **ausente** na migration | table RLS + signed URL (admin se disponível) | private, 10MB, jpeg/png/webp/pdf |
| NF-e entrada | policies `nfe_entrada_*` | sim | membership | `20260725_nfe_entrada_importacao.sql` |
| Inspeção OS | policies fotos OS | sim | token público + membership | `20260724_digital_vehicle_inspection.sql` |

Vazamento de documento CRM: **não classificado P0** porque bucket private sem policy costuma **negar** o anon/authenticated; o risco real é upload quebrado **ou** signed URL admin amplo. P1 para fechar policies + não usar service role sem path allow-list.

---

## 15. Notificações

`lib/notifications/adapters.ts`: in-app, inbox, email, push, webhook, SMS — **todos `simulated: true`**.  
Convites: `emailSent: false`.  
Integrações: `delivered_mock` / `dlq_mock`.

| Canal | Status |
|---|---|
| in-app | MOCK |
| e-mail | MOCK / NOT_IMPLEMENTED (convite) |
| push | MOCK |
| SMS | PLACEHOLDER |
| webhook produto | MOCK |

---

## 16. UX de estados

Positivo: `app/error.tsx`, `app/(auth)/error.tsx`, `app/(app)/[tenant]/error.tsx`, loadings em auth, dashboard Suspense, onboarding empty.

Lacunas: Analytics desabilitado = texto cru (`_shared.tsx` L21–26); recuperar senha sem feedback; convite “enviado” sem e-mail; remember-me inerte; Integrações mostram eventos mock como se fossem reais.

---

## 17. Responsividade

Não redesenhado. Mapa estrutural:

- Sidebar: padrão app shell (desktop-first).
- Tabelas financeiras/estoque: overflow, não auditado em mobile real.
- Dialogs/forms: shadcn; risco de corte em viewport pequeno.
- Dashboard/gráficos: streaming; stacked em sm (`p-4 sm:p-6`).
- Onboarding: wizard com shell próprio.

Status: **PARTIAL** (uso interno desktop viável; tablet/mobile web não certificados nesta auditoria).

---

## 18. Acessibilidade

Evidências pontuais positivas: `aria-invalid` / `aria-describedby` no login; `role="alert"` no analytics error.

Problemas evidentes: checkbox remember sem associação forte; `dangerouslySetInnerHTML` em `components/crm/crm-rich-editor.tsx`; headings/contraste não medidos; dialogs/foco não auditados E2E.

Severidade: P3 na maioria; rich HTML = P2 XSS se sanitização falhar.

---

## 19. Performance

Não otimizado. Sinais:

- `force-dynamic` no dashboard (fresco, sem cache).
- Import sessions e rate limits in-memory (não escala).
- Analytics rotas duplicadas puxam o mesmo compose.
- Bundles: `xlsx` no catálogo/import.
- Paginação: não verificada em todas as listagens (risco de tabela sem limite).
- N+1: padrão clássico em composes (CRM/OS) — P2.

---

## 20. Segurança

| Tema | Nota |
|---|---|
| Secrets NEXT_PUBLIC_ | URL + anon key + `NEXT_PUBLIC_FINANCE_SHOW_LEGACY` + `NEXT_PUBLIC_APP_URL`. **Nenhuma secret de billing/service_role com prefixo público no código.** `.env.example` avisa. |
| Auth | cookie SSR; proxy refresha sessão |
| Authz | ver P0/P1 |
| XSS | theme boot script em `app/layout.tsx` (estático); CRM HTML |
| Uploads | mime/size no CRM; storage policies incompletas |
| Redirects | `redirectTo` pós-login via `getPostLoginPath` (open-redirect deve ser path interno — não reauditado linha a linha) |
| Rate limit | import webhook in-memory |
| Webhook billing | isolado 33.10 (token; não reaberto) |
| Logs | `sanitizeContext` no logger |
| Git secrets | 33.10 scan PASS |

Nenhum secret real impresso nesta auditoria.

---

## 21. Dados fake / mock / demo

Uso **perigoso em produto** (não teste):

| Local | Sinal |
|---|---|
| `lib/notifications/adapters.ts` | simulated |
| `lib/integracoes/webhook-center.ts` | `WEBHOOK_MOCKS` |
| `lib/integracoes/compose-hub.ts` | `dlq_mock` |
| `lib/equipe/invitations-service.ts` | `emailSent: false` |
| `lib/tax/actions.ts` `bootstrapTaxDemoRefsAction` | demo regime |
| `lib/master-data/master-data-mappers.ts` | placeholders futuros |
| `lib/analytics/core/metric-types.ts` | kind `"mock"` (tipo) |
| `data/catalogs/servicos-zona-sul-sp.xlsx` | catálogo amostra (import) |

Uso **legítimo de teste:** `scripts/*-tests.mjs`, evidências `docs/testing/evidence/*`.

Placeholders de **UI** (input `placeholder=`) são inofensivos.

---

## 22. Código morto (inventário — não apagar)

- `/{tenant}/design-system` (showcase).
- Rotas analytics finas ( wrappers).
- Catálogo RBAC Enterprise vs mutações legado.
- Adapters de notificação simulados.
- Webhook center mock.
- `apps/mobile` recover (web não usa) — mobile fora de alteração.
- `remember` checkbox.
- Query `recuperar=1`.

---

## 23. Tratamento de erros

Error boundaries nas três camadas app/auth/tenant. Server actions usam `toActionError` em clientes. Logger estruturado. Tax actions devolvem `{ ready: false, message }` sem throw.

Riscos: erros silenciosos em schema cache CRM (`listByCliente` retorna `[]` se tabela não existe — mascara migration não aplicada). Integrações mock nunca falham de verdade.

---

## 24. Observabilidade

Existe: `lib/observability/logger.ts` (níveis, sanitize), `x-request-id` no middleware, `/api/health`, `/api/status`, eventos billing 33.10, `emitImportEvent`.

Não existe evidência no repo de: Sentry/Datadog ligado, métricas de produto, retenção de audit queryable para suporte L1, correlação end-user.

**Investigar incidente de cliente real amanhã:** parcialmente (logs Vercel + health + tabelas billing). Sem e-mail/notificação, sem APM. **PARTIAL.**

---

## 25. Operação / suporte

Docs fortes em `docs/` (pilot, billing, architecture, evidence). Runbook de recovery: `docs/pilot/PRODUCTION_RECOVERY.md` (depende do plano Supabase; **não há job de backup no repo**).

Se o cliente tiver problema amanhã: Renato consegue diagnosticar **com acesso ao repo + Vercel + Supabase**, não há portal de suporte nem trilha in-app. **PARTIAL.**

---

## 26. Backup / recuperação

Só o que está no projeto:

- Dependências: Supabase (Postgres + Auth + Storage), Vercel, Asaas (sandbox).
- `docs/pilot/PRODUCTION_RECOVERY.md`: PITR/daily backups = **confirmação humana no painel**.
- Storage/Auth seguem o plano.
- Sem backup off-site documentado no código.

Confirmar com humano: PITR ligado? retenção? quem restaura?

---

## 27. Billing (congelado)

Confirmado no código (`lib/billing/config.ts`, `lib/billing/external-blockers.ts`):

- Default `ASAAS_ENV` = sandbox.
- `BILLING_REAL_CHARGES_ENABLED` só ON se `=== "1"` (default OFF).
- `ASAAS_PRODUCTION_API_KEY_BLOCKER` = `blocked_externally`.
- Regras: não reusar key sandbox; não alterar Vercel até a key existir.

**Sprint 33.11 NÃO iniciada.**  
**ASAAS_PRODUCTION_API_KEY_BLOCKER** permanece.  
Status billing desta auditoria: **FROZEN SAFE**.

Envs de produção não foram lidas/alteradas aqui; o código é fail-closed. Confirmação humana: Vercel ainda com `ASAAS_ENV=sandbox` e `BILLING_REAL_CHARGES_ENABLED` ≠ `1`.

---

## 28. Qualidade do código

Ver tabela de gates no topo. Falhas de lint: **warnings only** (unused vars em scripts). Não corrigidas (regra da sprint).

---

## 29. Git / repositório

- Branch: `main` = `origin/main`.
- Working tree no início da conversa tinha leftovers de 33.7; no fechamento 34.1: modificações em evidências 31-11-15 / 33-3 e logs 33-1 untracked. **Nenhuma limpeza destrutiva.**
- Secrets: não commitados nesta sprint.
- Esta evidência: `docs/testing/evidence/34-1/REPORT.md`.

---

## 30. Matriz de prontidão

| Área | Status | Sev | Evidência | Ação recomendada |
|---|---|---|---|---|
| Arquitetura | PARTIAL | P2 | App Router + proxy + módulos densos | Não fatiar agora; documentar dual finance/RBAC |
| Auth | PARTIAL | P1 | Sem recover web; inactive ignora | 34.3 recover + filtro status |
| Onboarding | PARTIAL | P1 | Wizard ok; convite quebra | 34.4 e-mail convite |
| Multiempresa | NO-GO | P0 | INSERT membership | 34.2 policy + teste A/B |
| RBAC | PARTIAL | P1 | Equipe ok; CRUD não | 34.3 requireRole nas mutações |
| Banco | PARTIAL | P2 | Schema rico; policies legadas | Revisar INSERT sem migrate amplo |
| RLS | NO-GO | P0 | 3 policies críticas | 34.2 |
| Dashboard | GO | P2 | Services reais | Empty states 1º uso |
| Módulos principais | PARTIAL | P1 | Core GO; integrações mock | Esconder integrações mock |
| Relatórios | PARTIAL | P2 | Analytics wrappers | Definir 3 reports piloto |
| Arquivos | PARTIAL | P1 | CRM storage sem policy | 34.5 |
| Notificações | NO-GO | P1 | adapters simulated | 34.4 e-mail transacional |
| UX | PARTIAL | P2 | Error boundaries ok | Journey vazia |
| Responsividade | PARTIAL | P2 | Desktop-first | Pass mobile nas 8 telas piloto |
| Acessibilidade | PARTIAL | P3 | Gaps | Labels/foco |
| Performance | PARTIAL | P2 | in-memory + xlsx | Não otimizar ainda |
| Segurança | NO-GO | P0 | isolation + RBAC write | 34.2 |
| Observabilidade | PARTIAL | P2 | logger + health | Sentry mínimo |
| Suporte | PARTIAL | P2 | docs, sem canal | Página “falar com Renato” |
| Billing | FROZEN SAFE | — | 33.10 + blocker | Esperar API key; **não 33.11** |
| Deploy | GO | P3 | build PASS | — |
| Backup/Recovery | UNKNOWN | P1 | só doc + plano Supabase | Confirmar PITR no painel |

---

## 31. Achados classificados

### P0 (3)

1. `tenant_members` INSERT permissivo (self-join qualquer tenant).  
2. Membership `inactive` não revoga acesso (`getUserTenants` / RLS filhas).  
3. Tabelas Enterprise RBAC `FOR ALL` qualquer membro.

### P1 (9)

1. Convite sem e-mail (`emailSent: false`).  
2. Recuperar senha web inexistente (link morto).  
3. Member deleta clientes/vendas (`requireTenant` only).  
4. Dual RBAC: catálogo não enforced nas mutações core.  
5. Tax actions sem `requireTenant`; `tax_types` INSERT aberto.  
6. Bucket `cliente-documentos` sem storage RLS.  
7. Notificações 100% simuladas.  
8. Hub de integrações mock apresentado como produto.  
9. Backup/PITR não verificável no repo.

### P2 (~16)

Analytics wrappers; import session in-memory; rate limit in-memory; CRM HTML; sobreposição CRM/clientes; paginação incerta; N+1 composes; remember-me no-op; `/convite` fora de PUBLIC_ROUTES; demo tax bootstrap; catálogo XLSX amostra; a11y; responsive tables; observability sem APM; suporte sem canal; dashboard vs analytics divergência possível.

### P3 (~12)

Lint unused; design-system interno; placeholders master-data; mobile recover órfão no web; copy/UX; performance cosmética.

---

## 32. TOP 10 riscos para cliente real

| # | Problema | Evidência | Impacto | Sev | Recomendação | Esforço |
|---|---|---|---|---|---|---|
| 1 | Auto-vínculo em qualquer tenant | `schema.sql` L106–108 | Vazamento A→B | P0 | Policy INSERT: só owner na criação via RPC SECURITY DEFINER; drop policy aberta | S |
| 2 | Inativar membro não corta acesso | `lib/tenants.ts` L17–20; members-service status | Ex-funcionário entra | P0 | Filtrar `status='active'` em getUserTenants, middleware, RLS | S |
| 3 | Member altera papéis Enterprise | `20260807_enterprise_rls.sql` L435–467 | Escalada in-tenant | P0 | FOR ALL só `is_tenant_admin` | S |
| 4 | Convite não envia e-mail | `invitations-service.ts` L178 | Equipe não entra | P1 | Resend/SMTP ou copy-link explícito + não dizer “enviado” | M |
| 5 | Sem recuperar senha no web | `login-form.tsx` L145–150 | Cliente bloqueado | P1 | `resetPasswordForEmail` + página `/recuperar` | S |
| 6 | Member exclui dados core | `deleteClienteAction` / vendas | Perda operacional | P1 | `requireRole` owner/admin (ou manager) no delete | XS |
| 7 | CRUD sem `requirePermission` | grep `requirePermission` só rbac/executive | UI mentirosa | P1 | Guard nas actions sensíveis | M |
| 8 | Storage CRM sem policy | `20260727_crm_documentos.sql` | Upload falha ou futuro leak | P1 | Policies path `{tenant_id}/…` | S |
| 9 | Cobrança real bloqueada | `ASAAS_PRODUCTION_API_KEY_BLOCKER` | Não dá para cobrar | P1* | Esperar key; **não 33.11** | — (externo) |
| 10 | Notificações/integrações fake | adapters + WEBHOOK_MOCKS | Cliente acha que o sistema avisou/integrou | P1 | Esconder ou banner “não envia” | XS |

\*Billing não é falha de código; é blocker externo. Incluído porque impede cliente **pago**.

---

## 33. Quick wins (NÃO implementar agora)

1. Filtrar `status = 'active'` em `getUserTenants` e `getUserTenantSlugs`.  
2. Remover ou implementar o link “Recuperar senha”.  
3. Remover checkbox “Lembrar acesso” ou ligar persistência.  
4. `requireRole` em delete cliente/venda.  
5. Banner em Integrações: “demonstração, sem entrega”.  
6. Copy do convite: “e-mail não enviado — copie o link”.  
7. Esconder `/design-system` se não for piloto.  
8. Não mostrar `emailSent` como sucesso.

Alto impacto + baixo risco + baixo esforço. **Não feitos nesta sprint.**

---

## 34. Decisão de prontidão (técnica)

O produto **não** está pronto para o primeiro cliente pago: isolamento tem P0 explorável com JWT+UUID, offboarding mente, convite e senha quebram a jornada, billing está congelado por design.

Está pronto para **piloto interno** (uma empresa, pessoas de confiança, sandbox).

Está **GO CONTROLADO** para **um** cliente beta se: um único owner, sem equipe externa, sem cobrança, aceite explícito de riscos P0 (tenant UUID não compartilhado), Renato no suporte, PITR confirmado.

---

## 35. Próximas sprints (só com base nos achados)

| Sprint | Foco |
|---|---|
| **34.2** | P0 isolamento: policy INSERT membership, filtro `active`, RLS Enterprise admin-only, teste Tenant A/B |
| **34.3** | P1 RBAC mutações (delete/update) + tax `requireTenant` + storage CRM policies |
| **34.4** | Jornada: recuperar senha + convite (e-mail real ou fluxo copy-link honesto) |
| **34.5** | UX 1º uso: empty states, esconder mocks, remember-me, convite público |
| **34.6** | Observabilidade mínima (Sentry ou equivalente) + confirmar backup/PITR |
| **34.7** | Relatórios piloto + files hardening |
| **33.11** | **Somente após** API Key Production Asaas existir — fora desta sequência até o blocker cair |

Não prefixar quantidade mágica; parar quando P0=0 e jornada beta fechar.

---

## 36. Relatório mandatório (caixa)

Ver mensagem de fechamento da sprint no chat. Resumo:

- SPRINT 34.1: **GO** (auditoria concluída)  
- PRONTO PILOTO INTERNO: **GO**  
- PRONTO CLIENTE BETA: **GO CONTROLADO**  
- PRONTO CLIENTE PAGO: **NO-GO**  
- PRONTO ESCALA: **NO-GO**  
- P0: 3 · P1: 9 · P2: ~16 · P3: ~12  
- BILLING: **FROZEN SAFE**  
- MIGRAÇÕES / VERCEL / ASAAS: **NENHUMA alteração**
