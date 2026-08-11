# Portal Web — Onboarding operacional do 1º cliente piloto

**Sprint:** 33.1
**Escopo:** procedimento seguro sem intervenção perigosa no banco.

## Pré-requisitos (antes de dados reais)

1. Production: `https://gestao-no-foco.vercel.app`
2. Snapshot/backup documentado: `docs/pilot/PRODUCTION_RECOVERY.md`
3. Migration RLS financeiro aplicada no SQL Editor: `supabase/migrations/20260822_phase33_1_finance_rls_write.sql`
   (guia: `docs/architecture/PHASE_33_1_FINANCE_RLS.md`)
4. Env production: `NEXT_PUBLIC_SUPABASE_*`, `SUPABASE_SERVICE_ROLE_KEY` **somente servidor**, `APP_URL` / `NEXT_PUBLIC_APP_URL`
5. Opcional e-mail: `RESEND_API_KEY` ou SMTP — senão usar link de convite copiável
6. Smoke production com **dados de teste** PASS (login, dashboard, CRM, OS, estoque, financeiro OWNER write, member não escreve)

## Fluxo (produto)

1. **Criar OWNER** — `/register` (e-mail + senha)
2. **Criar empresa** — `/onboarding`
3. **Primeiro login** → `/{slug}/dashboard`
4. **Wizard opcional** — `/{slug}/primeiro-acesso`
5. **Validar Dashboard** — KPIs reais (vazio ≠ erro)
6. **Convidar equipe** — `/{slug}/configuracoes/equipe`
   - `admin` / `manager` podem escrever financeiro (RLS)
   - `member` = leitura financeira (após migration 33.1)
7. **Aceitar convite** — `/convite/[token]`

## Checklist pós-criação

- [ ] Login OK
- [ ] Slug correto na URL
- [ ] Dashboard carrega
- [ ] Sidebar mostra só módulos permitidos
- [ ] CRM / Operação / Estoque / Financeiro OK para OWNER
- [ ] `member` não cria título financeiro
- [ ] Logout → `/login` sem loop

## O que NÃO fazer

- Não inserir tenant/membership só via SQL sem auditoria
- Não usar `SUPABASE_SERVICE_ROLE_KEY` no browser
- Não apresentar Hub de Integrações / Relatórios stub como “prontos”
- Não ativar `ALLOW_IMPORT_MEMORY` em production
