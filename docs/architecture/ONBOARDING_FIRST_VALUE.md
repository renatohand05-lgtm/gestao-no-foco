# Onboarding & First Value (Sprint 13.12)

Experiência de primeiro acesso do Gestão no Foco: orientar, configurar o essencial e chegar a um **primeiro resultado útil** sem redesenhar o Dashboard Executivo.

## Escopo e restrições

- **Não altera** Design Freeze do Dashboard (Hero, Score, KPI Grid, BI, EI, Prediction, Timeline, Copilot, Action Center/Plan).
- **Não altera** cálculos, métricas, DRE, Fluxo de Caixa, Layout Engine, drag & drop, persistência de workspace.
- Checklist concluído **somente com dados reais** (contagens no tenant).
- Sem dados fictícios. Sem módulos financeiros incompletos nesta sprint.

## Auditoria do fluxo anterior (resumo)

| Etapa | Antes | Risco |
| --- | --- | --- |
| Cadastro / login | Auth + redirect | OK |
| `/onboarding` | Formulário único (nome + segmento) | Pouco contexto de valor |
| Pós-criação | Redirect direto ao Dashboard | Dashboard vazio sem orientação |
| Checklist legado | `buildImplementationChecklist` (inteligência) | Computado, sem progresso persistido de UI |
| Empty states | Existiam | Pouco “por quê / impacto no Dashboard” |

Pontos de abandono típicos: surpresa com Dashboard vazio; excesso de cadastros sem sequência; ausência de “próximo passo”.

## Fluxo atual

1. Usuário autenticado sem tenant → `/onboarding` (cria empresa + segmento).
2. Redirect → `/{slug}/primeiro-acesso` (wizard + checklist + tour curto).
3. Pode **continuar depois** e abrir o Dashboard a qualquer momento.
4. Dashboard mostra **banner soft** (`OnboardingResumeCard`) se configuração incompleta — **acima** do Layout Manager, sem tocar Hero/KPIs.
5. Retomada: progresso UI em `user_onboarding_progress`; checklist revalidado por dados.

## Etapas do wizard

| ID | Obrigatória | Data-backed |
| --- | --- | --- |
| `welcome` | Sim | Não |
| `company` | Sim | Sim (`empresa`) |
| `segment` | Sim | Sim (`segmento`) |
| `bank_account` | Não | Sim |
| `monthly_goal` | Não | Sim |
| `first_client` | Não | Sim |
| `first_product` | Não | Sim |
| `first_sale` | Não | Sim |
| `review` | Sim | Checklist |
| `dashboard` | Sim | Acesso |

Pular etapas opcionais é permitido. Voltar / salvar e sair / ir ao Dashboard estão disponíveis.

### Primeiro valor

Dashboard considerado **ativado** (`dashboardReady`) quando:

- empresa + segmento presentes, **e**
- pelo menos **uma meta** **ou** **uma venda** real.

Mensagem típica: “Falta pouco para ativar seu Dashboard…”.

## Checklist

Itens: empresa, segmento, conta bancária, meta, cliente, produto, venda, dashboard.

Cada item: status (só com count/validação real), descrição, benefício, CTA, essencial/opcional.

Motor: `lib/onboarding/onboarding-checklist.ts`.

## Progresso (UI)

Persistência: etapa atual, skipped, tour dismissed, checklist dismissed, completed_at, version, preferred_preset_key.

**Não** grava “checklist concluído” sem validação — a conclusão dos itens vem dos counts.

Motores puros: `onboarding-engine.ts`.

## Segmentos e personas

- **Segmentos de negócio** (tenant): `oficina`, `restaurante`, `comercio`, `consultoria`, `servicos`, `outro` → textos via `segmentCopy`.
- **Personas / presets** (indicativos de layout, sem alterar Layout Engine): CEO, Financeiro, Comercial, Operacional, RH, Oficina, Restaurante, Consultoria → `personaCopy` + `suggestedPresetForSegment`.

Só textos, exemplos, foco sugerido e preset **indicado**.

## Primeira sessão

- Tour ≤ 5 passos, dispensável (`OnboardingTour`).
- Checklist + progresso + retomada no banner do Dashboard.
- Rota dedicada: `app/(app)/[tenant]/primeiro-acesso/page.tsx`.

## Empty states

`EmptyState` aceita `impact`. Copy atualizada em vendas, clientes, produtos, metas, contas bancárias e centros de custo.

## Persistência (migration manual)

Arquivo: `supabase/migrations/20260716_create_user_onboarding_progress.sql`

Tabela: `user_onboarding_progress` (tenant × usuário), RLS (membro do tenant + `user_id = auth.uid()`), soft-delete, `version`, timestamps.

### Instrução manual (Supabase SQL Editor)

1. Abrir o projeto no Supabase.
2. SQL Editor → colar o conteúdo do arquivo de migration.
3. Executar.
4. Confirmar table + policies no Table Editor.
5. Não é necessário regenerar tipos imediatamente: o código usa cast seguro e falha soft se a tabela ausente.

## Segurança

- Server actions: `requireAuth` + `requireTenant`.
- RLS isola por membership.
- Não confiar só no client para concluir etapas data-backed.

## Integração Dashboard

- Slot `lead` em `ExecutiveWorkspace` (fora do DnD/layout).
- `DashboardOnboardingLead` → banner dismissível.
- **Design Freeze preservado.**

## Arquitetura de pastas

```
lib/onboarding/
  onboarding-types.ts
  onboarding-steps.ts
  onboarding-engine.ts
  onboarding-checklist.ts
  onboarding-progress.ts
  onboarding-validation.ts
  onboarding-mappers.ts
  actions.ts
  create-tenant.ts
  index.ts

components/onboarding/
  onboarding-shell.tsx
  onboarding-progress.tsx / onboarding-progress-bar.tsx
  onboarding-step.tsx
  onboarding-checklist.tsx
  onboarding-empty-state.tsx
  onboarding-resume-card.tsx
  onboarding-tour.tsx
  onboarding-wizard.tsx
  dashboard-onboarding-lead.tsx
  onboarding-form.tsx
  index.ts
```

## Performance

- Sem polling; saves em ações explícitas.
- Banner com Suspense; não carrega o Dashboard dentro do wizard.
- Checklist: counts `head: true` em paralelo.

## Limitações

- Sem runner de testes automatizados no repositório (`npm test` inexistente).
- Centro de custo / categorias / “primeira conta a pagar” não entram no checklist mínimo (podem ser adicionados depois sem mudar motores).
- Progresso UI precisa da migration aplicada no ambiente remoto.

## Reset

`resetOnboardingAction(tenantSlug)` limpa etapa/skipped/flags de dismiss (checklist continua baseado em dados).
