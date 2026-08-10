# Portal Web — Onboarding operacional do 1º cliente piloto

**Sprint:** 33.0  
**Escopo:** procedimento seguro sem intervenção perigosa no banco.  
**Restrição:** até corrigir RLS financeiro (P1 restante), o piloto deve operar com **OWNER (e no máximo ADMIN)** — não convidar `member` operacional sem permissões financeiras restritas.

## Pré-requisitos

1. Production: `https://gestao-no-foco.vercel.app`
2. Supabase production com migrations aplicadas
3. Env production: `NEXT_PUBLIC_SUPABASE_*`, `SUPABASE_SERVICE_ROLE_KEY` (servidor), `APP_URL` / `NEXT_PUBLIC_APP_URL`
4. Opcional e-mail: `RESEND_API_KEY` ou SMTP — senão usar link de convite copiável

## Fluxo (produto)

1. **Criar OWNER** — `/register` (e-mail + senha)
2. **Criar empresa** — `/onboarding` → `lib/onboarding/create-tenant.ts` (tenant + membership `owner`)
3. **Primeiro login** → redireciona `/{slug}/dashboard`
4. **Wizard opcional** — `/{slug}/primeiro-acesso`
5. **Validar Dashboard** — KPIs reais do tenant (vazio ≠ erro)
6. **Convidar equipe** — `/{slug}/configuracoes/equipe` (preferir `admin`/`manager`; evitar `member` até RLS write financeiro restringido)
7. **Aceitar convite** — `/convite/[token]`

## Checklist pós-criação

- [ ] Login OK
- [ ] Slug correto na URL
- [ ] Dashboard carrega (empty state se sem dados)
- [ ] CRM / Operação / Estoque / Financeiro abrem sem 403 indevido para OWNER
- [ ] Trocar de tenant (se multi) não vaza dados
- [ ] Logout → `/login` sem loop

## O que NÃO fazer

- Não inserir tenant/membership só via SQL sem auditoria
- Não usar `SUPABASE_SERVICE_ROLE_KEY` no browser
- Não apresentar Hub de Integrações / Relatórios stub como “prontos”
- Não ativar flags de demo/import memory em production
